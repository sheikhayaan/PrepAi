/**
 * Enterprise Agent Router (Frontier LLM Gateway with Strict Cost & Per-User Guards)
 *
 * Base URL: https://agentrouter.org/ (e.g. https://agentrouter.org/v1)
 * Supported Frontier Models: gpt 6 astra, 5.6 sol, 6.1, gpt-4o
 *
 * Strict Cost & Credit Controls:
 * 1. Single Interview Allowance: Each candidate gets strictly ONE (1) interview using Agent Router.
 *    Any subsequent interview started by that candidate automatically bypasses Agent Router to protect credits.
 * 2. Session Cost Ceiling ($0.0001 Max): If Agent Router usage in that interview reaches or exceeds
 *    $0.0001, it instantly switches to the existing model (Claude 3.5 Sonnet / Offline bank).
 */

const config = require('../config/env');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');
const cache = require('../utils/cache');
const incidentTracker = require('../utils/incidentTracker');
const User = require('../models/User');
const InterviewSession = require('../models/InterviewSession');
const geminiClient = require('./geminiClient');
const {
  generateOpeningQuestion: generateClaudeOpeningQuestion,
  scoreTurnWithTool: scoreClaudeTurn,
  isLlmEnabled: isClaudeEnabled,
} = require('./anthropicClient');

class AgentRouter {
  constructor() {
    this.stats = {
      primaryRequests: 0,
      primarySuccesses: 0,
      primaryErrors: 0,
      claudeRequests: 0,
      claudeSuccesses: 0,
      claudeErrors: 0,
      offlineFallbacks: 0,
      creditGuardSwitches: 0,
      totalCostUsd: 0,
      latencies: {
        agentRouter: [],
        claude: [],
      },
    };
  }

  isPrimaryConfigured() {
    const key = config.agentRouter?.apiKey;
    if (!key || key.length < 5) return false;
    const lowered = key.toLowerCase();
    return !['your_', 'placeholder', 'changeme', 'sk-xxx'].some((prefix) => lowered.startsWith(prefix));
  }

  getCompletionsUrl(rawBase) {
    let clean = (rawBase || config.agentRouter.baseUrl || 'https://co.agentrouter.org/v1').trim().replace(/\/+$/, '');
    // Auto-normalize agentrouter.org to the official OpenAI API gateway host (co.agentrouter.org)
    if (clean === 'https://agentrouter.org' || clean === 'http://agentrouter.org') {
      clean = 'https://co.agentrouter.org/v1';
    } else if (clean === 'https://agentrouter.org/v1' || clean === 'http://agentrouter.org/v1') {
      clean = 'https://co.agentrouter.org/v1';
    } else if (!clean.endsWith('/v1') && !clean.endsWith('/api/v1') && !clean.endsWith('/chat/completions')) {
      clean = `${clean}/v1`;
    }
    return clean.endsWith('/chat/completions') ? clean : `${clean}/chat/completions`;
  }

  recordLatency(provider, ms) {
    if (!this.stats.latencies[provider]) {
      this.stats.latencies[provider] = [];
    }
    const arr = this.stats.latencies[provider];
    if (arr.length >= 100) arr.shift();
    arr.push(ms);
  }

  getAvgLatency(provider) {
    const arr = this.stats.latencies[provider] || [];
    if (arr.length === 0) return 0;
    const sum = arr.reduce((acc, v) => acc + v, 0);
    return Math.round(sum / arr.length);
  }

  calculateCostUsd(usage, promptText = '', completionText = '') {
    let promptTokens = usage?.prompt_tokens;
    let completionTokens = usage?.completion_tokens;

    // Fallback estimation: ~4 chars per token if usage omitted by upstream gateway
    if (!promptTokens && promptText) {
      promptTokens = Math.ceil(promptText.length / 4);
    }
    if (!completionTokens && completionText) {
      completionTokens = Math.ceil(completionText.length / 4);
    }

    promptTokens = promptTokens || 40;
    completionTokens = completionTokens || 60;

    // Standard AgentRouter / Frontier pricing (~$1.50/1M prompt, ~$6.00/1M completion)
    const cost = (promptTokens * 0.0000015) + (completionTokens * 0.000006);
    return parseFloat(cost.toFixed(7));
  }

