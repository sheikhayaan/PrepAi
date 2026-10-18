/**
 * Loop B: rubric calibration anchored to human judgement.
 *
 * Inputs are explicitly human (reviewer overrides + post-session CSAT). AI-only
 * feedback is intentionally excluded, which is the guardrail that prevents
 * self-reinforcing score drift.
 */
const CalibrationFeedback = require('../models/CalibrationFeedback');
const InterviewSession = require('../models/InterviewSession');
const AuditLog = require('../models/AuditLog');
const { RUBRIC_CONFIG } = require('../services/anthropicClient');
const config = require('../config/env');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');
const stats = require('./statistics');
const versionRegistry = require('./versionRegistry');

function clampScore(value) {
  return Math.min(10, Math.max(0, Number(value) || 0));
}

/**
 * Aggregate human-vs-AI agreement for one interview type.
 */
async function computeTypeCalibration({ type, sinceDays = 30, limit = 5000 } = {}) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const rows = await CalibrationFeedback.find({
    type,
    source: { $in: ['human_override', 'reviewer', 'csat'] },
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const byDimension = new Map();
  rows.forEach((row) => {
    const bucket = byDimension.get(row.dimension) || [];
    bucket.push(row);
    byDimension.set(row.dimension, bucket);
  });

  const dimensions = {};
  let totalWeight = 0;
  let weightedOffset = 0;
  let weightedMae = 0;

  for (const [dimension, entries] of byDimension) {
    const pairs = entries.map((e) => [e.aiScore, e.humanScore]);
    const offsets = entries.map((e) => e.aiScore - e.humanScore);
    const mae = stats.mean(entries.map((e) => Math.abs(e.aiScore - e.humanScore)));
    const weight = entries.reduce((sum, e) => sum + (Number(e.weight) || 1), 0);
    const offset = stats.mean(offsets);

    dimensions[dimension] = {
      sampleSize: entries.length,
      offset: Number(offset.toFixed(3)),
      mae: Number(mae.toFixed(3)),
      kappa: Number.isFinite(stats.weightedKappa(pairs)) ? Number(stats.weightedKappa(pairs).toFixed(3)) : null,
      icc: Number.isFinite(stats.icc21(pairs)) ? Number(stats.icc21(pairs).toFixed(3)) : null,
    };

    totalWeight += weight;
    weightedOffset += offset * weight;
    weightedMae += mae * weight;
  }

  const expectedDimensions = (RUBRIC_CONFIG[type] || RUBRIC_CONFIG.dsa).dimensions.map((d) => d.key);
  const missingDimensions = expectedDimensions.filter((key) => !dimensions[key]);
  const sampleSize = rows.length;
  const overallOffset = totalWeight > 0 ? weightedOffset / totalWeight : 0;
  const overallMae = totalWeight > 0 ? weightedMae / totalWeight : 0;

  const eligible =
    sampleSize >= config.learning.goldenSetMinSamples &&
    overallMae <= 1.25 &&
    Math.abs(overallOffset) <= 1;

  return {
    type,
    sampleSize,
    sinceDays,
    dimensions,
    missingDimensions,
    overallOffset: Number(overallOffset.toFixed(3)),
    overallMae: Number(overallMae.toFixed(3)),
    eligible,
    generatedAt: new Date().toISOString(),
  };
}

async function recordHumanOverride({
  sessionId,
  userId,
  type,
  dimension,
  aiScore,
  humanScore,
  source = 'human_override',
  weight = 1,
  comment = '',
}) {
  const row = await CalibrationFeedback.create({
    sessionId,
    userId,
    type,
    source,
    dimension,
    aiScore: clampScore(aiScore),
    humanScore: clampScore(humanScore),
    weight: Math.min(10, Math.max(0, Number(weight) || 1)),
    comment: String(comment || '').slice(0, 2000),
  });
  metrics.inc('prepai_calibration_feedback_total', { type, source });
  return row;
}

/**
 * Compare the most recent window against a longer baseline. Detects abrupt
 * score shifts (model change, prompt regression, rubric drift).
 */
async function detectScoreDrift({ type, windowHours = 24, baselineDays = 7 } = {}) {
  const now = Date.now();
  const recentSince = new Date(now - windowHours * 60 * 60 * 1000);
  const baselineSince = new Date(now - baselineDays * 24 * 60 * 60 * 1000);

  const [recent, baseline] = await Promise.all([
    InterviewSession.find({
      type,
      status: 'completed',
      completedAt: { $gte: recentSince },
      'finalScore.overall': { $exists: true },
    })
      .select('finalScore.overall')
      .lean(),
    InterviewSession.find({
      type,
      status: 'completed',
      completedAt: { $gte: baselineSince, $lt: recentSince },
      'finalScore.overall': { $exists: true },
    })
      .select('finalScore.overall')
      .lean(),
  ]);

  const recentScores = recent.map((r) => r.finalScore?.overall).filter(Number.isFinite);
  const baselineScores = baseline.map((r) => r.finalScore?.overall).filter(Number.isFinite);

  const result = {
    type,
    recentN: recentScores.length,
    baselineN: baselineScores.length,
    recentMean: Number(stats.mean(recentScores).toFixed(3)),
    baselineMean: Number(stats.mean(baselineScores).toFixed(3)),
    baselineStdDev: Number(stats.stddev(baselineScores).toFixed(3)),
    zScore: 0,
    anomalous: false,
  };

  result.zScore = Number(
    stats
      .windowZScore({
        recentMean: result.recentMean,
        baselineMean: result.baselineMean,
        baselineStdDev: result.baselineStdDev,
        recentN: result.recentN,
      })
      .toFixed(2)
  );
  result.anomalous = Math.abs(result.zScore) > config.learning.anomalyZScore;

  if (result.anomalous) {
    metrics.inc('prepai_learning_anomalies_total', { type });
    logger.warn('Score drift anomaly detected', result);
    try {
      await AuditLog.create({
        userName: 'Learning Loop',
        userRole: 'system',
        action: 'learning.anomaly_detected',
        resource: `rubric_calibration:${type}`,
        status: 'failure',
        metadata: result,
      });
    } catch (err) {
      logger.warn('Anomaly audit write failed', { error: err.message });
    }
  }

  return result;
}

/**
 * Propose a new rubric-calibration artifact from human feedback.
 * The artifact starts in `shadow` (never active) and requires human promotion.
 */
async function proposeCalibration({ type, version, createdBy = null }) {
  const calibration = await computeTypeCalibration({ type });
  const drift = await detectScoreDrift({ type });

  const dimensionOffsets = {};
  Object.entries(calibration.dimensions).forEach(([dimension, value]) => {
    // Dampen offsets: never move a rubric anchor by more than 1.0 point per
    // cycle, and shrink toward zero when the evidence is thin.
    const confidence = Math.min(1, value.sampleSize / (config.learning.goldenSetMinSamples * 2));
    dimensionOffsets[dimension] = Number(
      Math.max(-1, Math.min(1, value.offset * confidence)).toFixed(3)
    );
  });

  const versionLabel = version || `rubric-${type}-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36).slice(-4)}`;

  const artifact = await versionRegistry.propose({
    kind: versionRegistry.KINDS.RUBRIC,
    version: versionLabel,
    payload: {
      type,
      dimensionOffsets,
      algorithm: 'human-anchored-offset-v1',
    },
    evaluationMetrics: {
      eligible: calibration.eligible && !drift.anomalous,
      kappa: Object.values(calibration.dimensions).map((d) => d.kappa).filter(Number.isFinite),
      mae: calibration.overallMae,
      offset: calibration.overallOffset,
      zScore: drift.zScore,
      reason: drift.anomalous ? 'score_drift_anomaly' : !calibration.eligible ? 'insufficient_human_evidence' : null,
    },
    sampleSize: calibration.sampleSize,
    notes: `Auto-generated from ${calibration.sampleSize} human-anchored rows for ${type}.`,
    createdBy,
  });

  const shadowArtifact = await versionRegistry.setStatus({
    kind: versionRegistry.KINDS.RUBRIC,
    version: artifact.version,
    status: 'shadow',
    approvedBy: null,
  });

  return { artifact: shadowArtifact, calibration, drift };
}

/**
 * Apply the active calibration offsets to a set of dimension scores.
 * Default static version has no offsets, so this is a no-op until a human
 * promotes a calibrated version.
 */
async function applyRubricOffsets({ type, dimensionScores }) {
  const active = await versionRegistry.getActive(versionRegistry.KINDS.RUBRIC);
  const offsets = active.payload?.dimensionOffsets || {};
  const adjusted = {};
  Object.entries(dimensionScores || {}).forEach(([dimension, score]) => {
    const offset = Number(offsets[dimension]) || 0;
    adjusted[dimension] = Number(clampScore(Number(score) + offset).toFixed(1));
  });
  return { dimensionScores: adjusted, rubricVersion: active.version, appliedOffsets: offsets };
}

module.exports = {
  clampScore,
  computeTypeCalibration,
  recordHumanOverride,
  detectScoreDrift,
  proposeCalibration,
  applyRubricOffsets,
};
