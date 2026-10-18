/**
 * Resilience wrapper for every Anthropic call.
 *
 * Order of guards:
 *   1. Per-user/session token budget  (cost control, hard stop)
 *   2. Per-instance concurrency semaphore (event-loop / socket protection)
 *   3. Redis global concurrency budget (provider RPM/TPM protection)
 *   4. Retry with exponential backoff + jitter on 429 / 529 / 5xx / network
 *
 * Any guard rejection returns { ok:false, reason } rather than throwing, so
 * callers can deterministically invoke the calibrated fallback simulation.
 */
const config = require('../config/env');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');
const { Semaphore } = require('../utils/concurrencyLimiter');
const tokenBudget = require('./tokenBudget');
const globalBudget = require('./globalLlmBudget');

const llmLimiter = new Semaphore({
  name: 'anthropic',
  maxConcurrent: config.llm.concurrencyPerInstance,
  maxQueue: config.llm.queueMax,
  acquireTimeoutMs: config.llm.queueTimeoutMs,
  onChange: (stats, event) => {
    metrics.setGauge('prepai_llm_active', {}, stats.active);
    metrics.setGauge('prepai_llm_queue_depth', {}, stats.queued);
    metrics.setGauge('prepai_llm_queue_peak', {}, stats.peakActive);
    if (event === 'timeout') metrics.inc('prepai_llm_queue_timeouts_total');
    if (event === 'rejected') metrics.inc('prepai_llm_queue_rejected_total');
  },
});

function getStatus(err) {
  return (
    err?.status ||
    err?.statusCode ||
    err?.response?.status ||
    err?.error?.status ||
    null
  );
}

function isRetryableError(err) {
  const status = getStatus(err);
  if (status === 429 || status === 529) return true;
  if (typeof status === 'number' && status >= 500) return true;
  if (err?.name === 'APIConnectionError' || err?.name === 'APIConnectionTimeoutError') return true;
  if (['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'EAI_AGAIN'].includes(err?.code)) return true;
  return false;
}

function computeBackoff(attempt) {
  const exponential = config.llm.retryBaseDelayMs * Math.pow(2, Math.max(0, attempt));
  const capped = Math.min(config.llm.retryMaxDelayMs, exponential);
  if (!config.llm.retryJitter) return capped;
  // Full jitter in [0.5x, 1.5x] avoids thundering-herd retries.
  return Math.round(capped * (0.5 + Math.random()));
}

function sleep(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    if (timer.unref) timer.unref();
  });
}

function extractUsage(result) {
  if (!result) return 0;
  if (result.usage) {
    const prompt = Number(result.usage.input_tokens ?? result.usage.prompt_tokens ?? 0);
    const completion = Number(result.usage.output_tokens ?? result.usage.completion_tokens ?? 0);
    if (prompt + completion > 0) return prompt + completion;
    if (Number(result.usage.total_tokens) > 0) return Number(result.usage.total_tokens);
  }
  if (result.tokens) {
    return Number(result.tokens.totalTokens ?? result.tokens.total ?? 0) || 0;
  }
  return Number(result.totalTokens ?? 0) || 0;
}

function extractTokenParts(result) {
  if (!result) return { promptTokens: 0, completionTokens: 0 };
  if (result.usage) {
    return {
      promptTokens: Number(result.usage.input_tokens ?? result.usage.prompt_tokens ?? 0),
      completionTokens: Number(result.usage.output_tokens ?? result.usage.completion_tokens ?? 0),
    };
  }
  if (result.tokens) {
    return {
      promptTokens: Number(result.tokens.promptTokens ?? 0),
      completionTokens: Number(result.tokens.completionTokens ?? 0),
    };
  }
  return { promptTokens: 0, completionTokens: 0 };
}

/**
 * @param {Object} options
 * @param {string} options.label short operation label ('opening','turn','score','stream')
 * @param {string} [options.userId]
 * @param {string} [options.sessionId]
 * @param {string} [options.requestId]
 * @param {number} [options.reserveTokens]
 * @param {Function} options.fn async ({attempt}) => result
 */
