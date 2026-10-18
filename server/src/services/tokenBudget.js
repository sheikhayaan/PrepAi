/**
 * Per-user daily and per-session token budgets.
 *
 * Redis is the source of truth when available (atomic Lua reservation). When
 * Redis is unavailable, an in-process map enforces the same caps for this
 * instance so cost control never silently disappears.
 */
const config = require('../config/env');
const { safeRedis, isRedisReady } = require('../config/redis');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');

const localDaily = new Map();
const localSession = new Map();

const LUA_RESERVE = `
local daily = tonumber(redis.call('GET', KEYS[1]) or '0')
local session = tonumber(redis.call('GET', KEYS[2]) or '0')
local amount = tonumber(ARGV[1])
local dailyCap = tonumber(ARGV[2])
local sessionCap = tonumber(ARGV[3])
if (daily + amount) > dailyCap or (session + amount) > sessionCap then
  return {0, daily, session}
end
redis.call('INCRBY', KEYS[1], amount)
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[4]))
redis.call('INCRBY', KEYS[2], amount)
redis.call('EXPIRE', KEYS[2], tonumber(ARGV[5]))
return {1, daily + amount, session + amount}
`;

const LUA_SETTLE = `
local delta = tonumber(ARGV[1])
for i = 1, 2 do
  local v = tonumber(redis.call('GET', KEYS[i]) or '0')
  v = v + delta
  if v < 0 then v = 0 end
  redis.call('SET', KEYS[i], v, 'KEEPTTL')
end
return 1
`;

function dayKey(userId) {
  const day = new Date().toISOString().slice(0, 10);
  return `${config.redis.keyPrefix}:tokens:user:${userId}:${day}`;
}

function sessionKey(sessionId) {
  return `${config.redis.keyPrefix}:tokens:session:${sessionId}`;
}

function localReserve(userId, sessionId, amount) {
  const dk = dayKey(userId);
  const sk = sessionKey(sessionId);
  const daily = localDaily.get(dk) || 0;
  const session = localSession.get(sk) || 0;
  if (daily + amount > config.llm.dailyTokensPerUser || session + amount > config.llm.sessionTokensPerSession) {
    return { allowed: false, reason: 'token_budget_exceeded', daily, session };
  }
  localDaily.set(dk, daily + amount);
  localSession.set(sk, session + amount);
  return { allowed: true, daily: daily + amount, session: session + amount };
}

/**
 * Reserve an estimated token amount before an LLM call.
 */
async function reserve({ userId, sessionId, tokens }) {
  if (!config.llm.tokenBudgetEnabled) {
    return { allowed: true, disabled: true };
  }

  const amount = Math.max(1, Math.ceil(Number(tokens) || 0));
  if (!userId) {
    // Unauthenticated internal calls are still bounded per-session.
    if (!sessionId) return { allowed: true, anonymous: true };
  }

  if (isRedisReady()) {
    const result = await safeRedis(
      (redis) =>
        redis.eval(
          LUA_RESERVE,
          2,
          dayKey(userId || 'anonymous'),
          sessionKey(sessionId || 'anonymous'),
          String(amount),
          String(config.llm.dailyTokensPerUser),
          String(config.llm.sessionTokensPerSession),
          String(26 * 60 * 60),
          String(6 * 60 * 60)
        ),
      null
    );

    if (Array.isArray(result) && result.length === 3) {
      const allowed = Number(result[0]) === 1;
      if (!allowed) {
        metrics.inc('prepai_token_budget_denied_total', { scope: 'redis' });
        logger.warn('LLM token budget exceeded; falling back to simulation', {
          userId: String(userId || 'anonymous'),
          sessionId: String(sessionId || 'anonymous'),
          daily: Number(result[1]),
          session: Number(result[2]),
        });
      }
      return {
        allowed,
        reason: allowed ? null : 'token_budget_exceeded',
        daily: Number(result[1]),
        session: Number(result[2]),
      };
    }
  }

  const fallback = localReserve(userId || 'anonymous', sessionId || 'anonymous', amount);
  if (!fallback.allowed) {
    metrics.inc('prepai_token_budget_denied_total', { scope: 'local' });
    logger.warn('LLM token budget exceeded (local fallback); using simulation', {
      userId: String(userId || 'anonymous'),
      sessionId: String(sessionId || 'anonymous'),
      daily: fallback.daily,
      session: fallback.session,
    });
  }
  return fallback;
}

/**
 * Reconcile a reservation with actual usage.
 * @param {number} reserved tokens reserved before the call
 * @param {number} actual tokens actually consumed
 */
async function settle({ userId, sessionId, reserved, actual }) {
  if (!config.llm.tokenBudgetEnabled) return;
  const delta = Math.floor(Number(actual) || 0) - Math.floor(Number(reserved) || 0);
  if (delta === 0) return;

  if (isRedisReady()) {
    await safeRedis(
      (redis) => redis.eval(LUA_SETTLE, 2, dayKey(userId || 'anonymous'), sessionKey(sessionId || 'anonymous'), String(delta)),
      null
    );
    return;
  }

  const dk = dayKey(userId || 'anonymous');
  const sk = sessionKey(sessionId || 'anonymous');
  localDaily.set(dk, Math.max(0, (localDaily.get(dk) || 0) + delta));
  localSession.set(sk, Math.max(0, (localSession.get(sk) || 0) + delta));
}

function getCaps() {
  return {
    enabled: config.llm.tokenBudgetEnabled,
    dailyTokensPerUser: config.llm.dailyTokensPerUser,
    sessionTokensPerSession: config.llm.sessionTokensPerSession,
  };
}

function _resetLocalForTests() {
  localDaily.clear();
  localSession.clear();
}

module.exports = {
  reserve,
  settle,
  getCaps,
  _resetLocalForTests,
};
