/**
 * SSE transport helpers: headers, Last-Event-ID parsing, flushing.
 */
const config = require('../config/env');

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // Nginx / ingress: disable response buffering for streamed routes.
  'X-Accel-Buffering': 'no',
};

function prepareSse(req, res) {
  res.status(200);
  Object.entries(SSE_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  // CORS-exposed header so browser clients can persist the resume cursor.
  if (!res.getHeader('Access-Control-Expose-Headers')) {
    res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id, X-SSE-Stream-Id');
  }
  res.flushHeaders?.();
  return res;
}

/**
 * Accepts the standard Last-Event-ID header (EventSource) or a query param
 * (fetch-based clients that reconnect manually).
 */
function getLastEventId(req) {
  const header = req.headers['last-event-id'];
  const query = req.query?.lastEventId;
  const raw = header !== undefined ? header : query;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function isReconnect(req) {
  return getLastEventId(req) > 0 || req.headers['x-sse-reconnect'] === '1';
}

function rejectStream(res, { status = 429, error, code }) {
  res.status(status).json({ error, code });
}

function suggestReconnectMs() {
  return config.sse.reconnectHintMs;
}

module.exports = {
  SSE_HEADERS,
  prepareSse,
  getLastEventId,
  getClientIp,
  isReconnect,
  rejectStream,
  suggestReconnectMs,
};