async function runWithResilience({
  label = 'llm',
  userId,
  sessionId,
  requestId,
  reserveTokens = 0,
  fn,
}) {
  const startedAt = Date.now();
  const logContext = { label, requestId, userId: userId ? String(userId) : undefined };

  const reservation = await tokenBudget.reserve({ userId, sessionId, tokens: reserveTokens });
  if (!reservation.allowed) {
    metrics.inc('prepai_llm_calls_total', { label, outcome: 'budget_denied' });
    return { ok: false, reason: reservation.reason || 'token_budget_exceeded' };
  }

  let releaseLocal;
  try {
    releaseLocal = await llmLimiter.acquire();
  } catch (err) {
    metrics.inc('prepai_llm_calls_total', { label, outcome: 'overloaded' });
    logger.warn('LLM per-instance queue rejected call', { ...logContext, error: err.message });
    return { ok: false, reason: 'overloaded', error: err };
  }

  let globalSlot = { acquired: false };
  let attempts = 0;
  try {
    globalSlot = await globalBudget.acquire();
    if (!globalSlot.acquired) {
      metrics.inc('prepai_llm_calls_total', { label, outcome: 'global_budget' });
      logger.warn('Global LLM concurrency budget exhausted; falling back', logContext);
      return { ok: false, reason: 'global_budget' };
    }

    let lastError = null;
    for (let attempt = 0; attempt <= config.llm.maxRetries; attempt++) {
      attempts = attempt + 1;
      try {
        const result = await fn({ attempt });
        const actual = extractUsage(result);
        if (actual > 0) {
          await tokenBudget.settle({ userId, sessionId, reserved: reserveTokens, actual });
        } else if (reserveTokens > 0) {
          // No usage returned: keep the reservation (conservative).
        }

        metrics.inc('prepai_llm_calls_total', { label, outcome: 'success' });
        metrics.observe('prepai_llm_call_duration_ms', { label }, Date.now() - startedAt);
        const parts = extractTokenParts(result);
        if (parts.promptTokens) metrics.inc('prepai_llm_tokens_total', { type: 'prompt' }, parts.promptTokens);
        if (parts.completionTokens) {
          metrics.inc('prepai_llm_tokens_total', { type: 'completion' }, parts.completionTokens);
        }

        return { ok: true, result, attempts, reservation };
      } catch (err) {
        lastError = err;
        const status = getStatus(err);
        const retryable = isRetryableError(err) && !err.partial;

        metrics.inc('prepai_llm_calls_total', {
          label,
          outcome: retryable ? 'retryable_error' : 'error',
        });
        if (status === 429 || status === 529) {
          metrics.inc('prepai_llm_rate_limited_total', { label, status: String(status) });
        }

        if (!retryable || attempt === config.llm.maxRetries) break;

        const delay = computeBackoff(attempt);
        logger.warn('Retrying Anthropic call with exponential backoff', {
          ...logContext,
          attempt: attempt + 1,
          delayMs: delay,
          status,
          error: err.message,
        });
        metrics.inc('prepai_llm_retries_total', { label });
        await sleep(delay);
      }
    }

    // Failed call: release the reservation (no tokens billed to the user).
    if (reserveTokens > 0) {
      await tokenBudget.settle({ userId, sessionId, reserved: reserveTokens, actual: 0 });
    }

    metrics.observe('prepai_llm_call_duration_ms', { label }, Date.now() - startedAt);
    logger.warn('LLM call exhausted retries; caller will use fallback', {
      ...logContext,
      attempts,
      status: getStatus(lastError),
      error: lastError?.message,
    });
    return { ok: false, reason: 'provider_error', error: lastError, attempts };
  } finally {
    if (globalSlot.acquired) {
      await globalBudget.release();
    }
    if (releaseLocal) releaseLocal();
  }
}

async function drainQueue() {
  return llmLimiter.drain('LLM queue drained during shutdown');
}

module.exports = {
  llmLimiter,
  isRetryableError,
  computeBackoff,
  runWithResilience,
  extractUsage,
  extractTokenParts,
  drainQueue,
};
