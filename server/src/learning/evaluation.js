/**
 * Loop C: offline evaluation, shadow and canary promotion.
 *
 * A candidate version only ever becomes active through:
 *   proposed -> shadow (offline metrics) -> canary (human approved)
 *            -> active (human approved, gates satisfied)
 *
 * Metrics are computed against human-annotated sessions, never against the
 * model's own output (which would make every candidate look perfect).
 */
const CalibrationFeedback = require('../models/CalibrationFeedback');
const LearningArtifact = require('../models/LearningArtifact');
const InterviewSession = require('../models/InterviewSession');
const config = require('../config/env');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');
const stats = require('./statistics');
const versionRegistry = require('./versionRegistry');

const MAX_GOLDEN_SESSIONS = 500;

/**
 * Build an in-memory golden set from sessions with human feedback.
 * Returns anonymised items only (no emails, no user ids).
 */
async function buildGoldenSet({ type, minSamples = config.learning.goldenSetMinSamples } = {}) {
  const feedback = await CalibrationFeedback.find({
    type,
    source: { $in: ['human_override', 'reviewer'] },
  })
    .sort({ createdAt: -1 })
    .limit(MAX_GOLDEN_SESSIONS * 10)
    .lean();

  const bySession = new Map();
  feedback.forEach((row) => {
    const key = String(row.sessionId);
    const entry = bySession.get(key) || { human: {}, feedbackAt: row.createdAt };
    entry.human[row.dimension] = row.humanScore;
    bySession.set(key, entry);
  });

  const sessionIds = [...bySession.keys()].slice(0, MAX_GOLDEN_SESSIONS);
  if (sessionIds.length === 0) {
    return { type, items: [], sampleSize: 0, reason: 'no_human_feedback' };
  }

  const sessions = await InterviewSession.find({
    _id: { $in: sessionIds },
    status: 'completed',
    finalScore: { $ne: null },
  })
    .select('type finalScore turns rubricVersion promptVersion completedAt')
    .lean();

  const items = sessions
    .map((session) => {
      const human = bySession.get(String(session._id))?.human || {};
      const dimensionScores = {};
      Object.keys(human).forEach((dimension) => {
        const value = session.finalScore?.[dimension];
        if (Number.isFinite(Number(value))) dimensionScores[dimension] = Number(value);
      });
      return {
        sessionId: String(session._id),
        type: session.type,
        dimensionScores,
        humanScores: human,
        rubricVersion: session.rubricVersion || 'static-v1',
        promptVersion: session.promptVersion || 'static-v1',
      };
    })
    .filter((item) => Object.keys(item.dimensionScores).length > 0);

  return {
    type,
    items,
    sampleSize: items.length,
    eligibleForEvaluation: items.length >= minSamples,
  };
}

function scoreItem(item, offsets = {}) {
  const scored = {};
  Object.entries(item.dimensionScores).forEach(([dimension, value]) => {
    const offset = Number(offsets[dimension]) || 0;
    scored[dimension] = Math.min(10, Math.max(0, value + offset));
  });
  return scored;
}

function evaluateScored(items, offsets) {
  const pairs = [];
  const absErrors = [];
  items.forEach((item) => {
    const scored = scoreItem(item, offsets);
    Object.entries(scored).forEach(([dimension, value]) => {
      const human = Number(item.humanScores[dimension]);
      if (!Number.isFinite(human)) return;
      pairs.push([value, human]);
      absErrors.push(Math.abs(value - human));
    });
  });

  const kappa = stats.weightedKappa(pairs);
  const icc = stats.icc21(pairs);
  return {
    n: pairs.length,
    mae: Number(stats.mean(absErrors).toFixed(3)),
    kappa: Number.isFinite(kappa) ? Number(kappa.toFixed(3)) : null,
    icc: Number.isFinite(icc) ? Number(icc.toFixed(3)) : null,
  };
}

/**
 * Offline A/B evaluation of a candidate artifact against the active baseline.
 */
