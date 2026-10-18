/**
 * Telemetry & Slow Request Monitoring Middleware
 */
const tracker = require('../utils/telemetryTracker');
const logger = require('../utils/logger');

function telemetryMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    tracker.recordRequest(duration, res.statusCode);

    // Alert on slow operations (> 250ms for non-streaming endpoints)
    if (duration > 250 && !req.originalUrl.includes('/stream') && !req.originalUrl.includes('/answer')) {
      logger.warn('Slow API request detected', {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        durationMs: duration,
        status: res.statusCode,
      });
    }
  });

  next();
}

module.exports = telemetryMiddleware;
