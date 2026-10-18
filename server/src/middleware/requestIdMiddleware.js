/**
 * Request ID Middleware
 * Assigns a unique trace ID to each request and sets the X-Request-Id response header
 */
const crypto = require('crypto');

function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  const isValidIncoming = incomingId && typeof incomingId === 'string' && /^[a-zA-Z0-9_-]{4,64}$/.test(incomingId);

  const requestId = isValidIncoming ? incomingId : `req_${crypto.randomUUID().slice(0, 8)}`;
  
  req.id = requestId;
  req.startTime = Date.now();
  res.setHeader('X-Request-Id', requestId);
  next();
}

module.exports = requestIdMiddleware;
