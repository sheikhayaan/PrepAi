/**
 * Environment Configuration & Validator
 * Enforces production secrets and safe development defaults.
 *
 * All values are validated / clamped so a bad environment variable cannot
 * silently disable a safety control (e.g. a negative pool size or a zero
 * concurrency budget).
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

function intEnv(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function boolEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase());
}

function strEnv(name, fallback = '') {
  const raw = process.env[name];
  return raw === undefined || raw === null ? fallback : String(raw).trim();
}

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction,
  isTest: process.env.NODE_ENV === 'test',
  port: intEnv('PORT', 5000, { min: 1, max: 65535 }),
  clientUrl: strEnv('CLIENT_URL', 'http://localhost:5173'),

  server: {
    // Number of trusted proxy hops. Required for correct client IPs behind an
    // ALB / Render / Railway load balancer (rate limits and SSE per-IP caps).
    trustProxyHops: intEnv('TRUST_PROXY_HOPS', isProduction ? 1 : 0, { min: 0, max: 10 }),
    requestTimeoutMs: intEnv('REQUEST_TIMEOUT_MS', 120000, { min: 1000 }),
    headersTimeoutMs: intEnv('HEADERS_TIMEOUT_MS', 65000, { min: 1000 }),
    keepAliveTimeoutMs: intEnv('KEEPALIVE_TIMEOUT_MS', 65000, { min: 1000 }),
    gracefulShutdownMs: intEnv('GRACEFUL_SHUTDOWN_MS', 15000, { min: 1000 }),
    sseDrainMs: intEnv('SSE_DRAIN_MS', 8000, { min: 500 }),
  },

  mongo: {
    uri: strEnv('MONGO_URI', 'mongodb://127.0.0.1:27017/prepai'),
    // Pool sizing is per Node process. 4 instances x 75 = 300 total, which is
    // inside the Atlas M30+ connection budget. Dev stays small.
    minPoolSize: intEnv('MONGO_MIN_POOL_SIZE', isProduction ? 10 : 5, { min: 0, max: 500 }),
    maxPoolSize: intEnv('MONGO_MAX_POOL_SIZE', isProduction ? 75 : 25, { min: 1, max: 500 }),
    serverSelectionTimeoutMS: intEnv('MONGO_SERVER_SELECTION_TIMEOUT_MS', 5000, { min: 500 }),
    socketTimeoutMS: intEnv('MONGO_SOCKET_TIMEOUT_MS', 45000, { min: 1000 }),
    maxIdleTimeMS: intEnv('MONGO_MAX_IDLE_TIME_MS', 60000, { min: 1000 }),
    // Route-level read preference is applied explicitly via `.read('secondaryPreferred')`.
    secondaryReads: boolEnv('MONGO_SECONDARY_READS', isProduction),
  },

  redis: {
    url: strEnv('REDIS_URL', 'redis://127.0.0.1:6379'),
    enabled: Boolean(strEnv('REDIS_URL') && !boolEnv('REDIS_DISABLED', false)),
    keyPrefix: strEnv('REDIS_KEY_PREFIX', 'prepai'),
    connectTimeoutMs: intEnv('REDIS_CONNECT_TIMEOUT_MS', 3000, { min: 250 }),
    maxRetries: intEnv('REDIS_MAX_RETRIES', 3, { min: 0, max: 20 }),
  },

  jwt: {
    secret: strEnv('JWT_SECRET', 'prepai_super_secret_jwt_key_2026_production_ready'),
    expiresIn: strEnv('JWT_EXPIRES_IN', '7d'),
    issuer: 'prepai-api',
    audience: 'prepai-client',
  },

  anthropic: {
    apiKey: strEnv('ANTHROPIC_API_KEY'),
    model: strEnv('ANTHROPIC_MODEL', 'claude-3-5-sonnet-20241022'),
  },

  timeouts: {
    standardApi: intEnv('TIMEOUT_STANDARD_API_MS', 5000, { min: 500 }),
    heavyQuery: intEnv('TIMEOUT_HEAVY_QUERY_MS', 10000, { min: 500 }),
    fileUpload: intEnv('TIMEOUT_FILE_UPLOAD_MS', 15000, { min: 500 }),
    aiInference: intEnv('TIMEOUT_AI_INFERENCE_MS', 30000, { min: 5000 }),
    externalService: intEnv('TIMEOUT_EXTERNAL_SERVICE_MS', 6000, { min: 500 }),
  },

  rateLimits: {
    standard: {
      windowMs: intEnv('RATE_LIMIT_STANDARD_WINDOW_MS', 15 * 60 * 1000, { min: 1000 }),
      max: intEnv('RATE_LIMIT_STANDARD_MAX', 300, { min: 1 }),
    },
    auth: {
      windowMs: intEnv('RATE_LIMIT_AUTH_WINDOW_MS', 15 * 60 * 1000, { min: 1000 }),
      max: intEnv('RATE_LIMIT_AUTH_MAX', 20, { min: 1 }),
    },
    interviewStart: {
      windowMs: intEnv('RATE_LIMIT_START_WINDOW_MS', 10 * 60 * 1000, { min: 1000 }),
      max: intEnv('RATE_LIMIT_START_MAX', 15, { min: 1 }),
    },
    interviewAnswer: {
      windowMs: intEnv('RATE_LIMIT_ANSWER_WINDOW_MS', 5 * 60 * 1000, { min: 1000 }),
      max: intEnv('RATE_LIMIT_ANSWER_MAX', 40, { min: 1 }),
    },
    adminExport: { windowMs: 60 * 60 * 1000, max: 5 },
    // Admin endpoints get a stricter, isolated bucket so a compromise or a
    // runaway admin client cannot consume the standard user budget.
    admin: {
      windowMs: intEnv('RATE_LIMIT_ADMIN_WINDOW_MS', 60 * 1000, { min: 1000 }),
      max: intEnv('RATE_LIMIT_ADMIN_MAX', 120, { min: 1 }),
    },
  },

  security: {
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    progressiveDelayMultiplier: 1000,
    saltRounds: 12,
    maxAnswerLength: intEnv('MAX_ANSWER_LENGTH', 4000, { min: 200, max: 20000 }),
    auditHotRetentionDays: intEnv('AUDIT_HOT_RETENTION_DAYS', 90, { min: 1, max: 3650 }),
  },

  email: {
    // Console is a deliberate dev fallback: it logs the action link instead of
    // sending mail. Production should use resend/sendgrid/webhook.
    provider: strEnv('EMAIL_PROVIDER', 'console').toLowerCase(),
    apiKey: strEnv('EMAIL_API_KEY'),
    from: strEnv('EMAIL_FROM', 'PrepAI <no-reply@prepai.local>'),
    replyTo: strEnv('EMAIL_REPLY_TO'),
    webhookUrl: strEnv('EMAIL_WEBHOOK_URL'),
    appUrl: strEnv('APP_PUBLIC_URL', strEnv('CLIENT_URL', 'http://localhost:5200').split(',')[0].trim()),
    timeoutMs: intEnv('EMAIL_TIMEOUT_MS', 6000, { min: 500, max: 30000 }),
  },

  llm: {
    // ---- Streaming / provider resilience -------------------------------
    concurrencyPerInstance: intEnv('LLM_CONCURRENCY_PER_INSTANCE', 50, { min: 1, max: 1000 }),
    queueMax: intEnv('LLM_QUEUE_MAX', 200, { min: 1, max: 10000 }),
    queueTimeoutMs: intEnv('LLM_QUEUE_TIMEOUT_MS', 15000, { min: 500 }),
    globalConcurrency: intEnv('LLM_GLOBAL_CONCURRENCY', 200, { min: 1, max: 10000 }),
    globalSlotTtlMs: intEnv('LLM_GLOBAL_SLOT_TTL_MS', 120000, { min: 10000 }),
    maxRetries: intEnv('LLM_MAX_RETRIES', 3, { min: 0, max: 8 }),
    retryBaseDelayMs: intEnv('LLM_RETRY_BASE_DELAY_MS', 400, { min: 50, max: 10000 }),
    retryMaxDelayMs: intEnv('LLM_RETRY_MAX_DELAY_MS', 8000, { min: 100, max: 60000 }),
    retryJitter: boolEnv('LLM_RETRY_JITTER', true),
    promptCaching: boolEnv('LLM_PROMPT_CACHING', true),
    fallbackEnabled: boolEnv('LLM_FALLBACK_ENABLED', true),
    openingTimeoutMs: intEnv('LLM_OPENING_TIMEOUT_MS', 3000, { min: 500, max: 30000 }),
    streamIdleTimeoutMs: intEnv('LLM_STREAM_IDLE_TIMEOUT_MS', 30000, { min: 5000, max: 300000 }),
    // ---- Token / cost budgets ------------------------------------------
    tokenBudgetEnabled: boolEnv('LLM_TOKEN_BUDGET_ENABLED', true),
    dailyTokensPerUser: intEnv('LLM_DAILY_TOKENS_PER_USER', 120000, { min: 1000 }),
    sessionTokensPerSession: intEnv('LLM_SESSION_TOKENS', 30000, { min: 1000 }),
    // Budget reservation sizes (conservative) used before a call is made.
    reserveOpeningTokens: intEnv('LLM_RESERVE_OPENING_TOKENS', 700, { min: 50 }),
    reserveTurnTokens: intEnv('LLM_RESERVE_TURN_TOKENS', 1200, { min: 50 }),
    reserveFinalScoreTokens: intEnv('LLM_RESERVE_FINAL_TOKENS', 2500, { min: 50 }),
  },

  sse: {
    heartbeatMs: intEnv('SSE_HEARTBEAT_MS', 15000, { min: 2000, max: 60000 }),
    maxPerUser: intEnv('SSE_MAX_PER_USER', 2, { min: 1, max: 100 }),
    maxPerIp: intEnv('SSE_MAX_PER_IP', 10, { min: 1, max: 1000 }),
    registryTtlSeconds: intEnv('SSE_REGISTRY_TTL_SECONDS', 3600, { min: 60 }),
    // Time in which a reconnecting client attaches to an existing generation
    // instead of paying for a brand-new LLM stream.
    dedupWindowMs: intEnv('SSE_DEDUP_WINDOW_MS', 12000, { min: 0, max: 120000 }),
    maxBufferedEvents: intEnv('SSE_MAX_BUFFERED_EVENTS', 2000, { min: 10, max: 20000 }),
    reconnectHintMs: intEnv('SSE_RECONNECT_HINT_MS', 1500, { min: 100 }),
  },

  metrics: {
    enabled: boolEnv('METRICS_ENABLED', true),
    // In production a token is required so /metrics is not publicly scrapable.
    token: strEnv('METRICS_TOKEN'),
  },

  learning: {
    // Bounded learning loops run off the request path. Disabled by default in
    // development/test so local runs stay deterministic; enable in production.
    enabled: boolEnv('LEARNING_LOOPS_ENABLED', isProduction),
    selectionEnabled: boolEnv('ADAPTIVE_SELECTION_ENABLED', false),
    calibrationIntervalMs: intEnv('LEARNING_CALIBRATION_INTERVAL_MS', 6 * 60 * 60 * 1000, { min: 60000 }),
    aggregateIntervalMs: intEnv('LEARNING_AGGREGATE_INTERVAL_MS', 60 * 60 * 1000, { min: 60000 }),
    minAttemptsForDifficulty: intEnv('LEARNING_MIN_ATTEMPTS', 30, { min: 5 }),
    minDiscrimination: Number(process.env.LEARNING_MIN_DISCRIMINATION || 0.2),
    exposureCapShare: Number(process.env.LEARNING_EXPOSURE_CAP_SHARE || 0.15),
    explorationEpsilon: Number(process.env.LEARNING_EXPLORATION_EPSILON || 0.1),
    abilityKFactor: intEnv('LEARNING_ABILITY_K', 24, { min: 1, max: 200 }),
    anomalyZScore: Number(process.env.LEARNING_ANOMALY_Z || 2),
    goldenSetMinSamples: intEnv('LEARNING_GOLDEN_MIN_SAMPLES', 30, { min: 5 }),
    versionCacheSeconds: intEnv('LEARNING_VERSION_CACHE_SECONDS', 3600, { min: 60 }),
  },
};

function validateEnv() {
  const errors = [];
  const warnings = [];

  if (isProduction) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      errors.push('CRITICAL: JWT_SECRET must be at least 32 characters long in production.');
    }
    if (!process.env.MONGO_URI) {
      errors.push('CRITICAL: MONGO_URI must be explicitly set in production.');
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      warnings.push('ANTHROPIC_API_KEY is not set; the platform will run in fallback simulation mode.');
    }
    if (!process.env.REDIS_URL) {
      warnings.push('REDIS_URL is not set; distributed rate limits, caching and budgets fall back to per-process memory.');
    }
    if (config.mongo.maxPoolSize < config.mongo.minPoolSize) {
      errors.push('CRITICAL: MONGO_MAX_POOL_SIZE must be >= MONGO_MIN_POOL_SIZE.');
    }
  }

  const emailProvider = config.email.provider;
  if (!['console', 'resend', 'sendgrid', 'webhook'].includes(emailProvider)) {
    errors.push(`CRITICAL: EMAIL_PROVIDER "${emailProvider}" is not supported (use console, resend, sendgrid or webhook).`);
  }
  if (emailProvider === 'console' && isProduction) {
    warnings.push('EMAIL_PROVIDER=console in production: verification and reset links will only be logged, never delivered.');
  }
  if (['resend', 'sendgrid'].includes(emailProvider) && !config.email.apiKey) {
    const msg = `EMAIL_API_KEY is required when EMAIL_PROVIDER=${emailProvider}.`;
    if (isProduction) errors.push(`CRITICAL: ${msg}`); else warnings.push(msg);
  }
  if (emailProvider === 'webhook' && !config.email.webhookUrl) {
    const msg = 'EMAIL_WEBHOOK_URL is required when EMAIL_PROVIDER=webhook.';
    if (isProduction) errors.push(`CRITICAL: ${msg}`); else warnings.push(msg);
  }
  if (isProduction && !config.email.appUrl.startsWith('https://')) {
    warnings.push('APP_PUBLIC_URL is not HTTPS; verification and reset links will be rejected by some mail clients.');
  }

  if (config.llm.globalConcurrency < config.llm.concurrencyPerInstance) {
    warnings.push(
      `LLM_GLOBAL_CONCURRENCY (${config.llm.globalConcurrency}) is lower than LLM_CONCURRENCY_PER_INSTANCE (${config.llm.concurrencyPerInstance}); the global budget will bind first (this is valid but may serialize instances).`
    );
  }

  warnings.forEach((warning) => console.warn(`⚠️  [Config Warning] ${warning}`));
  if (errors.length > 0) {
    errors.forEach((err) => console.error(`❌ [Config Error] ${err}`));
    if (isProduction) {
      process.exit(1);
    }
  }
}

validateEnv();

module.exports = config;
