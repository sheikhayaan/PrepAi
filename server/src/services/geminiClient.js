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

    const prompt = `You are a Principal Bar Raiser and Technical Interviewer at ${cleanCompany} conducting an interview for a ${cleanLevel} candidate.
Track: ${type.toUpperCase()}
Target Compensation Band: ${targetPackage}

Generate ONE realistic, complete, production-grade interview question for this candidate.
Your question MUST be comprehensive and clearly structured:
- Scenario & Context: A realistic real-world engineering or business scenario at ${cleanCompany}.
- Problem Statement: Clear challenge and what the candidate needs to design, implement, or evaluate.
- Concrete Constraints / Examples: Specific scale, inputs/outputs, latency/throughput bounds, or organizational parameters.
- Opening Call to Action: A prompt asking the candidate to explain their high-level approach, assumptions, and trade-offs before diving deep.

Do NOT truncate your output. Output the complete, polished question directly without meta-commentary or conversational greetings like "Hello".`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 0 },
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
      const candidate = data?.candidates?.[0];
      const finishReason = candidate?.finishReason;
      const text = candidate?.content?.parts?.[0]?.text?.trim();

      if (!text || text.length < 80 || finishReason === 'MAX_TOKENS') {
        logger.warn('Gemini question invalid or truncated', {
          finishReason,
          length: text?.length,
          preview: text?.substring(0, 80),
        });
        this.stats.errors++;
        return { ok: false, reason: finishReason === 'MAX_TOKENS' ? 'truncated' : 'incomplete_response' };
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
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
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
      const candidate = data?.candidates?.[0];
      const finishReason = candidate?.finishReason;
      const text = candidate?.content?.parts?.[0]?.text?.trim();

      if (!text || text.length < 80 || finishReason === 'MAX_TOKENS') {
        logger.warn('Gemini question invalid or truncated', {
          finishReason,
          length: text?.length,
          preview: text?.substring(0, 80),
        });
        this.stats.errors++;
        return { ok: false, reason: finishReason === 'MAX_TOKENS' ? 'truncated' : 'incomplete_response' };
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

  /**
   * Stream adaptive follow-up question dynamically calibrated to candidate answer
   */
  async streamAdaptiveQuestion({
    sessionType = 'dsa',
    companyTier = 'faang',
    targetCompany = 'Google',
    seniorityLevel = 'L5 (Senior)',
    customConfig = null,
    turns = [],
    latestAnswer = '',
    onChunk = () => {},
    onDone = () => {},
  }) {
    if (!this.isConfigured()) {
      throw new Error('Gemini API is not configured');
    }

    const cleanCompany = customConfig?.targetCompany || targetCompany || 'Tier-1 FAANG';
    const cleanLevel = customConfig?.role || seniorityLevel || 'L5 (Senior)';
    const model = config.gemini.model || 'gemini-2.5-flash';
    const apiKey = config.gemini.apiKey;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const cleanAns = (latestAnswer || '').trim();

    // 1. Detect simple greetings and warmly prompt for the solution
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'howdy'];
    if (greetings.includes(cleanAns.toLowerCase()) || cleanAns.toLowerCase().startsWith('hello ') || cleanAns.toLowerCase().startsWith('hi ')) {
      const greetingMsg = `Hello! Welcome to your ${sessionType.toUpperCase()} interview for ${cleanCompany} (${cleanLevel}). When you are ready, please walk me through your solution or system architecture.`;
      const words = greetingMsg.split(' ');
      for (let i = 0; i < words.length; i++) {
        await new Promise((r) => setTimeout(r, 20));
        onChunk(words[i] + (i === words.length - 1 ? '' : ' '));
      }
      await onDone({ fullResponse: greetingMsg, fallback: false });
      return;
    }

    // 2. Build multi-turn context
    let dialogueText = '';
    for (let i = 0; i < turns.length; i++) {
      const t = turns[i];
      dialogueText += `\n[Turn ${i + 1} Question]: ${t.question}\n`;
      if (t.answer && t.answer.trim()) {
        dialogueText += `[Turn ${i + 1} Candidate Answer]: ${t.answer}\n`;
      }
    }
    if (cleanAns && (!turns.length || turns[turns.length - 1]?.answer !== cleanAns)) {
      dialogueText += `[Current Candidate Answer]: ${cleanAns}\n`;
    }

    const prompt = `You are a Principal Technical Bar Raiser at ${cleanCompany} conducting an authentic ${sessionType.toUpperCase()} interview for a ${cleanLevel} candidate.

Dialogue history:
${dialogueText}

Candidate's Latest Response:
"${cleanAns}"

CRITICAL INSTRUCTIONS FOR YOUR NEXT INTERVIEWER RESPONSE:
1. Act directly as the interviewer speaking to the candidate. Output ONLY what you speak. Do NOT include markdown codeblocks, preambles, or "Interviewer:" prefixes.
2. If the candidate asked a clarifying question, answer it directly using realistic production parameters (e.g. scale, traffic, SLA), and ask how that shapes their approach.
3. If the candidate proposed a solution or design:
   - Acknowledge their proposed algorithm/architecture directly.
   - Critique their asymptotic time/space bounds, concurrency risks, failure modes, or edge cases.
   - Ask ONE sharp, logical follow-up probe testing depth, optimization, or trade-offs.
4. If the candidate is stuck or asked for a hint:
   - Give a clear, helpful structural hint without giving away the full answer.
   - Ask them how they would apply it.
5. Keep your response concise, conversational, and direct (2 to 4 sentences maximum).`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    const startTime = Date.now();
    this.stats.requests++;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const data = await response.json();
      let text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      // Clean up any formatting quirks
      text = text.replace(/^["'\s]+|["'\s]+$/g, '');
      text = text.replace(/^Interviewer:\s*/i, '');

      if (!text || text.length < 20) {
        throw new Error('Gemini returned an empty or invalid response');
      }

      this.stats.successes++;
      this.recordLatency(Date.now() - startTime);

      // Stream words out to SSE channel
      const words = text.split(' ');
      for (let i = 0; i < words.length; i++) {
        await new Promise((r) => setTimeout(r, 20));
        onChunk(words[i] + (i === words.length - 1 ? '' : ' '));
      }

      await onDone({
        fullResponse: text,
        tokens: {
          promptTokens: 150,
          completionTokens: Math.ceil(text.length / 4),
        },
        fallback: false,
      });
    } catch (err) {
      logger.error('Gemini adaptive question generation error', { error: err.message });
      this.stats.errors++;

      const fallbackMsg = `That is a solid foundation. Given our scale at ${cleanCompany}, how would this approach handle concurrent requests or extreme data volume, and what asymptotic trade-offs would you prioritize?`;
      const words = fallbackMsg.split(' ');
      for (let i = 0; i < words.length; i++) {
        await new Promise((r) => setTimeout(r, 20));
        onChunk(words[i] + (i === words.length - 1 ? '' : ' '));
      }
      await onDone({
        fullResponse: fallbackMsg,
        tokens: { promptTokens: 60, completionTokens: 40 },
        fallback: true,
      });
    }
  }

  /**
   * Generate an in-depth official model answer and evaluation breakdown
   */
  async generateModelAnswer({ question, sessionType = 'dsa', targetCompany = 'Google', seniorityLevel = 'L5' }) {
    if (!this.isConfigured()) {
      return { ok: false, reason: 'unconfigured' };
    }

    const model = config.gemini.model || 'gemini-2.5-flash';
    const apiKey = config.gemini.apiKey;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `You are a Principal Engineering Fellow and Bar Raiser at ${targetCompany}.
Question: "${question}"
Track: ${sessionType.toUpperCase()}
Level: ${seniorityLevel}

Generate the OFFICIAL MODEL ANSWER and Master Evaluation Guide for this question.
Format using clean Markdown:
### 1. Optimal Approach & Key Strategy
(Explain the most optimal, production-grade algorithmic or architectural solution)

### 2. Step-by-Step Walkthrough & Concrete Logic
(Detail the exact algorithm steps, data structures, or distributed system components)

### 3. Complexity Analysis
- **Time Complexity:** (State exact Big-O and why)
- **Space Complexity:** (State auxiliary space and why)

### 4. Key Edge Cases & Common Pitfalls
(List 3-4 critical corner cases or mistakes candidates often make)

### 5. Bar Raiser Rubric Checkpoints
(What an L5/L6 interviewer expects to hear for a "Strong Hire" rating)`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) return { ok: false, status: response.status };

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return { ok: true, modelAnswer: text };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}

module.exports = new GeminiClient();
