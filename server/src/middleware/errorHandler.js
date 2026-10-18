const logger = require('../utils/logger');
const config = require('../config/env');

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const requestId = req.id || 'req_unknown';

  logger.error(`Request error at ${req.method} ${req.originalUrl}`, {
    requestId,
    statusCode,
    message: err.message,
    stack: err.stack,
  });

  const userMessage =
    config.isProduction && statusCode === 500
      ? 'An unexpected error occurred. Please try again or contact support.'
      : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: userMessage,
    requestId,
    stack: config.isProduction ? undefined : err.stack,
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Resource not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFound };
