/**
 * Shared Redis client for caching, budgets, SSE registries and distributed
 * rate limiting.
 *
 * Design goals:
 *  - Never crash the process if Redis is unavailable.
 *  - Never queue commands while disconnected (fail fast; callers degrade).
 *  - Bounded retries so local development does not spin forever.
 *
 * BullMQ owns its own connections (scoringQueue.js) because workers require
 * blocking connections and different retry semantics.
 */
const IORedis = require('ioredis');
const config = require('./env');
const logger = require('../utils/logger');

let client = null;
let ready = false;
let lastError = null;
let connectPromise = null;

function buildClient() {
  if (!config.redis.enabled) return null;

  const instance = new IORedis(config.redis.url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    enableReadyCheck: true,
    connectTimeout: config.redis.connectTimeoutMs,
    maxRetriesPerRequest: 1,
    // Stop retrying after a bounded number of attempts; callers fall back to
    // in-process memory and the connection can be re-established later.
    retryStrategy(times) {
      if (times > config.redis.maxRetries) return null;
      return Math.min(200 * times, 2000);
    },
    reconnectOnError(err) {
      // Reconnect on READONLY (failover) but not on auth/config errors.
      return /READONLY/.test(err.message);
    },
  });

  instance.on('ready', () => {
    if (!ready) logger.info('Redis shared client ready (cache/budgets/SSE registry)');
    ready = true;
    lastError = null;
  });

  instance.on('end', () => {
    if (ready) logger.warn('Redis shared client connection ended; falling back to in-process state');
    ready = false;
  });

  instance.on('error', (err) => {
    lastError = err.message;
    if (ready) logger.warn('Redis shared client error', { error: err.message });
    ready = false;
  });

  return instance;
}

function getRedis() {
  if (!config.redis.enabled) return null;
  if (!client) client = buildClient();
  return client;
}

/**
 * Best-effort connect. Safe to call multiple times.
 */
async function connectRedis() {
  const instance = getRedis();
  if (!instance) return false;
  if (instance.status === 'ready') {
    ready = true;
    return true;
  }
  if (connectPromise) return connectPromise;

  connectPromise = instance
    .connect()
    .then(() => {
      ready = true;
      return true;
    })
    .catch((err) => {
      lastError = err.message;
      logger.warn('Redis unavailable; distributed features degrade to per-process memory', {
        error: err.message,
      });
      return false;
    })
    .finally(() => {
      connectPromise = null;
    });

  return connectPromise;
}

function isRedisReady() {
  return Boolean(config.redis.enabled && client && (client.status === 'ready' || ready));
}

/**
 * Run a Redis command if ready; otherwise return fallback. Never throws.
 */
async function safeRedis(fn, fallback = null) {
  const instance = getRedis();
  if (!instance) return fallback;
  if (!isRedisReady()) {
    // Attempt a non-blocking reconnect at most once per call site.
    if (instance.status === 'wait' || instance.status === 'end') {
      connectRedis().catch(() => {});
    }
    return fallback;
  }
  try {
    return await fn(instance);
  } catch (err) {
    lastError = err.message;
    return fallback;
  }
}

/**
 * Atomic increment with expiry. Returns the new value or null when unavailable.
 */
async function incrWithTtl(key, ttlSeconds, amount = 1) {
  const script = `
    local v = redis.call('INCRBY', KEYS[1], ARGV[1])
    if v == tonumber(ARGV[1]) then
      redis.call('EXPIRE', KEYS[1], ARGV[2])
    end
    return v
  `;
  return safeRedis(
    (instance) => instance.eval(script, 1, key, String(amount), String(ttlSeconds)),
    null
  );
}

/**
 * Release a counter without allowing it to go negative.
 */
async function decrFloorZero(key) {
  const script = `
    local v = tonumber(redis.call('GET', KEYS[1]) or '0')
    if v <= 0 then
      redis.call('DEL', KEYS[1])
      return 0
    end
    return redis.call('DECR', KEYS[1])
  `;
  return safeRedis((instance) => instance.eval(script, 1, key), null);
}

async function closeRedis() {
  if (!client) return;
  try {
    client.disconnect(false);
  } catch {
    // ignore
  }
  client = null;
  ready = false;
}

function redisHealth() {
  return {
    enabled: config.redis.enabled,
    ready: isRedisReady(),
    status: client ? client.status : 'disabled',
    lastError,
  };
}

module.exports = {
  getRedis,
  connectRedis,
  isRedisReady,
  safeRedis,
  incrWithTtl,
  decrFloorZero,
  closeRedis,
  redisHealth,
};
