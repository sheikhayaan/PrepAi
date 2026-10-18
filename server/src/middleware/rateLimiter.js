const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const config = require('../config/env');
const RedisRateLimitStore = require('./redisRateLimitStore');

function buildLimiter({ prefix, windowMs, max, message, code, keyGenerator }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisRateLimitStore(prefix),
    ...(keyGenerator ? { keyGenerator } : {}),
    message: {
      error: message,
      code,
    },
  });
}

const standardLimiter = buildLimiter({
  prefix: 'standard',
  windowMs: config.rateLimits.standard.windowMs,
  max: config.rateLimits.standard.max,
  message: 'Too many requests from this IP. Please try again later.',
  code: 'RATE_LIMIT_EXCEEDED',
});

const authLimiter = buildLimiter({
  prefix: 'auth',
  windowMs: config.rateLimits.auth.windowMs,
  max: config.rateLimits.auth.max,
  message: 'Too many authentication attempts from this IP. Please try again later.',
  code: 'AUTH_RATE_LIMIT_EXCEEDED',
});

const interviewStartLimiter = buildLimiter({
  prefix: 'start',
  windowMs: config.rateLimits.interviewStart.windowMs,
  max: config.rateLimits.interviewStart.max,
  message: 'Too many interview sessions started. Please pace your sessions.',
  code: 'INTERVIEW_START_RATE_LIMIT_EXCEEDED',
});

const interviewAnswerLimiter = buildLimiter({
  prefix: 'answer',
  windowMs: config.rateLimits.interviewAnswer.windowMs,
  max: config.rateLimits.interviewAnswer.max,
  message:
    'Rate limit exceeded for answers. Please take a moment before submitting your next response.',
  code: 'ANSWER_RATE_LIMIT_EXCEEDED',
});

// Admin endpoints are high-value: use a dedicated bucket keyed by admin user
// (falling back to IP) so they never consume the standard user budget.
const adminLimiter = buildLimiter({
  prefix: 'admin',
  windowMs: config.rateLimits.admin.windowMs,
  max: config.rateLimits.admin.max,
  message: 'Admin rate limit exceeded. Please slow down.',
  code: 'ADMIN_RATE_LIMIT_EXCEEDED',
  keyGenerator: (req) =>
    req.user?._id ? `admin:${req.user._id.toString()}` : `admin-ip:${ipKeyGenerator(req.ip)}`,
});

module.exports = {
  standardLimiter,
  authLimiter,
  interviewStartLimiter,
  interviewAnswerLimiter,
  adminLimiter,
};