async function runOfflineEvaluation({ kind = versionRegistry.KINDS.RUBRIC, type, candidateVersion }) {
  const candidate = await versionRegistry.listVersions(kind, 100).then((rows) =>
    rows.find((row) => row.version === candidateVersion)
  );
  if (!candidate) throw new Error(`Candidate ${kind}:${candidateVersion} not found`);

  const baseline = await versionRegistry.getActive(kind);

  // Prompt/model candidates are compared on human agreement per prompt
  // version, never on the model's own scores.
  if (kind === versionRegistry.KINDS.PROMPT_EVAL) {
    const promptEval = await evaluatePromptVersions({ type });
    const pick = (promptVersion) =>
      promptEval.versions.find((row) => row.promptVersion === promptVersion) || {
        n: 0,
        mae: null,
        kappa: null,
        icc: null,
        eligible: false,
      };
    const candidateMetrics = pick(candidate.payload?.promptVersion);
    const baselineMetrics = pick(baseline.payload?.promptVersion);
    const improvement =
      baselineMetrics.mae !== null && candidateMetrics.mae !== null
        ? Number((baselineMetrics.mae - candidateMetrics.mae).toFixed(3))
        : null;

    const reasons = [];
    if (!candidateMetrics.eligible) reasons.push('insufficient_or_weak_human_agreement');
    if (improvement !== null && improvement < -0.05) reasons.push('mae_regression');

    const result = {
      kind,
      type,
      candidateVersion,
      baselineVersion: baseline.version,
      candidate: candidateMetrics,
      baseline: baselineMetrics,
      improvement,
      eligible: reasons.length === 0,
      reason: reasons.join(',') || null,
      evaluatedAt: new Date().toISOString(),
    };
    metrics.observe('prepai_learning_candidate_mae', { kind }, candidateMetrics.mae || 0);
    logger.info('Prompt candidate evaluation completed', result);
    return result;
  }

  const golden = await buildGoldenSet({ type });

  if (golden.sampleSize === 0) {
    return {
      kind,
      type,
      candidateVersion,
      baselineVersion: baseline.version,
      candidate: { n: 0, mae: null, kappa: null, icc: null },
      baseline: { n: 0, mae: null, kappa: null, icc: null },
      eligible: false,
      reason: 'no_human_feedback',
    };
  }

  const candidateOffsets = candidate.payload?.dimensionOffsets || {};
  const baselineOffsets = baseline.payload?.dimensionOffsets || {};

  const candidateMetrics = evaluateScored(golden.items, candidateOffsets);
  const baselineMetrics = evaluateScored(golden.items, baselineOffsets);

  const improvement =
    baselineMetrics.mae !== null && candidateMetrics.mae !== null
      ? Number((baselineMetrics.mae - candidateMetrics.mae).toFixed(3))
      : null;

  const reasons = [];
  if (candidateMetrics.n < config.learning.goldenSetMinSamples) {
    reasons.push(`insufficient_samples:${candidateMetrics.n}`);
  }
  if (improvement !== null && improvement < -0.05) {
    reasons.push('mae_regression');
  }
  if (candidateMetrics.kappa !== null && candidateMetrics.kappa < 0.35) {
    reasons.push('low_agreement');
  }

  const result = {
    kind,
    type,
    candidateVersion,
    baselineVersion: baseline.version,
    candidate: candidateMetrics,
    baseline: baselineMetrics,
    improvement,
    eligible: reasons.length === 0,
    reason: reasons.join(',') || null,
    evaluatedAt: new Date().toISOString(),
  };

  metrics.observe('prepai_learning_candidate_mae', { kind }, candidateMetrics.mae || 0);
  logger.info('Offline learning evaluation completed', result);
  return result;
}

/**
 * Run the offline evaluation, record metrics on the artifact and move it to
 * shadow. Shadow artifacts are never used for live scoring.
 */
