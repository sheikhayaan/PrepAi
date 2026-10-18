/**
 * Version registry for every learned artifact.
 *
 * The request path only ever calls `getActive()`, which is cached (Redis L2 +
 * process L1). Promotion/rollback are admin-only, human-approved operations.
 */
const LearningArtifact = require('../models/LearningArtifact');
const AuditLog = require('../models/AuditLog');
const config = require('../config/env');
const cache = require('../utils/cache');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');

const KINDS = {
  RUBRIC: 'rubric_calibration',
  READINESS: 'readiness_weights',
  SELECTION: 'selection_policy',
  PROMPT_EVAL: 'prompt_evaluation',
};

const STATIC_VERSIONS = {
  [KINDS.RUBRIC]: 'static-v1',
  [KINDS.READINESS]: 'static-v1',
  [KINDS.SELECTION]: 'static-v1',
  [KINDS.PROMPT_EVAL]: 'static-v1',
};

const DEFAULT_PAYLOADS = {
  [KINDS.RUBRIC]: { dimensionOffsets: {}, anchorAdjustments: [] },
  [KINDS.READINESS]: { technical: 0.5, delivery: 0.3, consistency: 0.2 },
  [KINDS.SELECTION]: {
    explorationEpsilon: config.learning.explorationEpsilon,
    exposureCapShare: config.learning.exposureCapShare,
    abilityKFactor: config.learning.abilityKFactor,
  },
  [KINDS.PROMPT_EVAL]: {},
};

// Allowed state transitions. No direct proposed -> active shortcut.
const TRANSITIONS = {
  proposed: ['shadow', 'archived'],
  shadow: ['canary', 'archived'],
  canary: ['active', 'rolled_back', 'archived'],
  active: ['rolled_back', 'archived'],
  rolled_back: ['archived'],
  archived: [],
};

const MIN_SAMPLES = {
  [KINDS.RUBRIC]: config.learning.goldenSetMinSamples,
  [KINDS.READINESS]: config.learning.goldenSetMinSamples,
  [KINDS.SELECTION]: Math.max(20, Math.floor(config.learning.goldenSetMinSamples / 2)),
  [KINDS.PROMPT_EVAL]: config.learning.goldenSetMinSamples,
};

function cacheKey(kind) {
  return `learning:active:${kind}`;
}

async function writeAudit({ action, resource, metadata, userId }) {
  try {
    await AuditLog.create({
      userId: userId || undefined,
      userName: 'Learning Loop',
      userRole: userId ? 'admin' : 'system',
      action,
      resource,
      status: 'success',
      metadata,
    });
  } catch (err) {
    logger.warn('Learning audit write failed', { action, error: err.message });
  }
}

/**
 * Active payload for a kind. Never throws: a missing/corrupt artifact returns
 * the safe static default.
 */
const inflight = new Map();

async function getActive(kind) {
  const fallback = {
    version: STATIC_VERSIONS[kind] || 'static-v1',
    kind,
    payload: DEFAULT_PAYLOADS[kind] || {},
    metrics: {},
    source: 'static',
  };

  const key = cacheKey(kind);
  const cached = await cache.get(key);
  if (cached !== undefined) return cached;
  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    let value = fallback;
    try {
      const active = await LearningArtifact.findOne({ kind, status: 'active' }).lean();
      if (active) {
        value = {
          version: active.version,
          kind,
          payload: active.payload || DEFAULT_PAYLOADS[kind] || {},
          metrics: active.metrics || {},
          sampleSize: active.sampleSize,
          source: 'active',
        };
      }
    } catch (err) {
      logger.warn('Failed to load active learning artifact; using default', { kind, error: err.message });
    }
    // Never cache an outage for the full version TTL: a static fallback is
    // retried quickly so a promoted artifact takes effect after recovery.
    const ttl = value.source === 'active' ? config.learning.versionCacheSeconds : 60;
    await cache.set(key, value, ttl);
    return value;
  })().finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

async function getActiveVersion(kind) {
  return (await getActive(kind)).version;
}

async function listVersions(kind, limit = 20) {
  return LearningArtifact.find(kind ? { kind } : {})
    .sort({ createdAt: -1 })
    .limit(Math.min(100, Math.max(1, limit)))
    .lean();
}

async function propose({
  kind,
  version,
  payload,
  evaluationMetrics = {},
  sampleSize = 0,
  notes = '',
  createdBy = null,
}) {
  if (!Object.values(KINDS).includes(kind)) {
    throw new Error(`Unknown learning artifact kind: ${kind}`);
  }
  if (!version) throw new Error('A non-empty version is required');

  const artifact = await LearningArtifact.create({
    kind,
    version,
    status: 'proposed',
    payload,
    metrics: evaluationMetrics,
    sampleSize,
    notes,
    createdBy,
  });

  await writeAudit({
    action: 'learning.propose',
    resource: `${kind}:${version}`,
    metadata: { kind, version, sampleSize, metrics: evaluationMetrics },
    userId: createdBy,
  });
  metrics.inc('prepai_learning_proposals_total', { kind });
  return artifact;
}


