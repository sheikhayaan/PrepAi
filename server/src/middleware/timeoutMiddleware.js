/**
 * Route-Specific Timeout Middleware
 * Enforces differentiated timeouts with clean JSON error responses
 */
const config = require('../config/env');
const logger = require('../utils/logger');

function createTimeoutMiddleware(timeoutMs) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout exceeded', {
          requestId: req.id,
          method: req.method,
          url: req.originalUrl,
          timeoutMs,
        });

        res.status(504).json({
          error: 'Gateway Timeout: The server took too long to process this request.',
          requestId: req.id,
          code: 'REQUEST_TIMEOUT',
        });
      }
    }, timeoutMs);

    // Clear timer when response finishes
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}

module.exports = {
  standardApiTimeout: createTimeoutMiddleware(config.timeouts.standardApi),
  heavyQueryTimeout: createTimeoutMiddleware(config.timeouts.heavyQuery),
  fileUploadTimeout: createTimeoutMiddleware(config.timeouts.fileUpload),
  aiInferenceTimeout: createTimeoutMiddleware(config.timeouts.aiInference),
  customTimeout: createTimeoutMiddleware,
};
