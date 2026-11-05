/**
 * Google Gemini API Client
 * Native, resilient client for Gemini 2.0 Flash / Gemini 1.5 Pro
 * Endpoint: https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent
 */

const config = require('../config/env');
const logger = require('../utils/logger');
const incidentTracker = require('../utils/incidentTracker');

class GeminiClient {
  constructor() {
    this.stats = {
      requests: 0,
      successes: 0,
      errors: 0,
      latencies: [],
    };
  }

  isConfigured() {
    const key = config.gemini?.apiKey;
    if (!key || key.length < 10) return false;
    const lowered = key.toLowerCase();
    return !['your_', 'placeholder', 'changeme', 'ai_xxx'].some((prefix) => lowered.startsWith(prefix));
  }

  recordLatency(ms) {
    if (this.stats.latencies.length >= 100) this.stats.latencies.shift();
    this.stats.latencies.push(ms);
  }

  getAvgLatency() {
    if (this.stats.latencies.length === 0) return 0;
    const sum = this.stats.latencies.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.stats.latencies.length);
  }

  getHealth() {
    return {
      configured: this.isConfigured(),
      model: config.gemini?.model || 'gemini-2.0-flash',
      requests: this.stats.requests,
      successes: this.stats.successes,
      errors: this.stats.errors,
      avgLatencyMs: this.getAvgLatency(),
      status: this.isConfigured() ? 'active' : 'unconfigured',
    };
  }

  /**
   * Generate interview opening question using Gemini
   */
  async generateQuestion({
    type = 'dsa',
    targetCompany = 'Google',
    seniorityLevel = 'L5 (Senior)',
    targetPackage = '$250k - $380k',
    customConfig = null,
  }) {
    if (!this.isConfigured()) {
      return { ok: false, reason: 'unconfigured' };
    }

    const cleanCompany = customConfig?.targetCompany || targetCompany;
    const cleanLevel = customConfig?.role || seniorityLevel;
    const model = config.gemini.model || 'gemini-2.0-flash';
    const apiKey = config.gemini.apiKey;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `You are an elite Senior Staff Bar Raiser at ${cleanCompany}.
Conducting interview for: ${cleanLevel}
Track: ${type.toUpperCase()}
Compensation Band: ${targetPackage}

Generate ONE realistic, authentic, challenging opening interview question for this candidate.
Output ONLY the question text (2 to 3 sentences maximum) with technical constraints clearly stated.
Do NOT include markdown preambles or greetings.`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 250,
      },
    };

    const startTime = Date.now();
    this.stats.requests++;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.signal, config.gemini.timeoutMs || 12000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;
      this.recordLatency(latencyMs);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        this.stats.errors++;
        logger.warn('Gemini API call returned non-200', { status: response.status, err: errText });

        incidentTracker.recordIncident({
          category: response.status === 429 ? 'LLM_RATE_LIMIT_429' : 'LLM_FALLBACK_TRIGGERED',
          message: `Google Gemini [${model}] returned HTTP ${response.status}: ${errText.substring(0, 120)}`,
          severity: response.status === 429 ? 'medium' : 'low',
          endpoint: 'Google Gemini API',
          statusCode: response.status,
          autoMitigated: true,
          mitigationNotes: 'Auto-routed to Claude 3.5 Sonnet / Offline bank',
        });

        return { ok: false, status: response.status, error: errText };
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!text) {
        this.stats.errors++;
        return { ok: false, reason: 'empty_response' };
      }

      this.stats.successes++;
      return {
        ok: true,
        content: text,
        latencyMs,
        model,
        provider: 'gemini',
      };
    } catch (err) {
      this.stats.errors++;
      const isTimeout = err.name === 'AbortError';
      logger.error('Gemini request error', { error: err.message, isTimeout });

      incidentTracker.recordIncident({
        category: isTimeout ? 'LLM_TIMEOUT' : 'LLM_FALLBACK_TRIGGERED',
        message: `Gemini API request failed: ${isTimeout ? 'Request Timed Out' : err.message}`,
        severity: 'low',
        autoMitigated: true,
        mitigationNotes: 'Cascaded to Claude 3.5 Sonnet',
      });

      return { ok: false, error: err.message };
    }
  }

  /**
   * Score candidate answer using Gemini
   */
  async scoreTurn({ question, answer, companyTier = 'faang', seniorityLevel = 'L5 (Senior)' }) {
    if (!this.isConfigured()) {
      return { ok: false, reason: 'unconfigured' };
    }

    const model = config.gemini.model || 'gemini-2.0-flash';
    const apiKey = config.gemini.apiKey;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `You are an expert FAANG hiring committee interviewer calibrating an answer for: ${seniorityLevel}.
Interviewer Question: "${question}"
Candidate Answer: "${answer}"

Evaluate the answer and return STRICT JSON with exactly these keys:
{
  "clarity": <score 1-100>,
  "correctness": <score 1-100>,
  "structure": <score 1-100>,
  "edgeCases": <score 1-100>,
  "overallScore": <score 1-100>,
  "feedback": "<2-3 actionable sentences highlighting strengths and gaps>",
  "followUp": "<one sharp follow-up probe testing depth or edge cases>"
}`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 500,
        responseMimeType: 'application/json',
      },
    };

    const startTime = Date.now();
    this.stats.requests++;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.signal, config.gemini.timeoutMs || 12000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;
      this.recordLatency(latencyMs);

      if (!response.ok) {
        this.stats.errors++;
        return { ok: false, status: response.status };
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!text) {
        this.stats.errors++;
        return { ok: false, reason: 'empty_response' };
      }

      let parsed = JSON.parse(text);
      this.stats.successes++;

      return {
        ok: true,
        scores: {
          clarity: parsed.clarity || 75,
          correctness: parsed.correctness || 75,
          structure: parsed.structure || 75,
          edgeCases: parsed.edgeCases || 70,
          overallScore: parsed.overallScore || 75,
        },
        feedback: parsed.feedback || 'Good attempt with solid fundamentals.',
        followUp: parsed.followUp || 'Can you discuss the time complexity tradeoffs?',
        latencyMs,
        provider: 'gemini',
      };
    } catch (err) {
      this.stats.errors++;
      return { ok: false, error: err.message };
    }
  }
}

module.exports = new GeminiClient();
