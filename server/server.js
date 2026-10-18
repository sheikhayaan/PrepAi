const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
const crypto = require('crypto');

const config = require('./src/config/env');
const connectDB = require('./src/config/db');
const { connectRedis, closeRedis, redisHealth } = require('./src/config/redis');
const requestIdMiddleware = require('./src/middleware/requestIdMiddleware');
const telemetryMiddleware = require('./src/middleware/telemetryMiddleware');
const metricsMiddleware = require('./src/middleware/metricsMiddleware');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');
const { standardLimiter } = require('./src/middleware/rateLimiter');
const metrics = require('./src/utils/metrics');
const cache = require('./src/utils/cache');
const logger = require('./src/utils/logger');
const connectionRegistry = require('./src/sse/connectionRegistry');
const streamRegistry = require('./src/sse/streamRegistry');
const llmResilience = require('./src/services/llmResilience');
const tokenBudget = require('./src/services/tokenBudget');
const { isLlmEnabled } = require('./src/services/anthropicClient');
const learningScheduler = require('./src/learning/scheduler');

// Initialize Express application
const app = express();
app.disable('x-powered-by');

// Connect to Database with measured pool configuration
connectDB();

// Shared Redis is optional; all consumers degrade to per-process state.
connectRedis().catch(() => {});

// Behind an ALB / Render / Railway proxy we need the real client IP for rate
// limits and SSE per-IP caps. TRUST_PROXY_HOPS=0 disables it for bare metal.
if (config.server.trustProxyHops > 0) {
  app.set('trust proxy', config.server.trustProxyHops);
}

// 1. Trace ID generation for all incoming requests
app.use(requestIdMiddleware);

// 2. HTTP metrics (bounded labels) + sliding-window telemetry
app.use(metricsMiddleware);
app.use(telemetryMiddleware);

// 3. Security Headers (Helmet with Environment-Aware HSTS & CSP)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com'],
        frameSrc: ["'self'", 'https://accounts.google.com'],
        connectSrc: ["'self'", 'https://accounts.google.com', 'https://api.anthropic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        upgradeInsecureRequests: config.isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: config.isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false, // Do not enforce aggressive HSTS on localhost/dev
  })
);

// 4. Response Compression, explicitly disabled for SSE so tokens arrive
// immediately instead of being buffered by the gzip stream.
app.use(
  compression({
    filter: (req, res) => {
      const contentType = res.getHeader('Content-Type');
      if (contentType && String(contentType).includes('text/event-stream')) return false;
      return compression.filter(req, res);
    },
  })
);

// 5. Cross-Origin Resource Sharing
const allowedOrigins = [
  ...new Set(
    [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173']
      .flatMap((value) => String(value || '').split(','))
      .map((value) => value.trim())
      .filter(Boolean)
  ),
];

// In development, local tools (auto-PR previews, Vite fallback ports) can
// legitimately use any localhost port. Production stays strictly allowlisted.
const isDevLocalOrigin = (origin) => {
  if (config.nodeEnv === 'production') return false;
  try {
    const { hostname, protocol } = new URL(origin);
    return (
      (protocol === 'http:' || protocol === 'https:') &&
      ['localhost', '127.0.0.1', '::1'].includes(hostname)
    );
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin, curl, and server-to-server requests have no Origin.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || isDevLocalOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'Last-Event-ID',
      'X-SSE-Reconnect',
    ],
    exposedHeaders: ['X-Request-Id', 'X-SSE-Stream-Id', 'Retry-After'],
  })
);

// 6. Request Body Parsing with Payload Limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// 7. NoSQL Query Injection Sanitizer
app.use(mongoSanitize({ replaceWith: '_' }));

function safeTokenEquals(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// 8. Health, Readiness & Metrics Endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: Math.floor(process.uptime()), requestId: req.id });
});

app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'live', timestamp: new Date().toISOString(), requestId: req.id });
});

