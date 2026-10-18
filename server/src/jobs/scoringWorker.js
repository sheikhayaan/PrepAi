const { Worker } = require('bullmq');
const InterviewSession = require('../models/InterviewSession');
const { scoreInterviewWithTool, RUBRIC_CONFIG } = require('../services/anthropicClient');
const calibration = require('../learning/calibration');
const versionRegistry = require('../learning/versionRegistry');
const { updateAbility, applyItemElo } = require('../learning/featureStore');
const { getReadinessWeights } = require('../learning/personalization');
const logger = require('../utils/logger');
const cache = require('../utils/cache');
const { redisClient } = require('./scoringQueue');

const processScoringJob = async (sessionId) => {
  console.log(`[BullMQ Worker] Starting scoring job for session: ${sessionId}`);
  const session = await InterviewSession.findById(sessionId);
  if (!session) {
    throw new Error(`Interview session not found: ${sessionId}`);
  }

  const scoreResult = await scoreInterviewWithTool(session);

  // Loop B: apply human-promoted calibration offsets. The static version has
  // no offsets, so this is a no-op until an admin promotes a candidate.
  try {
    const rubric = RUBRIC_CONFIG[session.type] || RUBRIC_CONFIG.dsa;
    const dimensionScores = {};
    rubric.dimensions.forEach((dim) => {
      if (Number.isFinite(Number(scoreResult[dim.key]))) {
        dimensionScores[dim.key] = Number(scoreResult[dim.key]);
      }
    });
    if (Object.keys(dimensionScores).length > 0) {
      const adjusted = await calibration.applyRubricOffsets({ type: session.type, dimensionScores });
      if (adjusted.rubricVersion !== 'static-v1') {
        Object.assign(scoreResult, adjusted.dimensionScores);
        const values = Object.values(adjusted.dimensionScores);
        scoreResult.overall = Number(
          (values.reduce((a, b) => a + b, 0) / Math.max(1, values.length)).toFixed(1)
        );
        session.rubricVersion = adjusted.rubricVersion;
      }
    }
  } catch (err) {
    logger.warn('Rubric calibration application skipped', { error: err.message });
  }

  const weights = await getReadinessWeights().catch(() => ({ version: 'static-v1' }));
  session.weightsVersion = weights.version;
  // Stamp the rubric version even when the static default is in force so every
  // historical score is attributable to a specific artifact.
  session.rubricVersion = session.rubricVersion || (await versionRegistry.getActiveVersion(versionRegistry.KINDS.RUBRIC));
  session.finalScore = scoreResult;
  session.completedAt = new Date();
  session.status = 'completed';
  await session.save();
  await cache.del(`analytics:user:${session.userId}`);

  // Loop A: update the candidate ability estimate off the request path.
  const abilityResult = await updateAbility({
    userId: session.userId,
    type: session.type,
    score: Number(scoreResult.overall) || 0,
  });

  // Loop A: update item difficulty for every bank question in this session.
  for (const turn of session.turns || []) {
    const overall = Number(turn.turnScore?.overall);
    if (turn.questionId && Number.isFinite(overall)) {
      await applyItemElo({
        questionId: String(turn.questionId),
        type: session.type,
        score: overall,
        ability: abilityResult?.ability,
      });
    }
  }

  logger.info('Interview scoring completed', {
    sessionId: String(session._id),
    overall: scoreResult.overall,
    rubricVersion: session.rubricVersion,
    weightsVersion: session.weightsVersion,
  });
  return scoreResult;
};

let worker = null;
if (redisClient) {
  try {
    worker = new Worker(
      'interview-scoring',
      async (job) => {
        const { sessionId } = job.data;
        return await processScoringJob(sessionId);
      },
      {
        connection: redisClient,
        concurrency: 5,
      }
    );

    worker.on('completed', (job, result) => {
      console.log(`[BullMQ Worker] Job ${job.id} completed successfully.`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[BullMQ Worker] Job ${job?.id} failed with error: ${err.message}`);
    });
  } catch (err) {
    console.warn('BullMQ Worker setup deferred:', err.message);
  }
}

module.exports = {
  processScoringJob,
  worker,
};
