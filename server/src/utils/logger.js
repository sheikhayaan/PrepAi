/**
 * Structured Logger for Production-Grade Observability
 * Sanitizes API keys, formats timestamps, and prevents accidental credential leaks
 */

const SENSITIVE_PATTERNS = [
  /sk-ant-[a-zA-Z0-9_-]+/gi,
  /bearer\s+[a-zA-Z0-9_\-\.]+/gi,
  /password\s*[:=]\s*["']?[^"'\s]+/gi,
];

function sanitize(message) {
  if (typeof message !== 'string') {
    try {
      message = JSON.stringify(message);
    } catch {
      message = String(message);
    }
  }
  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
  }
  return sanitized;
}

const logger = {
  info: (msg, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({ timestamp, level: 'INFO', message: sanitize(msg), ...meta }));
  },
  warn: (msg, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(JSON.stringify({ timestamp, level: 'WARN', message: sanitize(msg), ...meta }));
  },
  error: (msg, meta = {}) => {
    const timestamp = new Date().toISOString();
    const errorDetails = meta.error instanceof Error ? { errorMsg: meta.error.message, stack: meta.error.stack } : meta;
    console.error(JSON.stringify({ timestamp, level: 'ERROR', message: sanitize(msg), ...errorDetails }));
  },
};

module.exports = logger;
