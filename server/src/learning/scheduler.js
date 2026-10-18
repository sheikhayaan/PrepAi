/**
 * Bounded learning-loop scheduler.
 *
 * Runs entirely off the request path, single-flight per job, and never throws
 * into the process. Every loop is opt-in via LEARNING_LOOPS_ENABLED so local
 * development and tests stay deterministic.
 */
const config = require('../config/env');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');
const cache = require('../utils/cache');
const LearningArtifact = require('../models/LearningArtifact');
const InterviewSession = require('../models/InterviewSession');
const featureStore = require('./featureStore');
const calibration = require('./calibration');
const evaluation = require('./evaluation');
const personalization = require('./personalization');
const versionRegistry = require('./versionRegistry');
const stats = require('./statistics');

const TYPES = [
  'dsa',
  'system_design',
  'behavioral',
  'hr_round',
  'case_study',
  'product_management',
  'sales_pitch',
  'managerial',
];

let timers = [];
let initialTimers = [];
let running = new Set();

async function singleFlight(name, fn) {
  if (running.has(name)) {
    logger.debug(`Learning job ${name} already running; skipping overlap`);
    return;
  }
  running.add(name);
  const startedAt = Date.now();
  try {
    await fn();
    metrics.observe('prepai_learning_job_duration_ms', { job: name }, Date.now() - startedAt);
  } catch (err) {
    metrics.inc('prepai_learning_job_failures_total', { job: name });
    logger.warn(`Learning job ${name} failed`, { error: err.message });
  } finally {
    running.delete(name);
  }
}

/**
 * Hourly aggregation: reset exposure windows and detect score drift per track.
 */
async function runAggregation() {
  await featureStore.resetExposureWindows();
  const drift = {};
  for (const type of TYPES) {
    try {
      drift[type] = await calibration.detectScoreDrift({ type });
    } catch (err) {
      drift[type] = { type, error: err.message, anomalous: false };
      logger.warn('Drift detection failed for track', { type, error: err.message });
    }
  }
  await cache.set(
    'learning:drift:snapshot',
    { generatedAt: new Date().toISOString(), drift },
    Math.max(60, Math.floor(config.learning.aggregateIntervalMs / 1000))
  );
  metrics.setGauge('prepai_learning_anomalies', {}, Object.values(drift).filter((d) => d.anomalous).length);
}

/**
 * Calibration proposals. At most one proposal per type per day; artifacts are
 * always created in `shadow` and require human promotion.
 */
