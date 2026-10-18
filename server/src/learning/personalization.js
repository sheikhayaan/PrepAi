/**
 * Loop D: personalisation and readiness-weight recalibration.
 *
 * Readiness weights start at the product default (50/30/20) and can only be
 * replaced by a human-promoted version whose weights were derived from
 * human-reviewed sessions. Each weight is bounded so no single dimension can
 * dominate the composite.
 */
const CalibrationFeedback = require('../models/CalibrationFeedback');
const InterviewSession = require('../models/InterviewSession');
const config = require('../config/env');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');
const stats = require('./statistics');
const versionRegistry = require('./versionRegistry');

const DEFAULT_WEIGHTS = Object.freeze({ technical: 0.5, delivery: 0.3, consistency: 0.2 });
const MIN_WEIGHT = 0.1;
const MAX_WEIGHT = 0.6;

function normalizeWeights(raw) {
  const entries = Object.entries(raw || {}).filter(
    ([, value]) => Number.isFinite(Number(value)) && Number(value) > 0
  );
  if (entries.length === 0) return { ...DEFAULT_WEIGHTS };
  if (entries.length === 1) return { [entries[0][0]]: 1 };

  const keys = entries.map(([key]) => key);
  const initialTotal = entries.reduce((sum, [, value]) => sum + Number(value), 0);
  let weights = entries.map(([, value]) => Number(value) / initialTotal);

  // Project onto the bounded simplex: clamp, then move the residual onto the
  // dimensions that still have room. Converges in a handful of iterations for
  // the small number of readiness dimensions.
  for (let iteration = 0; iteration < 50; iteration++) {
    weights = weights.map((value) => Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, value)));
    const total = weights.reduce((sum, value) => sum + value, 0);
    if (Math.abs(total - 1) < 1e-9) break;

    const delta = 1 - total;
    const adjustable = [];
    weights.forEach((value, index) => {
      if (delta > 0 && value < MAX_WEIGHT - 1e-9) adjustable.push(index);
      if (delta < 0 && value > MIN_WEIGHT + 1e-9) adjustable.push(index);
    });
    if (adjustable.length === 0) break;

    const capacities = adjustable.map((index) =>
      delta > 0 ? MAX_WEIGHT - weights[index] : weights[index] - MIN_WEIGHT
    );
    const capacitySum = capacities.reduce((sum, value) => sum + value, 0);
    if (capacitySum <= 0) break;

    adjustable.forEach((index, i) => {
      weights[index] += delta * (capacities[i] / capacitySum);
    });
  }

  return Object.fromEntries(keys.map((key, index) => [key, Number(weights[index].toFixed(6))]));
}

async function getReadinessWeights() {
  const active = await versionRegistry.getActive(versionRegistry.KINDS.READINESS);
  const weights = normalizeWeights(active.payload);
  return { weights, version: active.version, source: active.source };
}

function readinessComposite({ technical = 0, delivery = 0, consistency = 0 }, weights = DEFAULT_WEIGHTS) {
  const w = normalizeWeights(weights);
  return Math.round(
    (w.technical || 0) * technical +
      (w.delivery || 0) * delivery +
      (w.consistency || 0) * consistency
  );
}

/**
 * Derive per-dimension weights from the correlation between AI dimension
 * scores and the human overall judgement. Weak/negative correlations get the
 * floor weight; everything is renormalised.
 */