async function runShadowEvaluation({ kind = versionRegistry.KINDS.RUBRIC, type, candidateVersion, approvedBy = null }) {
  const evaluation = await runOfflineEvaluation({ kind, type, candidateVersion });

  const artifact = await LearningArtifact.findOne({ kind, version: candidateVersion });
  if (!artifact) throw new Error(`Candidate ${kind}:${candidateVersion} not found`);

  // Store the evidence on the candidate itself so promotion can enforce gates.
  artifact.metrics = { ...(artifact.metrics || {}), ...evaluation };
  artifact.sampleSize = evaluation.candidate.n;
  await artifact.save();

  // proposed -> shadow is automatic (shadow never serves live traffic).
  if (artifact.status === 'proposed') {
    await versionRegistry.setStatus({
      kind,
      version: candidateVersion,
      status: 'shadow',
      approvedBy,
      reason: 'Offline shadow evaluation recorded',
    });
  }

  return evaluation;
}

/**
 * Start a canary only with explicit human approval.
 */
async function startCanary({ kind, version, approvedBy, reason = 'Canary rollout approved' }) {
  if (!approvedBy) throw new Error('Canary start requires an approving admin');
  return versionRegistry.setStatus({ kind, version, status: 'canary', approvedBy, reason });
}

/**
 * Promote a canary to active. Delegates to the registry so the same sample-size
 * and anomaly gates apply.
 */
async function promoteCandidate({ kind, version, approvedBy, reason = '' , force = false }) {
  if (!approvedBy) throw new Error('Promotion requires an approving admin');
  return versionRegistry.promote({ kind, version, approvedBy, reason, force });
}

/**
 * Compare human agreement across prompt versions for one interview track.
 * Observational only: this never promotes a version by itself.
 */
async function evaluatePromptVersions({ type }) {
  const golden = await buildGoldenSet({ type });
  const groups = new Map();
  golden.items.forEach((item) => {
    const version = item.promptVersion || 'static-v1';
    if (!groups.has(version)) groups.set(version, []);
    groups.get(version).push(item);
  });

  const versions = [...groups.entries()]
    .map(([promptVersion, items]) => {
      const scored = evaluateScored(items, {});
      return {
        promptVersion,
        ...scored,
        eligible:
          scored.n >= config.learning.goldenSetMinSamples &&
          (scored.kappa === null || scored.kappa >= 0.35) &&
          (scored.mae === null || scored.mae <= 1.25),
      };
    })
    .sort((a, b) => b.n - a.n || (a.mae ?? Infinity) - (b.mae ?? Infinity));

  return {
    type,
    sampleSize: golden.sampleSize,
    versions,
    best: versions[0] || null,
  };
}

/**
 * Register a prompt/model candidate for human review.
 * The artifact starts in shadow; promotion still requires canary + approval.
 */
async function proposePromptCandidate({ type, promptVersion, model = 'default', createdBy = null }) {
  if (!type || !promptVersion) throw new Error('type and promptVersion are required');

  const evaluation = await evaluatePromptVersions({ type });
  const candidate = evaluation.versions.find((row) => row.promptVersion === promptVersion) || null;
  const sampleSize = candidate?.n || 0;
  const eligible = Boolean(candidate?.eligible);
  const safeVersion = String(promptVersion).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 48);
  const version = `prompt-${type}-${safeVersion}-${Date.now().toString(36)}`;

  const artifact = await versionRegistry.propose({
    kind: versionRegistry.KINDS.PROMPT_EVAL,
    version,
    payload: { type, promptVersion, model },
    evaluationMetrics: {
      eligible,
      sampleSize,
      mae: candidate?.mae ?? null,
      kappa: candidate?.kappa ?? null,
      icc: candidate?.icc ?? null,
      versions: evaluation.versions,
      zScore: 0,
      reason: eligible ? null : 'insufficient_or_weak_human_agreement',
    },
    sampleSize,
    notes: `Prompt candidate ${promptVersion} (${model}) for ${type} registered for human review.`,
    createdBy,
  });

  const shadow = await versionRegistry.setStatus({
    kind: versionRegistry.KINDS.PROMPT_EVAL,
    version,
    status: 'shadow',
    approvedBy: null,
  });

  return { artifact: shadow, evaluation, candidate };
}

module.exports = {
  buildGoldenSet,
  scoreItem,
  evaluateScored,
  evaluatePromptVersions,
  proposePromptCandidate,
  runOfflineEvaluation,
  runShadowEvaluation,
  startCanary,
  promoteCandidate,
  MAX_GOLDEN_SESSIONS,
};