async function runCalibration() {
  for (const type of TYPES) {
    try {
      const recent = await LearningArtifact.findOne({
        kind: versionRegistry.KINDS.RUBRIC,
        'payload.type': type,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }).lean();
      if (recent) continue;

      const result = await calibration.proposeCalibration({ type });
      logger.info('Rubric calibration proposal evaluated', {
        type,
        sampleSize: result.calibration.sampleSize,
        eligible: result.calibration.eligible,
        driftZ: result.drift.zScore,
        version: result.artifact.version,
      });
    } catch (err) {
      logger.warn('Rubric calibration proposal failed', { type, error: err.message });
    }
  }

  try {
    const recentReadiness = await LearningArtifact.findOne({
      kind: versionRegistry.KINDS.READINESS,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).lean();
    if (!recentReadiness) {
      const readiness = await personalization.proposeReadinessWeights();
      if (readiness.artifact) {
        logger.info('Readiness weight proposal created', {
          version: readiness.artifact.version,
          weights: readiness.weights,
        });
      }
    }
  } catch (err) {
    logger.warn('Readiness weight proposal failed', { error: err.message });
  }

  // Shadow-evaluate any rubric candidate that has not been evaluated yet.
  // Proposals are created in shadow, so query both states and skip artifacts
  // that already carry offline-evaluation evidence.
  const candidates = await LearningArtifact.find({
    kind: versionRegistry.KINDS.RUBRIC,
    status: { $in: ['proposed', 'shadow'] },
    'metrics.candidate': { $exists: false },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  for (const artifact of candidates) {
    const type = artifact.payload?.type;
    if (!type) continue;
    try {
      await evaluation.runShadowEvaluation({
        kind: versionRegistry.KINDS.RUBRIC,
        type,
        candidateVersion: artifact.version,
      });
    } catch (err) {
      logger.warn('Shadow evaluation failed', { version: artifact.version, error: err.message });
    }
  }

  // Prompt/model candidates are evaluated on human agreement per prompt
  // version. Shadow evaluation stores evidence; promotion stays human-gated.
  const promptCandidates = await LearningArtifact.find({
    kind: versionRegistry.KINDS.PROMPT_EVAL,
    status: { $in: ['proposed', 'shadow'] },
    'metrics.candidate': { $exists: false },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  for (const artifact of promptCandidates) {
    const type = artifact.payload?.type;
    if (!type) continue;
    try {
      await evaluation.runShadowEvaluation({
        kind: versionRegistry.KINDS.PROMPT_EVAL,
        type,
        candidateVersion: artifact.version,
      });
    } catch (err) {
      logger.warn('Prompt shadow evaluation failed', { version: artifact.version, error: err.message });
    }
  }
}

/**
 * Prompt evaluation: compare human agreement for the active prompt version vs
 * sessions scored under other versions. Purely observational, never promotes.
 */
async function runPromptEvaluation() {
  const summary = { generatedAt: new Date().toISOString(), types: {} };
  for (const type of TYPES) {
    try {
      summary.types[type] = await evaluation.evaluatePromptVersions({ type });
    } catch (err) {
      summary.types[type] = { type, error: err.message, versions: [] };
      logger.warn('Prompt evaluation failed for track', { type, error: err.message });
    }
  }
  const versionCount = Object.values(summary.types)
    .reduce((sum, row) => sum + (row.versions?.length || 0), 0);

  await cache.set('learning:prompt-eval:snapshot', summary, 6 * 60 * 60);
  metrics.setGauge('prepai_learning_prompt_versions', {}, versionCount);
  logger.info('Prompt evaluation snapshot refreshed', { versions: versionCount });
}

function schedule(name, intervalMs, fn) {
  const timer = setInterval(() => singleFlight(name, fn), intervalMs);
  if (timer.unref) timer.unref();
  timers.push(timer);
}

function start() {
  if (!config.learning.enabled) {
    logger.info('Learning loops disabled (LEARNING_LOOPS_ENABLED=false)');
    return false;
  }
  if (timers.length > 0) return true;

  // Stagger the initial runs so a deploy does not trigger every loop at once.
  initialTimers.push(
    setTimeout(() => singleFlight('aggregation', runAggregation), 30 * 1000),
    setTimeout(() => singleFlight('calibration', runCalibration), 90 * 1000),
    setTimeout(() => singleFlight('prompt-evaluation', runPromptEvaluation), 150 * 1000)
  );
  initialTimers.forEach((timer) => timer.unref?.());

  schedule('aggregation', config.learning.aggregateIntervalMs, runAggregation);
  schedule('calibration', config.learning.calibrationIntervalMs, runCalibration);
  schedule('prompt-evaluation', config.learning.calibrationIntervalMs * 2, runPromptEvaluation);

  logger.info('Learning loops started', {
    aggregateIntervalMs: config.learning.aggregateIntervalMs,
    calibrationIntervalMs: config.learning.calibrationIntervalMs,
  });
  return true;
}

function stop() {
  timers.forEach(clearInterval);
  initialTimers.forEach(clearTimeout);
  timers = [];
  initialTimers = [];
  running.clear();
}

/**
 * Snapshot for admin dashboards / readiness checks.
 */
async function getLearningSnapshot() {
  const [active, drift, promptEval] = await Promise.all([
    Promise.all(
      Object.values(versionRegistry.KINDS).map(async (kind) => ({
        kind,
        ...(await versionRegistry.getActive(kind)),
      }))
    ),
    cache.get('learning:drift:snapshot'),
    cache.get('learning:prompt-eval:snapshot'),
  ]);

  return {
    enabled: config.learning.enabled,
    active,
    drift: drift || null,
    promptEvaluation: promptEval || null,
    lastRun: {
      aggregation: timers.length > 0 ? 'scheduled' : 'stopped',
    },
    stats,
  };
}

module.exports = {
  TYPES,
  start,
  stop,
  runAggregation,
  runCalibration,
  runPromptEvaluation,
  getLearningSnapshot,
  singleFlight,
};