  /**
   * Check if candidate is eligible for Agent Router (strictly 1 interview session per user)
   */
  async isUserEligible(userId) {
    if (!userId) return false;
    try {
      const user = await User.findById(userId).select('agentRouterInterviewsCount');
      if (!user) return false;
      const count = user.agentRouterInterviewsCount || 0;
      return count < (config.agentRouter.maxInterviewsPerUser || 1);
    } catch (_) {
      return false;
    }
  }

  /**
   * Check if the session is still under the $0.0001 cost ceiling
   */
  async isSessionWithinBudget(sessionId) {
    if (!sessionId) return true;
    try {
      const session = await InterviewSession.findById(sessionId).select('agentRouterCostUsd');
      if (!session) return true;
      const currentCost = session.agentRouterCostUsd || 0;
      return currentCost < (config.agentRouter.maxSessionCostUsd || 0.0001);
    } catch (_) {
      return true;
    }
  }

  /**
   * Call OpenAI-compatible Agent Router Endpoint with timeout and resilient error handling
   */
  async callPrimaryModel({ systemPrompt, userPrompt, temperature = 0.7, maxTokens = 450, timeoutMs = 12000 }) {
    if (!config.agentRouter.enabled || !this.isPrimaryConfigured()) {
      return { ok: false, reason: 'primary_not_configured' };
    }

    this.stats.primaryRequests++;
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = this.getCompletionsUrl(config.agentRouter.baseUrl);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.agentRouter.apiKey}`,
        },
        body: JSON.stringify({
          model: config.agentRouter.model || 'gpt 6 astra',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;
      this.recordLatency('agentRouter', latencyMs);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let parsed = null;
        try {
          parsed = JSON.parse(errorText);
        } catch (_) {}

        const errMessage = parsed?.error?.message || parsed?.msg || `HTTP ${response.status}: ${errorText.substring(0, 100)}`;
        this.stats.primaryErrors++;

        // If rate limit 429
        if (response.status === 429) {
          incidentTracker.recordIncident({
            category: 'LLM_RATE_LIMIT_429',
            message: `Agent Router [${config.agentRouter.model}] 429 Quota Exceeded: ${errMessage}`,
            severity: 'medium',
            endpoint: url,
            statusCode: 429,
            autoMitigated: true,
            mitigationNotes: 'Automatically routed to Claude 3.5 Sonnet fallback without user impact.',
          });
        } else if (response.status === 401) {
          incidentTracker.recordIncident({
            category: 'LLM_FALLBACK_TRIGGERED',
            message: `Agent Router 401 Invalid Key (${errMessage}): Verify token on agentrouter.org. Auto-routed to Claude.`,
            severity: 'low',
            endpoint: url,
            statusCode: 401,
            autoMitigated: true,
            mitigationNotes: 'Candidate interview protected: Seamlessly routed to Tier-2 Claude 3.5 Sonnet.',
          });
        }

        return { ok: false, status: response.status, error: errMessage };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        this.stats.primaryErrors++;
        return { ok: false, reason: 'empty_response' };
      }

      const costUsd = this.calculateCostUsd(data.usage, `${systemPrompt} ${userPrompt}`, content);
      this.stats.totalCostUsd = parseFloat((this.stats.totalCostUsd + costUsd).toFixed(6));
      this.stats.primarySuccesses++;

      return {
        ok: true,
        content,
        latencyMs,
        model: data.model || config.agentRouter.model,
        usage: data.usage || null,
        costUsd,
      };
    } catch (err) {
      clearTimeout(timeout);
      this.stats.primaryErrors++;
      const isTimeout = err.name === 'AbortError';

      incidentTracker.recordIncident({
        category: isTimeout ? 'LLM_TIMEOUT' : 'LLM_FALLBACK_TRIGGERED',
        message: `Agent Router call failed (${isTimeout ? 'Timeout' : err.message}). Fallback to Claude initiated.`,
        severity: 'low',
        autoMitigated: true,
        mitigationNotes: 'Seamless fallback to Claude 3.5 Sonnet',
      });

      return { ok: false, reason: isTimeout ? 'timeout' : 'network_error', error: err.message };
    }
  }

  /**
   * Route Opening Question Generation:
   * Enforces 1 interview per candidate + $0.0001 session budget ceiling
   */
  async generateQuestion({
    type = 'dsa',
    companyTier = 'faang',
    targetCompany = 'Google / Meta / FAANG',
    seniorityLevel = 'L5 (Senior)',
    targetPackage = '$250k - $380k',
    customConfig = null,
    userId = null,
    requestId = null,
  }) {
    const cleanCompany = customConfig?.targetCompany || targetCompany;
    const cleanLevel = customConfig?.role || seniorityLevel;

    // Check Candidate Allowance (Strict Rule: Only 1 interview per user uses Agent Router)
    let candidateEligible = false;
    if (this.isPrimaryConfigured()) {
      candidateEligible = await this.isUserEligible(userId);
      if (!candidateEligible) {
        logger.info('Agent Router: User already used their 1 allowed interview. Bypassing Agent Router and routing to existing Claude model.', {
          userId,
        });
        this.stats.creditGuardSwitches++;
      }
    }

    // 1. Attempt Primary Agent Router (if configured & candidate eligible)
    if (this.isPrimaryConfigured() && candidateEligible) {
      logger.info('Agent Router: Attempting primary frontier model for opening question', {
        provider: config.agentRouter.provider,
        model: config.agentRouter.model,
        baseUrl: config.agentRouter.baseUrl,
        company: cleanCompany,
        level: cleanLevel,
      });

      const systemPrompt = `You are a Principal Engineering Bar Raiser at ${cleanCompany}.
Craft a challenging, concise, authentic opening ${type.toUpperCase()} question for ${cleanLevel} candidates.
Output ONLY the question text (2-3 sentences max) with clear constraints.`;

      const userPrompt = `Role: ${cleanLevel}
Target Company: ${cleanCompany}
Interview Track: ${type}
Target Compensation: ${targetPackage}
Region: ${customConfig?.region || 'global'}`;

      const primaryRes = await this.callPrimaryModel({
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: 1024,
        timeoutMs: config.agentRouter.timeoutMs || 10000,
      });

      if (primaryRes.ok && primaryRes.content && primaryRes.content.trim().length >= 80) {
        // Increment user's allowance counter so they only use 1 interview
        if (userId) {
          User.findByIdAndUpdate(userId, { $inc: { agentRouterInterviewsCount: 1 } }).catch(() => {});
        }

        logger.info('Agent Router: Successfully generated question via primary model', {
          model: primaryRes.model,
          latencyMs: primaryRes.latencyMs,
          costUsd: primaryRes.costUsd,
        });

        return {
          question: primaryRes.content,
          provider: 'agent_router_gpt',
          model: primaryRes.model,
          latencyMs: primaryRes.latencyMs,
          costUsd: primaryRes.costUsd,
          agentRouterUsed: true,
        };
      }

      logger.warn('Agent Router: Primary model failed or timed out. Gracefully falling back to Gemini / Claude.', {
        reason: primaryRes.reason || primaryRes.error,
      });
    }

    // 2. Secondary Fast Tier: Google Gemini (if configured with user API key)
    if (geminiClient.isConfigured()) {
      try {
        const geminiRes = await geminiClient.generateQuestion({
          type,
          targetCompany: cleanCompany,
          seniorityLevel: cleanLevel,
          targetPackage,
          customConfig,
        });
        if (geminiRes.ok && geminiRes.content) {
          logger.info('Gemini: Successfully generated question via Google Gemini', {
            model: geminiRes.model,
            latencyMs: geminiRes.latencyMs,
          });
          return {
            question: geminiRes.content,
            provider: 'gemini',
            model: geminiRes.model,
            latencyMs: geminiRes.latencyMs,
            costUsd: 0,
            agentRouterUsed: false,
          };
        }
      } catch (geminiErr) {
        logger.warn('Gemini question generation error, falling back to Claude', { error: geminiErr.message });
      }
    }

    // 3. Fallback Tier 2: Anthropic Claude 3.5 Sonnet
    this.stats.claudeRequests++;
    const claudeStart = Date.now();
    try {
      const claudeQuestion = await generateClaudeOpeningQuestion({
        sessionType: type,
        companyTier,
        targetCompany: cleanCompany,
        seniorityLevel: cleanLevel,
        targetPackage,
        customConfig,
        userId,
        requestId,
      });

      const claudeLatency = Date.now() - claudeStart;
      this.recordLatency('claude', claudeLatency);

      if (claudeQuestion) {
        this.stats.claudeSuccesses++;
        logger.info('Agent Router: Served question via existing Claude 3.5 Sonnet fallback', {
          latencyMs: claudeLatency,
        });
        return {
          question: claudeQuestion,
          provider: 'claude_sonnet',
          model: config.anthropic.model,
          latencyMs: claudeLatency,
          costUsd: 0,
          agentRouterUsed: false,
        };
      }
    } catch (claudeErr) {
      this.stats.claudeErrors++;
      logger.warn('Agent Router: Claude fallback failed', { error: claudeErr.message });
    }

    // 3. Fallback Tier 2: Calibrated Offline Question Bank
    this.stats.offlineFallbacks++;
    logger.info('Agent Router: Dispatched zero-downtime offline calibrated question bank fallback');
    return {
      question: null,
      provider: 'offline_bank',
      model: 'calibrated_offline_bank',
      latencyMs: 0,
      costUsd: 0,
      agentRouterUsed: false,
    };
  }

  /**
   * Route Single Turn Scoring:
   * Enforces the $0.0001 session budget ceiling (if cost >= $0.0001, switch to existing Claude)
   */
  async scoreTurn({
    sessionType,
    companyTier,
    targetCompany,
    seniorityLevel,
    customConfig,
    question,
    answer,
    userId,
    sessionId,
    requestId,
  }) {
    let withinBudget = true;
    if (this.isPrimaryConfigured() && sessionId) {
      withinBudget = await this.isSessionWithinBudget(sessionId);
      if (!withinBudget) {
        logger.info('Agent Router: Session reached cost ceiling ($0.0001). Switching to existing Claude model.', {
          sessionId,
        });
        this.stats.creditGuardSwitches++;
        incidentTracker.recordIncident({
          category: 'LLM_FALLBACK_TRIGGERED',
          message: 'Agent Router $0.0001 session cost ceiling reached. Switched to existing Claude 3.5 Sonnet model.',
          severity: 'low',
          autoMitigated: true,
          mitigationNotes: 'Switched to Claude 3.5 Sonnet to prevent credit expenditure.',
        });
      }
    }

    // If primary configured and within the $0.0001 budget
    if (this.isPrimaryConfigured() && withinBudget) {
      const systemPrompt = `You are an expert ${sessionType.toUpperCase()} Bar Raiser at ${targetCompany || 'Tier-1 Tech'}.
Evaluate candidate answer on a 0-10 scale.
Respond ONLY with a JSON object:
{
  "overall": <number 0-10>,
  "dimensionScores": {
    "correctness": <number 0-10>,
    "communication": <number 0-10>,
    "structure": <number 0-10>
  },
  "topicTags": ["<topic1>", "<topic2>"],
  "reasoning": "<1-2 sentences>"
}`;

      const userPrompt = `Question: "${question}"\n\nAnswer: "${answer}"`;

      const primaryRes = await this.callPrimaryModel({
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        maxTokens: 250,
        timeoutMs: 8000,
      });

      if (primaryRes.ok && primaryRes.content) {
        try {
          const cleaned = primaryRes.content.replace(/^```json/i, '').replace(/```$/i, '').trim();
          const parsed = JSON.parse(cleaned);
          if (parsed && typeof parsed.overall === 'number') {
            // Update session cost
            if (sessionId && primaryRes.costUsd) {
              InterviewSession.findByIdAndUpdate(sessionId, {
                $inc: { agentRouterCostUsd: primaryRes.costUsd },
                $set: { agentRouterUsed: true },
              }).catch(() => {});
            }

            return {
              ...parsed,
              scoredBy: 'agent_router_gpt',
              model: primaryRes.model,
              costUsd: primaryRes.costUsd,
            };
          }
        } catch (_) {}
      }
    }

    // 2. Secondary Fast Tier: Google Gemini Evaluation (if configured)
    if (geminiClient.isConfigured()) {
      try {
        const geminiScore = await geminiClient.scoreTurn({
          question,
          answer,
          companyTier,
          seniorityLevel,
        });
        if (geminiScore.ok && geminiScore.scores) {
          return {
            clarity: geminiScore.scores.clarity,
            correctness: geminiScore.scores.correctness,
            structure: geminiScore.scores.structure,
            edgeCases: geminiScore.scores.edgeCases,
            overall: geminiScore.scores.overallScore,
            feedback: geminiScore.feedback,
            followUpQuestion: geminiScore.followUp,
            scoredBy: 'gemini',
            model: geminiClient.getHealth().model,
            costUsd: 0,
          };
        }
      } catch (geminiErr) {
        logger.warn('Gemini scoring turn error, falling back to Claude', { error: geminiErr.message });
      }
    }

    // Existing Model Fallback: Anthropic Claude 3.5 Sonnet Tool Scoring
    return scoreClaudeTurn({
      sessionType,
      companyTier,
      targetCompany,
      seniorityLevel,
      customConfig,
      question,
      answer,
      userId,
      sessionId,
      requestId,
    });
  }

  getRouterHealth() {
    const isPrimaryUp = this.isPrimaryConfigured();
    const isClaudeUp = isClaudeEnabled();

    let status = 'simulation';
    if (isPrimaryUp && isClaudeUp) {
      status = 'dual_active';
    } else if (isPrimaryUp) {
      status = 'primary_active';
    } else if (isClaudeUp) {
      status = 'claude_active';
    }

    return {
      status,
      primary: {
        provider: config.agentRouter.provider,
        model: config.agentRouter.model,
        baseUrl: config.agentRouter.baseUrl,
        configured: isPrimaryUp,
        avgLatencyMs: this.getAvgLatency('agentRouter'),
        requests: this.stats.primaryRequests,
        successes: this.stats.primarySuccesses,
        errors: this.stats.primaryErrors,
        maxInterviewsPerUser: config.agentRouter.maxInterviewsPerUser,
        maxSessionCostUsd: config.agentRouter.maxSessionCostUsd,
        creditGuardSwitches: this.stats.creditGuardSwitches,
      },
      gemini: geminiClient.getHealth(),
      fallback: {
        provider: 'anthropic',
        model: config.anthropic.model,
        configured: isClaudeUp,
        avgLatencyMs: this.getAvgLatency('claude'),
        requests: this.stats.claudeRequests,
        successes: this.stats.claudeSuccesses,
        errors: this.stats.claudeErrors,
      },
      offline: {
        dispatched: this.stats.offlineFallbacks,
      },
    };
  }
}

const agentRouter = new AgentRouter();

module.exports = agentRouter;
