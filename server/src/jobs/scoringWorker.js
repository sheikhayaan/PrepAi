const { Worker } = require('bullmq');
const InterviewSession = require('../models/InterviewSession');
const { scoreInterviewWithTool } = require('../services/anthropicClient');
const { redisClient } = require('./scoringQueue');

const processScoringJob = async (sessionId) => {
  console.log(`[BullMQ Worker] Starting scoring job for session: ${sessionId}`);
  const session = await InterviewSession.findById(sessionId);
  if (!session) {
    throw new Error(`Interview session not found: ${sessionId}`);
  }

  const scoreResult = await scoreInterviewWithTool(session);
  console.log(`[BullMQ Worker] Structured score generated:`, scoreResult);

  session.finalScore = scoreResult;
  session.completedAt = new Date();
  session.status = 'completed';
  await session.save();

  console.log(`[BullMQ Worker] Session ${sessionId} final score saved to database.`);
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
