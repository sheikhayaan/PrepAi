const { Queue } = require('bullmq');
const IORedis = require('ioredis');

let scoringQueue = null;
let redisClient = null;
let isRedisAvailable = false;

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

try {
  redisClient = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      if (times > 3) {
        // Stop retrying after 3 attempts in local dev
        return null;
      }
      return Math.min(times * 100, 1000);
    },
  });

  redisClient.on('connect', () => {
    console.log('Redis connected successfully for BullMQ job queue');
    isRedisAvailable = true;
  });

  redisClient.on('error', (err) => {
    // Gracefully handle local dev if Redis server is not started
    if (!isRedisAvailable) {
      // Log once quietly
    }
  });

  scoringQueue = new Queue('interview-scoring', {
    connection: redisClient,
  });
} catch (err) {
  console.warn('BullMQ initialization skipped Redis connection:', err.message);
}

const addScoringJob = async (sessionId) => {
  if (isRedisAvailable && scoringQueue) {
    try {
      return await scoringQueue.add('score-session', { sessionId }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
    } catch (queueErr) {
      console.warn('Could not enqueue to Redis BullMQ, running background worker directly:', queueErr.message);
    }
  }

  // Fallback: Run background scoring worker asynchronously without blocking HTTP response
  setImmediate(async () => {
    try {
      const { processScoringJob } = require('./scoringWorker');
      await processScoringJob(sessionId);
    } catch (e) {
      console.error('Background scoring fallback failed:', e.message);
    }
  });
  return { id: `local-${sessionId}-${Date.now()}` };
};

module.exports = {
  scoringQueue,
  addScoringJob,
  redisClient,
};
