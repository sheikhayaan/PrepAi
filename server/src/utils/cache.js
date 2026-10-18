/**
 * Two-tier cache: in-process L1 (LRU + TTL) and Redis L2.
 *
 * - L1 absorbs hot reads with zero network cost.
 * - L2 shares state across instances.
 * - getOrSet coalesces concurrent misses (single-flight) so a cold cache or a
 *   deploy warm-up cannot stampede MongoDB or the LLM provider.
 * - All failures degrade to "cache miss"; caching is never on the correctness
 *   path.
 */
const config = require('../config/env');
const { safeRedis, isRedisReady } = require('../config/redis');
const logger = require('./logger');
const metrics = require('./metrics');

const PREFIX = config.redis.keyPrefix || 'prepai';
const DEFAULT_L1_MAX = 1000;

class L1Cache {
  constructor(maxEntries = DEFAULT_L1_MAX) {
    this.maxEntries = maxEntries;
    this.store = new Map();
    this.sweeper = setInterval(() => this.sweep(), 60 * 1000);
    if (this.sweeper.unref) this.sweeper.unref();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // LRU touch.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlSeconds) {
    if (ttlSeconds <= 0) return;
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  sweep() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) this.store.delete(key);
    }
  }
}

const l1 = new L1Cache();
const inflight = new Map();

const stats = { l1Hits: 0, l2Hits: 0, misses: 0, redisErrors: 0 };

function fullKey(key) {
  return `${PREFIX}:cache:${key}`;
}

/**
 * Get a value from L1 then L2.
 */
async function get(key) {
  const local = l1.get(key);
  if (local !== undefined) {
    stats.l1Hits++;
    metrics.inc('prepai_cache_hits_total', { tier: 'l1' });
    return local;
  }

  if (isRedisReady()) {
    const raw = await safeRedis((redis) => redis.get(fullKey(key)), null);
    if (raw !== null && raw !== undefined) {
      try {
        const parsed = JSON.parse(raw);
        stats.l2Hits++;
        metrics.inc('prepai_cache_hits_total', { tier: 'l2' });
        // Populate L1 with a bounded TTL (L2 remains the source of truth).
        l1.set(key, parsed.value, Math.min(parsed.ttl || 60, 300));
        return parsed.value;
      } catch {
        stats.redisErrors++;
      }
    }
  }

  stats.misses++;
  metrics.inc('prepai_cache_misses_total');
  return undefined;
}

/**
 * Set a value in both tiers.
 */
async function set(key, value, ttlSeconds) {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return;
  l1.set(key, value, Math.min(ttlSeconds, 300));
  if (isRedisReady()) {
    const payload = JSON.stringify({ value, ttl: ttlSeconds });
    await safeRedis((redis) => redis.set(fullKey(key), payload, 'EX', Math.max(1, Math.floor(ttlSeconds))), null);
  }
}

/**
 * Invalidate one or more keys.
 */
async function del(...keys) {
  keys.forEach((key) => l1.delete(key));
  if (isRedisReady() && keys.length > 0) {
    await safeRedis((redis) => redis.del(...keys.map(fullKey)), null);
  }
}

/**
 * Delete by key suffix/namespace using SCAN (never KEYS). Safe for hot paths
 * because it is only used by admin/config invalidation.
 */
async function invalidateNamespace(namespace) {
  for (const key of [...l1.store.keys()]) {
    if (key.startsWith(namespace)) l1.delete(key);
  }
  if (!isRedisReady()) return 0;

  return (
    (await safeRedis(async (redis) => {
      const match = `${fullKey(namespace)}*`;
      let cursor = '0';
      let deleted = 0;
      do {
        const [next, batch] = await redis.scan(cursor, 'MATCH', match, 'COUNT', 200);
        cursor = next;
        if (batch.length > 0) {
          deleted += await redis.del(...batch);
        }
      } while (cursor !== '0');
      return deleted;
    }, 0)) || 0
  );
}

/**
 * Read-through with request coalescing.
 *
 * @param {string} key
 * @param {number} ttlSeconds
 * @param {Function} producer async () => value
 */
async function getOrSet(key, ttlSeconds, producer) {
  const existing = await get(key);
  if (existing !== undefined) return existing;

  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const promise = (async () => {
    try {
      const value = await producer();
      if (value !== undefined && value !== null) {
        await set(key, value, ttlSeconds);
      }
      return value;
    } catch (err) {
      logger.warn('Cache producer failed; returning empty result', { key, error: err.message });
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

function getStats() {
  return {
    ...stats,
    l1Size: l1.store.size,
    inflight: inflight.size,
    redisReady: isRedisReady(),
  };
}

function clearLocal() {
  l1.clear();
}

module.exports = {
  get,
  set,
  del,
  invalidateNamespace,
  getOrSet,
  getStats,
  clearLocal,
};
