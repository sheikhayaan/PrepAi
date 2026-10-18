/**
 * Index bootstrap.
 *
 * Production runs with `autoIndex: false` so a deploy never triggers a surprise
 * collection scan/index build on a hot database. The learning-loop models rely
 * on uniqueness (one ability row per user/type, one active artifact per kind,
 * one stat row per question), so their indexes must exist for correctness.
 *
 * Index builds are idempotent and run once after the connection is established.
 */
const logger = require('../utils/logger');

const CRITICAL_MODELS = [
  '../models/UserAbility',
  '../models/QuestionStat',
  '../models/LearningArtifact',
  '../models/CalibrationFeedback',
  '../models/AuditLog',
  '../models/InterviewSession',
];

async function ensureIndexes() {
  const results = await Promise.allSettled(
    CRITICAL_MODELS.map(async (path) => {
      const Model = require(path);
      await Model.createIndexes();
      return Model.modelName;
    })
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.warn('Index creation failed', {
        model: CRITICAL_MODELS[index],
        error: result.reason?.message || String(result.reason),
      });
    }
  });

  const created = results.filter((result) => result.status === 'fulfilled').length;
  logger.info('Critical database indexes verified', { models: created, total: CRITICAL_MODELS.length });
  return created;
}

module.exports = { ensureIndexes };
