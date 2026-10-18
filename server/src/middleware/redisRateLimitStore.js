/**
 * Distributed rate-limit store backed by Redis, with an in-process fallback.
 *
 * express-rate-limit calls increment() once per request. We use a single Lua
 * script so INCR + expiry are atomic across instances. If Redis is down the
 * store transparently falls back to a per-process Map (degraded, but the
 * limiter still protects the instance).
 */
const { safeRedis, isRedisReady } = require('../config/redis');
const config = require('../config/env');

const LUA_INCREMENT = `
local hits = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {hits, ttl}
`;

class RedisRateLimitStore {
  constructor(prefix = 'rl') {
    this.prefix = `${config.redis.keyPrefix}:${prefix}`;
    this.windowMs = 60 * 1000;
    this.memory = new Map();
    this.localKeys = false;
    this.cleanup = setInterval(() => this.sweep(), 60 * 1000);
    if (this.cleanup.unref) this.cleanup.unref();
  }

  init(options) {
    if (options && Number.isFinite(options.windowMs)) {
      this.windowMs = options.windowMs;
    }
  }

  #redisKey(key) {
    return `${this.prefix}:${key}`;
  }

  #memoryIncrement(key) {
    const now = Date.now();
    const existing = this.memory.get(key);
    if (!existing || existing.resetTime <= now) {
      const entry = { totalHits: 1, resetTime: now + this.windowMs };
      this.memory.set(key, entry);
      return { totalHits: entry.totalHits, resetTime: new Date(entry.resetTime) };
    }
    existing.totalHits += 1;
    return { totalHits: existing.totalHits, resetTime: new Date(existing.resetTime) };
  }

  async increment(key) {
    if (isRedisReady()) {
      const result = await safeRedis(
        (redis) => redis.eval(LUA_INCREMENT, 1, this.#redisKey(key), String(this.windowMs)),
        null
      );
      if (Array.isArray(result) && result.length === 2) {
        const hits = Number(result[0]);
        const ttl = Number(result[1]);
        return {
          totalHits: hits,
          resetTime: new Date(Date.now() + Math.max(0, ttl)),
        };
      }
    }
    return this.#memoryIncrement(key);
  }

  async decrement(key) {
    if (isRedisReady()) {
      await safeRedis(async (redis) => {
        const value = await redis.decr(this.#redisKey(key));
        if (value <= 0) await redis.del(this.#redisKey(key));
        return value;
      }, null);
    }
    const existing = this.memory.get(key);
    if (existing) {
      existing.totalHits = Math.max(0, existing.totalHits - 1);
      if (existing.totalHits === 0) this.memory.delete(key);
    }
  }

  async resetKey(key) {
    if (isRedisReady()) {
      await safeRedis((redis) => redis.del(this.#redisKey(key)), null);
    }
    this.memory.delete(key);
  }

  async get(key) {
    if (isRedisReady()) {
      const result = await safeRedis(
        (redis) => redis.multi().get(this.#redisKey(key)).pttl(this.#redisKey(key)).exec(),
        null
      );
      if (Array.isArray(result) && result[1] && result[1][1] > 0) {
        return {
          totalHits: Number(result[0][1]) || 0,
          resetTime: new Date(Date.now() + Number(result[1][1])),
        };
      }
    }
    const entry = this.memory.get(key);
    if (!entry || entry.resetTime <= Date.now()) return undefined;
    return { totalHits: entry.totalHits, resetTime: new Date(entry.resetTime) };
  }

  sweep() {
    const now = Date.now();
    for (const [key, entry] of this.memory) {
      if (entry.resetTime <= now) this.memory.delete(key);
    }
  }

  async shutdown() {
    clearInterval(this.cleanup);
    this.memory.clear();
  }
}

module.exports = RedisRateLimitStore;
