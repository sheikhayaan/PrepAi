/**
 * Global LLM concurrency budget shared across all web instances via Redis.
 *
 * The per-instance semaphore protects one event loop; this counter protects
 * the provider account (RPM/TPM ceilings) across the whole fleet.
 *
 * Failure mode is fail-open to the local semaphore: if Redis is unavailable,
 * the instance still cannot exceed its own concurrency cap.
 */
const config = require('../config/env');
const { safeRedis, decrFloorZero, isRedisReady } = require('../config/redis');
const metrics = require('../utils/metrics');

const KEY = `${config.redis.keyPrefix}:llm:global:active`;

const LUA_ACQUIRE = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local cap = tonumber(ARGV[1])
if current >= cap then
  return {0, current}
end
local next = redis.call('INCR', KEYS[1])
if next == 1 then
  redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[2]))
end
return {1, next}
`;

async function acquire() {
  if (!isRedisReady()) {
    return { acquired: true, mode: 'local' };
  }

  const result = await safeRedis(
    (redis) => redis.eval(LUA_ACQUIRE, 1, KEY, String(config.llm.globalConcurrency), String(config.llm.globalSlotTtlMs)),
    null
  );

  if (Array.isArray(result) && result.length === 2) {
    const acquired = Number(result[0]) === 1;
    if (!acquired) {
      metrics.inc('prepai_llm_global_budget_rejected_total');
    } else {
      metrics.setGauge('prepai_llm_global_active', {}, Number(result[1]));
    }
    return { acquired, mode: 'redis', active: Number(result[1]) };
  }

  // Redis failure: local semaphore remains the guardrail.
  return { acquired: true, mode: 'local-fallback' };
}

async function release() {
  if (!isRedisReady()) return;
  await decrFloorZero(KEY);
}

async function getActive() {
  if (!isRedisReady()) return null;
  return safeRedis((redis) => redis.get(KEY).then((v) => Number(v) || 0), null);
}

module.exports = {
  acquire,
  release,
  getActive,
  capacity: config.llm.globalConcurrency,
};
