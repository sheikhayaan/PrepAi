const logger = require('../utils/logger');
const config = require('../config/env');
const incidentTracker = require('../utils/incidentTracker');

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const requestId = req.id || 'req_unknown';

  let userMessage = err.message || 'Internal Server Error';

  // Handle Mongoose CastError (e.g. invalid MongoDB ObjectId) as 400 Bad Request
  if (err.name === 'CastError') {
    statusCode = 400;
    userMessage = `Invalid format for resource identifier: '${err.value}'`;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    userMessage = Object.values(err.errors || {}).map((val) => val.message).join(', ');
  } else if (err.code === 11000) {
    statusCode = 409;
    userMessage = 'Duplicate field value entered.';
  } else if (config.isProduction && statusCode === 500) {
    userMessage = 'An unexpected error occurred. Please try again or contact support.';
  }

  // Record incident in real-time incident tracker
  incidentTracker.recordIncident({
    category: statusCode >= 500 ? 'API_5XX' : 'CLIENT_4XX',
    message: err.message || 'Unknown request error',
    severity: statusCode >= 500 ? 'high' : 'low',
    endpoint: req.originalUrl || '',
    method: req.method || '',
    statusCode,
    details: { name: err.name, requestId },
    autoMitigated: false,
  });

  logger.error(`Request error at ${req.method} ${req.originalUrl}`, {
    requestId,
    statusCode,
    message: err.message,
    name: err.name,
    stack: err.stack,
  });

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
