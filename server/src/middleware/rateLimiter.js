const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
});

const interviewStartLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15, // 15 interview starts per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many interview sessions started. Please pace your sessions.',
    code: 'INTERVIEW_START_RATE_LIMIT_EXCEEDED',
  },
});

const interviewAnswerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 40, // 40 answer submissions per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Rate limit exceeded for answers. Please take a moment before submitting your next response.',
    code: 'ANSWER_RATE_LIMIT_EXCEEDED',
  },
});

module.exports = {
  authLimiter,
  interviewStartLimiter,
  interviewAnswerLimiter,
};
