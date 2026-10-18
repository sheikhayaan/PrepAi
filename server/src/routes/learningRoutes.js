/**
 * Admin surface for the learning loops.
 *
 * Every mutation is human-initiated (this router is admin-only) and every
 * transition is written to the audit log by the version registry.
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const versionRegistry = require('../learning/versionRegistry');
const calibration = require('../learning/calibration');
const evaluation = require('../learning/evaluation');
const personalization = require('../learning/personalization');
const scheduler = require('../learning/scheduler');

const VALID_TYPES = new Set(scheduler.TYPES);

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function checkKind(kind) {
  return Object.values(versionRegistry.KINDS).includes(kind);
}

// GET /api/admin/learning/snapshot
router.get('/snapshot', async (req, res, next) => {
  try {
    return res.json(await scheduler.getLearningSnapshot());
  } catch (err) {
    return next(err);
  }
});

// GET /api/admin/learning/versions?kind=rubric_calibration
router.get('/versions', async (req, res, next) => {
  try {
    const { kind } = req.query;
    if (kind && !checkKind(kind)) return badRequest(res, `Unknown kind '${kind}'`);
    const versions = await versionRegistry.listVersions(kind, Number(req.query.limit) || 20);
    return res.json({ versions });
  } catch (err) {
    return next(err);
  }
});

// GET /api/admin/learning/calibration?type=dsa
router.get('/calibration', async (req, res, next) => {
  try {
    const { type } = req.query;
    if (!VALID_TYPES.has(type)) return badRequest(res, `Unknown interview type '${type}'`);
    const report = await calibration.computeTypeCalibration({ type });
    return res.json({ report });
  } catch (err) {
    return next(err);
  }
});

// GET /api/admin/learning/drift?type=dsa
router.get('/drift', async (req, res, next) => {
  try {
    const { type } = req.query;
    if (!VALID_TYPES.has(type)) return badRequest(res, `Unknown interview type '${type}'`);
    return res.json({ drift: await calibration.detectScoreDrift({ type }) });
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/learning/calibrate  { type }
router.post('/calibrate', async (req, res, next) => {
  try {
    const { type } = req.body || {};
    if (!VALID_TYPES.has(type)) return badRequest(res, `Unknown interview type '${type}'`);
    const result = await calibration.proposeCalibration({ type, createdBy: req.user._id });
    return res.status(201).json({
      artifact: {
        kind: result.artifact.kind,
        version: result.artifact.version,
        status: result.artifact.status,
      },
      calibration: result.calibration,
      drift: result.drift,
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/learning/readiness
router.post('/readiness', async (req, res, next) => {
  try {
    const result = await personalization.proposeReadinessWeights({ createdBy: req.user._id });
    if (!result.artifact) {
      return res.status(409).json({ error: 'Insufficient human evidence', detail: result });
    }
    return res.status(201).json({
      artifact: { version: result.artifact.version, status: result.artifact.status },
      weights: result.weights,
      correlations: result.correlations,
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/learning/prompt  { type, promptVersion, model }
router.post('/prompt', async (req, res, next) => {
  try {
    const { type, promptVersion, model = 'default' } = req.body || {};
    if (!VALID_TYPES.has(type)) return badRequest(res, `Unknown interview type '${type}'`);
    if (!promptVersion || !/^[a-zA-Z0-9._-]{1,64}$/.test(String(promptVersion))) {
      return badRequest(res, 'promptVersion must match [a-zA-Z0-9._-]{1,64}');
    }
    const result = await evaluation.proposePromptCandidate({
      type,
      promptVersion: String(promptVersion),
      model: String(model).slice(0, 64),
      createdBy: req.user._id,
    });
    return res.status(201).json({
      artifact: { version: result.artifact.version, status: result.artifact.status },
      candidate: result.candidate,
      evaluation: result.evaluation,
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/learning/evaluate  { kind, type, version }
router.post('/evaluate', async (req, res, next) => {
  try {
    const { kind = versionRegistry.KINDS.RUBRIC, type, version } = req.body || {};
    if (!checkKind(kind)) return badRequest(res, `Unknown kind '${kind}'`);
    if (!VALID_TYPES.has(type)) return badRequest(res, `Unknown interview type '${type}'`);
    if (!version) return badRequest(res, 'version is required');

    const result = await evaluation.runOfflineEvaluation({ kind, type, candidateVersion: version });
    await evaluation.runShadowEvaluation({
      kind,
      type,
      candidateVersion: version,
      approvedBy: req.user._id,
    });
    return res.json({ evaluation: result });
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/learning/canary  { kind, version, reason }
router.post('/canary', async (req, res, next) => {
  try {
    const { kind, version, reason } = req.body || {};
    if (!checkKind(kind)) return badRequest(res, `Unknown kind '${kind}'`);
    if (!version) return badRequest(res, 'version is required');
    const artifact = await evaluation.startCanary({
      kind,
      version,
      approvedBy: req.user._id,
      reason: reason || 'Canary rollout approved',
    });
    return res.json({ artifact: { kind, version, status: artifact.status } });
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/learning/promote  { kind, version, reason }
router.post('/promote', async (req, res, next) => {
  try {
    const { kind, version, reason } = req.body || {};
    if (!checkKind(kind)) return badRequest(res, `Unknown kind '${kind}'`);
    if (!version) return badRequest(res, 'version is required');

    const artifact = await evaluation.promoteCandidate({
      kind,
      version,
      approvedBy: req.user._id,
      reason: reason || '',
    });
    return res.json({ artifact: { kind, version, status: artifact.status, promotedAt: artifact.promotedAt } });
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/learning/rollback  { kind, reason }
router.post('/rollback', async (req, res, next) => {
  try {
    const { kind, reason } = req.body || {};
    if (!checkKind(kind)) return badRequest(res, `Unknown kind '${kind}'`);
    const result = await versionRegistry.rollback({
      kind,
      approvedBy: req.user._id,
      reason: reason || 'Manual rollback',
    });
    return res.json({ rollback: result });
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/learning/feedback
router.post('/feedback', async (req, res, next) => {
  try {
    const { sessionId, dimension, aiScore, humanScore, source, weight, comment, type } = req.body || {};
    if (!mongoose.isValidObjectId(sessionId)) return badRequest(res, 'Valid sessionId is required');
    if (!dimension) return badRequest(res, 'dimension is required');
    if (!VALID_TYPES.has(type)) return badRequest(res, `Unknown interview type '${type}'`);

    const row = await calibration.recordHumanOverride({
      sessionId,
      userId: req.user._id,
      type,
      dimension,
      aiScore,
      humanScore,
      source: source || 'reviewer',
      weight,
      comment,
    });
    return res.status(201).json({ feedback: { id: row._id, createdAt: row.createdAt } });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