app.get('/health/ready', async (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  const redis = redisHealth();
  const memory = process.memoryUsage();
  const payload = {
    status: dbReady ? 'ready' : 'not_ready',
    checks: {
      mongodb: dbReady ? 'connected' : 'disconnected',
      // Redis is a performance/coordination dependency, not a hard readiness
      // gate: the API deliberately degrades to per-process state.
      redis: redis.ready ? 'connected' : redis.enabled ? 'degraded' : 'disabled',
      llm: isLlmEnabled() ? 'enabled' : 'simulation',
    },
    sse: connectionRegistry.getConnectionStats(),
    llmQueue: llmResilience.llmLimiter.stats(),
    tokenBudget: tokenBudget.getCaps(),
    cache: cache.getStats(),
    heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
    rssMb: Math.round(memory.rss / 1024 / 1024),
    uptimeSeconds: Math.floor(process.uptime()),
    requestId: req.id,
  };

  res.status(dbReady ? 200 : 503).json(payload);
});

app.get('/metrics', (req, res) => {
  if (!config.metrics.enabled) return res.status(404).end();

  // In production a token is mandatory; otherwise metrics stay private.
  if (config.metrics.token) {
    const auth = req.headers.authorization || '';
    const provided = auth.startsWith('Bearer ') ? auth.slice(7) : req.query.token;
    if (!safeTokenEquals(provided, config.metrics.token)) return res.status(404).end();
  } else if (config.isProduction) {
    return res.status(404).end();
  }

  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(200).send(metrics.render());
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'PrepAI Enterprise API Server',
    environment: config.env,
    timestamp: new Date().toISOString(),
    requestId: req.id,
  });
});

// 9. API Routes Mounting
// A coarse per-IP ceiling protects every route; endpoint-specific limiters add
// tighter buckets for auth, interview starts/answers and admin actions.
app.use('/api', standardLimiter);
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/interviews', require('./src/routes/interviewRoutes'));
app.use('/api/analytics', require('./src/routes/analyticsRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/ratings', require('./src/routes/ratingRoutes'));

// 10. Centralized Error Handlers
app.use(notFound);
app.use(errorHandler);

// Start Server Listening
const server = app.listen(config.port, () => {
  console.log('=========================================');
  console.log(`🚀 PrepAI Enterprise Server running on port ${config.port}`);
  console.log(`🌐 Allowed Client URL(s): ${allowedOrigins.join(', ')}`);
  console.log(`🛡️  Environment: ${config.env.toUpperCase()}`);
  console.log(`⚡ DB Pool: ${config.mongo.minPoolSize} - ${config.mongo.maxPoolSize} connections`);
  console.log(
    `🤖 LLM: ${isLlmEnabled() ? 'live' : 'simulation'} | per-instance ${config.llm.concurrencyPerInstance} | global ${config.llm.globalConcurrency}`
  );
  console.log('=========================================');
  learningScheduler.start();
});

// Connection & Header Timeouts. Keep-alive must exceed the LB idle timeout;
// SSE streams are response-side and are not bounded by requestTimeout.
server.headersTimeout = config.server.headersTimeoutMs;
server.requestTimeout = config.server.requestTimeoutMs;
server.keepAliveTimeout = config.server.keepAliveTimeoutMs;
server.timeout = 0;

let shuttingDown = false;

async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal}. Draining and shutting down...`);

  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown due to lingering connections.');
    process.exit(1);
  }, config.server.gracefulShutdownMs);
  if (forceExit.unref) forceExit.unref();

  // Stop accepting new connections immediately.
  const closed = new Promise((resolve) => server.close(resolve));
  server.closeIdleConnections?.();

  try {
    // Tell SSE clients to reconnect (they resume with Last-Event-ID), then end
    // the sockets so server.close() can resolve.
    learningScheduler.stop();
    await connectionRegistry.drainAll(config.server.sseDrainMs);
    streamRegistry.closeAll();
    await llmResilience.drainQueue();

    // BullMQ is optional and may never have been initialized.
    try {
      const { worker, scoringQueue, redisClient } = require('./src/jobs/scoringQueue');
      if (worker) await worker.close();
      if (scoringQueue) await scoringQueue.close();
      if (redisClient) redisClient.disconnect();
    } catch (err) {
      logger.warn('BullMQ shutdown notice', { error: err.message });
    }

    await closeRedis();
    await mongoose.connection.close(false);
    await closed;
    logger.info('Graceful shutdown complete.');
    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown', { error: err.message });
    clearTimeout(forceExit);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection', { error: err.message, stack: err.stack });
});

module.exports = { app, server };