async function recalibrateReadinessWeights({ sinceDays = 90 } = {}) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const feedback = await CalibrationFeedback.find({
    source: { $in: ['human_override', 'reviewer'] },
    createdAt: { $gte: since },
  })
    .limit(10000)
    .lean();

  if (feedback.length < config.learning.goldenSetMinSamples) {
    return {
      eligible: false,
      reason: 'insufficient_human_evidence',
      sampleSize: feedback.length,
      weights: { ...DEFAULT_WEIGHTS },
    };
  }

  const sessions = new Map();
  feedback.forEach((row) => {
    const key = String(row.sessionId);
    const entry = sessions.get(key) || { human: {}, ai: {} };
    entry.human[row.dimension] = row.humanScore;
    entry.ai[row.dimension] = row.aiScore;
    sessions.set(key, entry);
  });

  const dimensions = ['clarity', 'correctness', 'structure', 'edgeCases', 'communication', 'culture_fit'];
  const correlations = {};

  dimensions.forEach((dimension) => {
    const xs = [];
    const ys = [];
    sessions.forEach((entry) => {
      if (!Number.isFinite(entry.ai[dimension]) || !Number.isFinite(entry.human[dimension])) return;
      const humanOverall = stats.mean(Object.values(entry.human));
      xs.push(entry.ai[dimension]);
      ys.push(humanOverall);
    });
    const r = stats.pearson(xs, ys);
    if (Number.isFinite(r) && xs.length >= 10) correlations[dimension] = r;
  });

  const positive = Object.entries(correlations).filter(([, r]) => r > 0);
  const technical = stats.mean(
    ['correctness', 'structure', 'edgeCases']
      .map((d) => correlations[d])
      .filter(Number.isFinite)
  );
  const delivery = stats.mean(
    ['clarity', 'communication', 'culture_fit']
      .map((d) => correlations[d])
      .filter(Number.isFinite)
  );

  const raw = {
    technical: Number.isFinite(technical) ? Math.max(MIN_WEIGHT, technical) : DEFAULT_WEIGHTS.technical,
    delivery: Number.isFinite(delivery) ? Math.max(MIN_WEIGHT, delivery) : DEFAULT_WEIGHTS.delivery,
    // Consistency is a behavioural signal, not a rubric dimension; keep a
    // bounded prior so it cannot vanish entirely.
    consistency: DEFAULT_WEIGHTS.consistency,
  };

  return {
    eligible: positive.length >= 3,
    sampleSize: sessions.size,
    correlations,
    weights: normalizeWeights(raw),
  };
}

async function proposeReadinessWeights({ version, createdBy = null } = {}) {
  const result = await recalibrateReadinessWeights();
  if (!result.eligible) {
    return { ...result, artifact: null };
  }

  const versionLabel = version || `readiness-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36).slice(-4)}`;
  const artifact = await versionRegistry.propose({
    kind: versionRegistry.KINDS.READINESS,
    version: versionLabel,
    payload: result.weights,
    evaluationMetrics: {
      eligible: result.eligible,
      sampleSize: result.sampleSize,
      correlations: result.correlations,
      zScore: 0,
    },
    sampleSize: result.sampleSize,
    notes: 'Readiness weights derived from human-reviewed dimension correlations.',
    createdBy,
  });

  const shadowArtifact = await versionRegistry.setStatus({
    kind: versionRegistry.KINDS.READINESS,
    version: versionLabel,
    status: 'shadow',
    approvedBy: null,
  });

  return { ...result, artifact: shadowArtifact };
}

/**
 * Personalisation hints for the next question. The directive is appended to
 * the interviewer system prompt; it never changes the scoring rubric.
 */
async function getPersonalization({ type, ability = 1500, recentScores = [] } = {}) {
  const latest = recentScores.slice(-3);
  const recentMean = latest.length ? stats.mean(latest) : null;
  const trend =
    latest.length >= 2 ? Number((latest[latest.length - 1] - latest[0]).toFixed(2)) : 0;

  let hintStyle = 'balanced';
  if (recentMean !== null && recentMean < 5) hintStyle = 'scaffolded';
  else if ((recentMean !== null && recentMean >= 8) || ability >= 1650) hintStyle = 'adversarial';

  const probingDepth = hintStyle === 'scaffolded' ? 1 : hintStyle === 'adversarial' ? 3 : 2;

  const directive =
    hintStyle === 'scaffolded'
      ? 'The candidate is currently struggling. Offer one concrete structural hint, then ask a smaller follow-up that lets them demonstrate progress.'
      : hintStyle === 'adversarial'
        ? 'The candidate is performing strongly. Increase rigor: probe second-order trade-offs, failure modes and quantitative constraints.'
        : 'Maintain a balanced interview: one clarifying probe, then one depth question.';

  metrics.inc('prepai_personalization_total', { type, hintStyle });

  return {
    hintStyle,
    probingDepth,
    trend,
    recentMean: recentMean === null ? null : Number(recentMean.toFixed(2)),
    directive,
  };
}

module.exports = {
  DEFAULT_WEIGHTS,
  MIN_WEIGHT,
  MAX_WEIGHT,
  normalizeWeights,
  getReadinessWeights,
  readinessComposite,
  recalibrateReadinessWeights,
  proposeReadinessWeights,
  getPersonalization,
};
