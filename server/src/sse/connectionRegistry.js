/**
 * SSE connection registry.
 *
 * Enforces per-user and per-IP concurrent stream limits (Redis-backed across
 * the fleet, local fallback), tracks live responses for graceful shutdown, and
 * keeps a bounded local view for diagnostics.
 */
const crypto = require('crypto');
const config = require('../config/env');
const { safeRedis, isRedisReady } = require('../config/redis');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');

const localUserCounts = new Map();
const localIpCounts = new Map();
const liveResponses = new Set();
let draining = false;

function userKey(userId) {
  return `${config.redis.keyPrefix}:sse:user:${userId}`;
}

function ipKey(ip) {
  return `${config.redis.keyPrefix}:sse:ip:${ip}`;
}

function bumpLocal(map, key, delta) {
  const next = Math.max(0, (map.get(key) || 0) + delta);
  if (next === 0) map.delete(key);
  else map.set(key, next);
  return next;
}

/**
 * Register an SSE connection against user/IP limits.
 * @returns {Promise<{allowed:boolean, connectionId?:string, reason?:string}>}
 */
async function register({ userId, ip, res }) {
  if (draining) {
    return { allowed: false, reason: 'server_draining' };
  }

  const connectionId = `${process.pid}-${crypto.randomBytes(8).toString('hex')}`;
  const ipValue = ip || 'unknown';
  const userValue = userId ? String(userId) : null;

  // Local pre-check keeps a single instance honest even if Redis is flaky.
  const localUser = userValue ? localUserCounts.get(userValue) || 0 : 0;
  const localIp = localIpCounts.get(ipValue) || 0;
  if (userValue && localUser >= config.sse.maxPerUser) {
    metrics.inc('prepai_sse_limit_rejected_total', { scope: 'user' });
    return { allowed: false, reason: 'user_connection_limit' };
  }
  if (localIp >= config.sse.maxPerIp) {
    metrics.inc('prepai_sse_limit_rejected_total', { scope: 'ip' });
    return { allowed: false, reason: 'ip_connection_limit' };
  }

  if (isRedisReady()) {
    if (userValue) {
      const count = await safeRedis(async (redis) => {
        const key = userKey(userValue);
        await redis.sadd(key, connectionId);
        await redis.expire(key, config.sse.registryTtlSeconds);
        return redis.scard(key);
      }, null);
      if (count !== null && count > config.sse.maxPerUser) {
        await safeRedis((redis) => redis.srem(userKey(userValue), connectionId), null);
        metrics.inc('prepai_sse_limit_rejected_total', { scope: 'user' });
        return { allowed: false, reason: 'user_connection_limit' };
      }
    }

    const ipCount = await safeRedis(async (redis) => {
      const key = ipKey(ipValue);
      await redis.sadd(key, connectionId);
      await redis.expire(key, config.sse.registryTtlSeconds);
      return redis.scard(key);
    }, null);
    if (ipCount !== null && ipCount > config.sse.maxPerIp) {
      await safeRedis((redis) => redis.srem(ipKey(ipValue), connectionId), null);
      if (userValue) {
        await safeRedis((redis) => redis.srem(userKey(userValue), connectionId), null);
      }
      metrics.inc('prepai_sse_limit_rejected_total', { scope: 'ip' });
      return { allowed: false, reason: 'ip_connection_limit' };
    }
  }

  if (userValue) bumpLocal(localUserCounts, userValue, 1);
  bumpLocal(localIpCounts, ipValue, 1);
  if (res) liveResponses.add(res);
  metrics.addGauge('prepai_sse_active_connections', {}, 1);

  return { allowed: true, connectionId };
}

async function unregister({ connectionId, userId, ip, res }) {
  const ipValue = ip || 'unknown';
  const userValue = userId ? String(userId) : null;

  if (userValue) bumpLocal(localUserCounts, userValue, -1);
  bumpLocal(localIpCounts, ipValue, -1);
  if (res && liveResponses.delete(res)) {
    metrics.addGauge('prepai_sse_active_connections', {}, -1);
  }

  if (!connectionId || !isRedisReady()) return;
  await safeRedis(async (redis) => {
    if (userValue) await redis.srem(userKey(userValue), connectionId);
    await redis.srem(ipKey(ipValue), connectionId);
    return 1;
  }, null);
}

/**
 * Notify all live streams that the process is restarting, then end them after
 * a short grace period so browsers reconnect cleanly with Last-Event-ID.
 */
async function drainAll(timeoutMs = config.server.sseDrainMs) {
  draining = true;
  const responses = [...liveResponses];
  if (responses.length === 0) return 0;

  const frame = `event: shutdown\ndata: ${JSON.stringify({
    type: 'shutdown',
    reason: 'server_restart',
    reconnectAfterMs: config.sse.reconnectHintMs,
  })}\n\n`;

  responses.forEach((res) => {
    try {
      if (!res.writableEnded) res.write(frame);
      if (typeof res.flush === 'function') res.flush();
    } catch {
      // ignore dead sockets
    }
  });

  await new Promise((resolve) => {
    const timer = setTimeout(resolve, Math.min(2000, Math.max(250, timeoutMs / 3)));
    if (timer.unref) timer.unref();
  });

  responses.forEach((res) => {
    try {
      if (!res.writableEnded) res.end();
    } catch {
      // ignore
    }
  });
  liveResponses.clear();
  metrics.setGauge('prepai_sse_active_connections', {}, 0);
  logger.info('Drained active SSE connections for shutdown', { count: responses.length });
  return responses.length;
}

function isDraining() {
  return draining;
}

function getConnectionStats() {
  return {
    live: liveResponses.size,
    users: localUserCounts.size,
    ips: localIpCounts.size,
    draining,
    maxPerUser: config.sse.maxPerUser,
    maxPerIp: config.sse.maxPerIp,
    redisTracked: isRedisReady(),
  };
}

function resetDrainingForTests() {
  draining = false;
}

module.exports = {
  register,
  unregister,
  drainAll,
  isDraining,
  getConnectionStats,
  resetDrainingForTests,
};