/**
 * Move an artifact through the guard-railed state machine.
 *
 * @param {Object} options
 * @param {string} options.kind
 * @param {string} options.version
 * @param {'shadow'|'canary'|'active'|'rolled_back'|'archived'} options.status
 * @param {string} options.approvedBy admin user id (required for active)
 * @param {string} [options.reason]
 * @param {boolean} [options.force] bypass sample-size gate (never bypasses approval)
 */
async function setStatus({ kind, version, status, approvedBy, reason = '', force = false }) {
  const artifact = await LearningArtifact.findOne({ kind, version });
  if (!artifact) throw new Error(`Artifact ${kind}:${version} not found`);

  const allowed = TRANSITIONS[artifact.status] || [];
  if (!allowed.includes(status)) {
    throw new Error(`Illegal transition ${artifact.status} -> ${status} for ${kind}:${version}`);
  }

  if (status === 'active') {
    if (!approvedBy) {
      throw new Error('Promotion to active requires explicit human approval (approvedBy)');
    }
    const minSamples = MIN_SAMPLES[kind] || 0;
    if (!force && artifact.sampleSize < minSamples) {
      throw new Error(
        `Insufficient evidence for promotion: ${artifact.sampleSize}/${minSamples} samples. ` +
          'Collect more human-anchored feedback or use an explicitly approved force promotion.'
      );
    }
    const anomaly = Number(artifact.metrics?.zScore);
    if (Number.isFinite(anomaly) && Math.abs(anomaly) > config.learning.anomalyZScore && !force) {
      throw new Error(
        `Anomaly gate blocked promotion: |z|=${Math.abs(anomaly).toFixed(2)} exceeds ${config.learning.anomalyZScore}.`
      );
    }
    if (!force && artifact.metrics?.eligible === false) {
      throw new Error(`Offline evaluation marked this candidate ineligible: ${artifact.metrics?.reason || 'unknown'}`);
    }
  }

  if (status === 'active') {
    // Demote the current active first; the partial unique index is the final
    // backstop against two active versions.
    await LearningArtifact.updateMany(
      { kind, status: 'active', _id: { $ne: artifact._id } },
      { $set: { status: 'archived' } }
    );
    artifact.promotedAt = new Date();
    artifact.approvedBy = approvedBy;
  }
  if (status === 'rolled_back') {
    artifact.rolledBackAt = new Date();
  }

  artifact.status = status;
  if (reason) artifact.notes = `${artifact.notes ? `${artifact.notes}\n` : ''}${reason}`;
  await artifact.save();

  await cache.del(cacheKey(kind));
  await writeAudit({
    action: `learning.${status === 'active' ? 'promote' : status}`,
    resource: `${kind}:${version}`,
    metadata: { kind, version, status, approvedBy, reason, force },
    userId: approvedBy || null,
  });
  metrics.inc('prepai_learning_status_transitions_total', { kind, status });

  logger.info('Learning artifact status changed', { kind, version, status, approvedBy, reason });
  return artifact;
}

async function promote({ kind, version, approvedBy, reason = '', force = false }) {
  return setStatus({ kind, version, status: 'active', approvedBy, reason, force });
}

async function rollback({ kind, approvedBy, reason = '' }) {
  const active = await LearningArtifact.findOne({ kind, status: 'active' });
  if (!active) throw new Error(`No active ${kind} artifact to roll back`);

  await setStatus({ kind, version: active.version, status: 'rolled_back', approvedBy, reason });

  // Restore the most recent previously-active artifact, if any.
  const previous = await LearningArtifact.findOne({
    kind,
    _id: { $ne: active._id },
    promotedAt: { $ne: null },
    status: { $in: ['archived', 'rolled_back'] },
  }).sort({ promotedAt: -1 });

  if (previous) {
    await LearningArtifact.updateOne({ _id: previous._id }, { $set: { status: 'active', promotedAt: new Date() } });
    await cache.del(cacheKey(kind));
    await writeAudit({
      action: 'learning.rollback',
      resource: `${kind}:${active.version}->${previous.version}`,
      metadata: { kind, from: active.version, to: previous.version, approvedBy, reason },
      userId: approvedBy || null,
    });
    return { rolledBack: active.version, restored: previous.version };
  }

  await writeAudit({
    action: 'learning.rollback',
    resource: `${kind}:${active.version}`,
    metadata: { kind, from: active.version, to: STATIC_VERSIONS[kind], approvedBy, reason },
    userId: approvedBy || null,
  });
  return { rolledBack: active.version, restored: STATIC_VERSIONS[kind] };
}

module.exports = {
  KINDS,
  STATIC_VERSIONS,
  DEFAULT_PAYLOADS,
  TRANSITIONS,
  getActive,
  getActiveVersion,
  listVersions,
  propose,
  setStatus,
  promote,
  rollback,
};
