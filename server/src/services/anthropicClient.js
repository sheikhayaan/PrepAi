const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config/env');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');
const {
  safePromptWrap,
  sanitizeInput,
  containsPromptInjection,
  OutputGuard,
  HARDENED_SYSTEM_DIRECTIVE,
  redactOutput,
} = require('../utils/security');
const cache = require('../utils/cache');
const { runWithResilience } = require('./llmResilience');

/**
 * Version stamps. Every session records the prompt + rubric versions it was
 * scored with so learning-loop promotions can be compared and rolled back.
 * Bump these whenever the prompts/rubrics below change materially.
 */
const PROMPT_VERSION = process.env.PROMPT_VERSION || '2026.02.1';
const RUBRIC_VERSION = process.env.RUBRIC_VERSION || '2026.02.1';

let anthropic = null;
const apiKey = config.anthropic.apiKey;

function looksLikePlaceholder(key) {
  if (!key || key.length < 10) return true;
  const lowered = key.toLowerCase();
  return ['your_', 'placeholder', 'changeme', 'sk-ant-xxx'].some((prefix) => lowered.startsWith(prefix)) || /^x+$/.test(key);
}

if (!looksLikePlaceholder(apiKey)) {
  try {
    anthropic = new Anthropic({
      apiKey,
      // SDK-level retries are disabled: llmResilience owns retry/backoff so
      // every attempt is budgeted, metered and observable in one place.
      maxRetries: 0,
      timeout: config.timeouts.aiInference,
    });
    logger.info('Anthropic Claude SDK successfully initialized');
  } catch (e) {
    logger.warn('Anthropic SDK initialization notice', { error: e.message });
  }
} else {
  logger.info('Running in Local Neural Simulation Mode (No ANTHROPIC_API_KEY configured)');
}

function isLlmEnabled() {
  return Boolean(anthropic);
}

/**
 * Anthropic prompt caching: the system prompt is identical across every turn
 * of an interview type, so marking it ephemeral saves ~90% of the input cost
 * for turns 2..n. Falls back to a plain string when caching is disabled.
 */
function buildSystem(systemPrompt) {
  const hardened = `${HARDENED_SYSTEM_DIRECTIVE}\n\n${systemPrompt}`;
  if (!config.llm.promptCaching) return hardened;
  return [{ type: 'text', text: hardened, cache_control: { type: 'ephemeral' } }];
}

/**
 * Single choke point for every non-streaming Anthropic call: budget, local
 * semaphore, global fleet budget, retry/backoff and metrics all live in
 * `runWithResilience`.
 *
 * @returns {Promise<{ok: boolean, data?: Object, reason?: string, error?: Error}>}
 */
async function callClaude({
  label,
  maxTokens,
  system,
  messages,
  tools,
  toolChoice,
  timeoutMs = config.timeouts.aiInference,
  userId,
  sessionId,
  requestId,
  reserveTokens = config.llm.reserveTurnTokens,
}) {
  if (!anthropic) return { ok: false, reason: 'llm_disabled' };

  const outcome = await runWithResilience({
    label,
    userId,
    sessionId,
    requestId,
    reserveTokens,
    fn: async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      if (timer.unref) timer.unref();
      try {
        return await anthropic.messages.create(
          {
            model: config.anthropic.model,
            max_tokens: maxTokens,
            system: buildSystem(system),
            messages,
            ...(tools ? { tools } : {}),
            ...(toolChoice ? { tool_choice: toolChoice } : {}),
          },
          { signal: controller.signal }
        );
      } finally {
        clearTimeout(timer);
      }
    },
  });

  return outcome.ok
    ? { ok: true, data: outcome.result, attempts: outcome.attempts }
    : { ok: false, reason: outcome.reason, error: outcome.error };
}

/**
 * Distinct Rubrics and Roles for all 8 Interview Types
 */
const RUBRIC_CONFIG = {
  dsa: {
    dimensions: [
      { key: 'clarity', label: 'Clarity & Communication', description: 'Clarity of thought and explanation (0-10)' },
      { key: 'correctness', label: 'Algorithmic Correctness', description: 'Algorithmic correctness and edge-case handling (0-10)' },
      { key: 'structure', label: 'Space-Time Complexity & Modularity', description: 'Code modularity, space-time complexity rigor (0-10)' },
      { key: 'edgeCases', label: 'Edge Case & Bounds Handling', description: 'Handling bounds, nulls, and extreme constraints (0-10)' },
    ],
    roleDesc: 'Principal Algorithmist & Software Bar Raiser',
  },
  system_design: {
    dimensions: [
      { key: 'clarity', label: 'Trade-off Articulation', description: 'Communication of architectural trade-offs (0-10)' },
      { key: 'correctness', label: 'System Correctness & Throughput', description: 'Technical validity of data storage and throughput estimation (0-10)' },
      { key: 'structure', label: 'High Availability Architecture', description: 'Modularity, decoupling, and high availability topology (0-10)' },
      { key: 'edgeCases', label: 'Fault Tolerance & Failover', description: 'Fault tolerance, replication lag, and partition failover (0-10)' },
    ],
    roleDesc: 'Principal Distributed Systems Architect',
  },
  behavioral: {
    dimensions: [
      { key: 'clarity', label: 'STAR Communication Structure', description: 'STAR communication structure and conciseness (0-10)' },
      { key: 'correctness', label: 'Ownership & Quantified Impact', description: 'Authenticity, personal ownership, and measurable impact (0-10)' },
      { key: 'structure', label: 'Cross-Functional Alignment', description: 'Strategic perspective and cross-functional alignment (0-10)' },
      { key: 'edgeCases', label: 'Conflict De-escalation', description: 'Conflict de-escalation and lessons learned (0-10)' },
    ],
    roleDesc: 'Executive Leadership Bar Raiser',
  },
  hr_round: {
    dimensions: [
      { key: 'communication', label: 'Communication & Presence', description: 'Professional articulation, confidence, and active listening (0-10)' },
      { key: 'culture_fit', label: 'Culture & Mission Alignment', description: 'Alignment with company core values, adaptability, and mission focus (0-10)' },
      { key: 'honesty_consistency', label: 'Honesty & Career Consistency', description: 'Authenticity, career narrative consistency, and role expectations (0-10)' },
    ],
    roleDesc: 'Head of People & Senior HR Director',
  },
  case_study: {
    dimensions: [
      { key: 'structuring', label: 'MECE Framework & Structuring', description: 'Problem breakdown, MECE framework application, and issue-tree structuring (0-10)' },
      { key: 'hypothesis_driven_thinking', label: 'Hypothesis-Driven Thinking', description: 'Formulation and validation of core hypotheses under ambiguity (0-10)' },
      { key: 'quantitative_reasoning', label: 'Quantitative & Economic Reasoning', description: 'Market sizing estimation, unit economics, and numerical rigor (0-10)' },
    ],
    roleDesc: 'Strategy Consulting Partner & Case Lead',
  },
  product_management: {
    dimensions: [
      { key: 'user_empathy', label: 'User Empathy & Persona Insight', description: 'Understanding user pain points, personas, and customer journey dynamics (0-10)' },
      { key: 'prioritization', label: 'Framework-Driven Prioritization', description: 'Trade-off justification, RICE/MoSCoW framework rigor, and MVP scoping (0-10)' },
      { key: 'metrics_thinking', label: 'North Star & Metrics Thinking', description: 'North Star metric definition, counter-metrics, and A/B test analysis (0-10)' },
    ],
    roleDesc: 'VP of Product & Principal PM Bar Raiser',
  },
  sales_pitch: {
    dimensions: [
      { key: 'persuasiveness', label: 'Persuasiveness & Storytelling', description: 'Value proposition articulation, resonance, and compelling storytelling (0-10)' },
      { key: 'objection_handling', label: 'Objection Handling & Negotiation', description: 'Rebuttal techniques, empathetic reframing, and commercial negotiation (0-10)' },
      { key: 'clarity', label: 'Pitch Clarity & Call to Action', description: 'Pacing, brevity, jargon-free solution positioning, and clear CTA (0-10)' },
    ],
    roleDesc: 'Chief Commercial Officer & Enterprise Sales Director',
  },
  managerial: {
    dimensions: [
      { key: 'conflict_resolution', label: 'Conflict Resolution & Diplomacy', description: 'Navigating interpersonal disputes, alignment building, and diplomacy (0-10)' },
      { key: 'delegation_reasoning', label: 'Delegation & Bandwidth Scaling', description: 'Task allocation, empowerment vs oversight balance, and bandwidth scaling (0-10)' },
      { key: 'leadership_judgment', label: 'Leadership & High-Stakes Judgment', description: 'Decision-making under pressure, team coaching, and performance management (0-10)' },
    ],
    roleDesc: 'Engineering Director & Managerial Bar Raiser',
  },
};

/**
 * Dynamically construct the Anthropic tool-use schema based on interviewSession.type
 */
function getScoringToolForType(type) {
  const rubric = RUBRIC_CONFIG[type] || RUBRIC_CONFIG.dsa;
  const properties = {};
  const requiredKeys = [];

  rubric.dimensions.forEach((dim) => {
    properties[dim.key] = {
      type: 'number',
      description: dim.description,
      minimum: 0,
      maximum: 10,
    };
    requiredKeys.push(dim.key);
  });

  properties.overall = {
    type: 'number',
    description: 'Overall holistic evaluation score (0-10 scale)',
    minimum: 0,
    maximum: 10,
  };
  requiredKeys.push('overall');

  properties.seniorityFit = {
    type: 'string',
    description: 'Level alignment verdict (e.g., L3 Junior, L4 Mid-Level, L5 Senior, L6+ Staff)',
  };

  properties.percentile = {
    type: 'number',
    description: 'Percentile rank among candidates targeting this tier (0-100)',
  };

  properties.strongPoints = {
    type: 'array',
    items: { type: 'string' },
    description: '3-4 concrete strengths demonstrated in this interview',
  };
  requiredKeys.push('strongPoints');

  properties.weakPoints = {
    type: 'array',
    items: { type: 'string' },
    description: '2-3 specific technical or strategic gaps that need improvement',
  };
  requiredKeys.push('weakPoints');

  properties.actionPlan = {
    type: 'array',
    items: { type: 'string' },
    description: '3-4 actionable practice recommendations for the candidate over the next 7 days',
  };
  requiredKeys.push('actionPlan');

  properties.feedback = {
    type: 'string',
    description: 'Comprehensive 3-4 sentence evaluation summary from the bar raiser.',
  };
  requiredKeys.push('feedback');

  return {
    name: 'submit_interview_score',
    description: `Submit structured evaluation for ${type} interview according to its specialized rubric.`,
    input_schema: {
      type: 'object',
      properties,
      required: requiredKeys,
    },
  };
}

/**
 * Build calibration header string from customConfig or tier settings
 */
function getCalibrationContext(sessionData) {
  const custom = sessionData.customConfig;
  if (custom && (custom.role || custom.targetCompany || custom.targetSalary)) {
    const role = custom.role || 'Senior Candidate';
    const company = custom.targetCompany || 'Target Organization';
    const region = custom.region === 'india' ? 'India' : 'US';
    const comp = custom.targetSalary
      ? custom.region === 'india'
        ? `₹${custom.targetSalary} LPA (INR)`
        : `$${custom.targetSalary}/year (USD)`
      : 'Competitive Market Standard';

    return `CALIBRATION REQUIREMENTS: Candidate is targeting "${role}" at "${company}" in ${region} market with target compensation ${comp}. Calibrate question depth, domain vocabulary, complexity, and hiring bar expectations specifically to this market profile.`;
  }

  const company = sessionData.targetCompany || (sessionData.companyTier === 'faang' ? 'Google / Meta / FAANG' : 'Tier-1 High-Growth Tech');
  const level = sessionData.seniorityLevel || 'L5 (Senior)';
  const comp = sessionData.targetPackage || '$250k - $380k';

  return `CALIBRATION REQUIREMENTS: Role target level is ${level} at ${company} (Compensation: ${comp}).`;
}

/**
 * Generate adaptive follow-up or next question via SSE stream
 */
async function streamAdaptiveQuestion({
  sessionType,
  companyTier,
  targetCompany,
  seniorityLevel,
  customConfig,
  turns,
  latestAnswer,
  onChunk,
  onDone,
  userId,
  sessionId,
  requestId,
  signal,
  personalizationDirective = '',
}) {
  const type = sessionType || 'dsa';
  const rubric = RUBRIC_CONFIG[type] || RUBRIC_CONFIG.dsa;
  const company = customConfig?.targetCompany || targetCompany || (companyTier === 'faang' ? 'Google / Meta / FAANG' : 'Tier-1 High-Growth Tech');
  const level = seniorityLevel || 'L5 (Senior)';
  const calibrationStr = getCalibrationContext({ sessionType: type, companyTier, targetCompany, seniorityLevel, customConfig });

  const systemPrompt = `You are a ${rubric.roleDesc} conducting a realistic ${type.toUpperCase()} interview at ${company}.
${calibrationStr}

CRITICAL INTERVIEWING RULES:
1. DO NOT say "Great answer!" or praise the candidate if their input is just a greeting ("hello", "hi"), uninformative, off-topic, or non-technical ("idk", "pass", "ok").
2. If candidate says "hello" / "hi": Greet back warmly and direct them to answer the current question: "Hello! When you are ready, please walk me through your solution or approach."
3. If candidate says "I don't know", "can I have a hint", or is stuck: Give a clear, helpful structural hint and ask how they would apply it.
4. If candidate gives a real answer: Critique their specific strategy, probe deeper on trade-offs, edge cases, metrics, or risk mitigation appropriate for a ${type} interview.
5. Keep responses direct and concise (2-4 sentences max). Never output markdown codeblocks unless specifically asking for code.
${personalizationDirective ? `
PERSONALIZATION DIRECTIVE (do not mention it explicitly): ${personalizationDirective}` : ''}`;

  const messages = [];
  for (const turn of turns) {
    messages.push({ role: 'assistant', content: turn.question });
    if (turn.answer && turn.answer.trim().length > 0) {
      messages.push({ role: 'user', content: safePromptWrap(turn.answer) });
    }
  }

  if (latestAnswer && (!messages.length || messages[messages.length - 1].content !== latestAnswer)) {
    messages.push({ role: 'user', content: safePromptWrap(latestAnswer) });
  }

  const shouldUseLlm = isLlmEnabled();
  if (!shouldUseLlm) {
    await simulateStreaming(type, company, level, customConfig, turns, latestAnswer, onChunk, onDone);
    return;
  }

  let emittedChars = 0;
  const outcome = await runWithResilience({
    label: 'turn_stream',
    userId,
    sessionId,
    requestId,
    reserveTokens: config.llm.reserveTurnTokens,
    fn: async () => {
      const guard = new OutputGuard(32);
      const controller = new AbortController();
      const abort = () => controller.abort();
      if (signal) signal.addEventListener('abort', abort, { once: true });

      let fullResponse = '';
      let promptTokens = 0;
      let completionTokens = 0;

      try {
        const stream = await anthropic.messages.create(
          {
            model: config.anthropic.model,
            max_tokens: 350,
            system: buildSystem(systemPrompt),
            messages,
            stream: true,
          },
          { signal: controller.signal }
        );

        for await (const messageStreamEvent of stream) {
          if (messageStreamEvent.type === 'message_start') {
            promptTokens = Number(messageStreamEvent.message?.usage?.input_tokens) || promptTokens;
          } else if (messageStreamEvent.type === 'message_delta') {
            completionTokens = Number(messageStreamEvent.usage?.output_tokens) || completionTokens;
          } else if (
            messageStreamEvent.type === 'content_block_delta' &&
            messageStreamEvent.delta.type === 'text_delta'
          ) {
            fullResponse += messageStreamEvent.delta.text;
            const safeChunk = guard.push(messageStreamEvent.delta.text);
            if (safeChunk) {
              emittedChars += safeChunk.length;
              onChunk(safeChunk);
            }
          }
        }

        const tail = guard.flush();
        if (tail) {
          emittedChars += tail.length;
          onChunk(tail);
        }

        return {
          fullResponse: fullResponse.trim(),
          usage: {
            input_tokens: promptTokens,
            output_tokens: completionTokens || Math.ceil(fullResponse.length / 4),
          },
          tokens: {
            promptTokens: promptTokens || Math.ceil(messages.reduce((acc, m) => acc + String(m.content).length, 0) / 4),
            completionTokens: completionTokens || Math.ceil(fullResponse.length / 4),
          },
        };
      } catch (err) {
        if (emittedChars > 0) {
          // Retrying after partial output would duplicate text in the client.
          err.partial = true;
          metrics.inc('prepai_llm_partial_streams_total');
        }
        throw err;
      } finally {
        if (signal) signal.removeEventListener('abort', abort);
      }
    },
  });

  if (outcome.ok) {
    logger.info('Adaptive follow-up question streamed via Claude', {
      type,
      company,
      turnsCount: turns.length,
      responseLength: outcome.result.fullResponse.length,
      attempts: outcome.attempts,
    });
    await onDone(outcome.result);
    return;
  }

  if (outcome.reason === 'provider_error' && outcome.error?.partial) {
    // The stream was already partially delivered; surface the failure instead
    // of appending a second, unrelated question.
    throw outcome.error;
  }

  logger.warn('LLM stream unavailable; using simulated fallback', {
    reason: outcome.reason,
    error: outcome.error?.message,
  });
  metrics.inc('prepai_llm_fallback_total', { label: 'turn_stream', reason: outcome.reason || 'unknown' });
  await simulateStreaming(type, company, level, customConfig, turns, latestAnswer, onChunk, onDone);
}

async function simulateStreaming(sessionType, company, level, customConfig, turns, latestAnswer, onChunk, onDone) {
  const simulatedText = generateSimulatedQuestion(sessionType, company, level, customConfig, turns, latestAnswer);
  const words = simulatedText.split(' ');
  for (let i = 0; i < words.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    onChunk(words[i] + (i === words.length - 1 ? '' : ' '));
  }
  await onDone({
    fullResponse: simulatedText,
    tokens: {
      promptTokens: 80,
      completionTokens: Math.ceil(simulatedText.length / 4),
    },
    fallback: true,
  });
}

/**
 * Intelligent simulated response generator for all 8 interview types
 */
function generateSimulatedQuestion(sessionType, company, level, customConfig, turns, latestAnswer) {
  const cleanAns = (latestAnswer || '').trim().toLowerCase();
  const count = turns ? turns.length : 0;
  const targetCompany = customConfig?.targetCompany || company || 'Target Company';
  const roleName = customConfig?.role || level;

  // 1. Detect Greetings
  const greetings = ['hello', 'hi', 'hey', 'good morning', 'good evening', 'howdy', 'yo', 'sup'];
  if (greetings.includes(cleanAns) || cleanAns.startsWith('hello ') || cleanAns.startsWith('hi ')) {
    return `Hello! Welcome to your ${sessionType.toUpperCase()} mock interview for ${targetCompany} (${roleName}). When you're ready, please share your thoughts or walk me through your solution approach.`;
  }

  // 2. Detect Stuck / Pass / Request for Hint
  if (
    cleanAns.includes('dont know') ||
    cleanAns.includes("don't know") ||
    cleanAns.includes('idk') ||
    cleanAns.includes('hint') ||
    cleanAns.includes('pass') ||
    cleanAns.includes('stuck') ||
    cleanAns.includes('help')
  ) {
    if (sessionType === 'dsa') {
      return `No problem, let's break it down together! A helpful pattern here is trading auxiliary space for time: can we store elements in a Hash Map to achieve $O(1)$ lookups instead of checking nested pairs?`;
    } else if (sessionType === 'system_design') {
      return `No worries! Let's start with the basics: we need a stateless API layer, a distributed ID generator (e.g. Snowflake), and a fast key-value store. Which storage engine would you pick for fast reads?`;
    } else if (sessionType === 'hr_round') {
      return `Take your time! Think about a specific milestone in your career journey that demonstrates your adaptability and communication when working with tight deadlines. What situation comes to mind?`;
    } else if (sessionType === 'case_study') {
      return `Let's structure the problem using an issue tree: segment revenue into volume $\\times$ price, and cost into fixed vs variable. Which lever would you analyze first?`;
    } else if (sessionType === 'product_management') {
      return `A helpful PM framework is CIRCLES: define the user persona, their core pain point, brainstorm 3 potential solutions, and prioritize based on impact vs effort. Who is the primary target persona?`;
    } else if (sessionType === 'sales_pitch') {
      return `Focus on the customer's pain point first rather than product features. What is the single biggest financial risk or operational bottleneck the client is experiencing today?`;
    } else if (sessionType === 'managerial') {
      return `Think about delegation and coaching: what framework do you use to assess whether an underperforming engineer needs skill training or motivation alignment?`;
    } else {
      return `Take a breath! A great way to structure this is using the STAR method: Situation, Task, Action, and measurable Result. What project comes to mind?`;
    }
  }

  // 3. Detect Clarifying Questions from Candidate
  if (cleanAns.includes('?') || cleanAns.includes('what is the') || cleanAns.includes('how many') || cleanAns.includes('traffic')) {
    if (sessionType === 'system_design') {
      return `Great clarifying question! For our design at ${targetCompany}, assume 100 Million daily active users with a 10:1 read-to-write ratio, and we need 99.99% availability with < 50ms latency. How would that influence your caching and database partitioning?`;
    } else if (sessionType === 'case_study') {
      return `Good inquiry on the market bounds. Assume the addressable market is $1.2B with a 15% CAGR, and our client currently holds an 8% market share. How would you prioritize growth vectors?`;
    } else if (sessionType === 'product_management') {
      return `Assume our primary goal this quarter is increasing 30-day retention by 5% without increasing customer acquisition cost. Which user cohort would you focus on?`;
    } else {
      return `Good catch on the constraints. Assume scale $N \\le 10^5$, standard latency SLOs, and memory capped at typical limits. How would you proceed?`;
    }
  }

  // 4. Detect Too Short / Vague
  const words = cleanAns.split(/\s+/).filter(Boolean);
  if (words.length < 4) {
    return `That's quite brief for a ${roleName} bar at ${targetCompany}. Could you elaborate on your specific reasoning, framework, and trade-offs?`;
  }

  // 5. Genuine Answers — Probing Follow-ups per Type
  if (count <= 1) {
    switch (sessionType) {
      case 'hr_round':
        return `Thank you for sharing that background. How do you ensure alignment when working cross-functionally with stakeholders whose priorities conflict with your team's roadmap?`;
      case 'case_study':
        return `Solid initial breakdown. If variable customer acquisition cost spikes by 35% in year two due to ad saturation, what pricing or channel pivot would you recommend to preserve EBITDA?`;
      case 'product_management':
        return `Interesting solution concept. What is the North Star metric you would use to measure launch success, and what counter-metric would you track to prevent unintended user churn?`;
      case 'sales_pitch':
        return `Compelling value proposition. The prospect's CFO responds: "We already have an in-house tool that costs nothing, why should we sign a $150k ARR contract?" How do you address this objection?`;
      case 'managerial':
        return `Good perspective on leadership. When inheriting a team with low psychological safety and missed delivery commitments, what are the concrete actions you take in your first 30 days?`;
      case 'system_design':
        return `Good architectural breakdown. At ${targetCompany} scale, how do you prevent cache thundering herd and handle database master-replica replication lag when a user immediately reads their own write?`;
      case 'dsa':
      default:
        return `Solid reasoning on that approach. What are the exact time and space complexities, and how would you handle duplicate keys or integer overflow if target is close to boundaries?`;
    }
  } else {
    switch (sessionType) {
      case 'hr_round':
        return `Great depth. Where do you see yourself contributing most significantly at ${targetCompany} over a 3-year horizon, and what support do you look for from leadership?`;
      case 'case_study':
        return `Excellent quantitative synthesis. Walk me through your executive 1-page recommendation slide for the CEO: what is the go/no-go decision and key operational risks?`;
      case 'product_management':
        return `Thoughtful trade-off analysis. If engineering estimates this feature at 6 sprints but leadership needs an MVP in 2 sprints, what specific scope do you de-prioritize?`;
      case 'sales_pitch':
        return `Great objection handling. How do you transition this conversation into a definitive closing timeline and get executive alignment on a pilot rollout?`;
      case 'managerial':
        return `Very mature leadership approach. How do you balance coaching high performers for promotion while managing out consistently underperforming team members with empathy and rigor?`;
      default:
        return `Excellent depth throughout this discussion. To synthesize our findings, walk me through your operational validation and edge-case testing strategy at ${targetCompany}.`;
    }
  }
}

/**
 * Dynamically generate a tailor-made opening question using Claude 3.5 Sonnet
 */
async function generateOpeningQuestion({
  sessionType,
  companyTier,
  targetCompany,
  seniorityLevel,
  targetPackage,
  customConfig,
  userId,
  sessionId,
  requestId,
}) {
  const type = sessionType || 'dsa';
  const rubric = RUBRIC_CONFIG[type] || RUBRIC_CONFIG.dsa;
  const company = customConfig?.targetCompany || targetCompany || (companyTier === 'faang' ? 'Google / Meta / FAANG' : 'Tier-1 High-Growth Tech');
  const level = customConfig?.role || seniorityLevel || 'L5 (Senior)';
  const calibrationStr = getCalibrationContext({ sessionType: type, companyTier, targetCompany, seniorityLevel, targetPackage, customConfig });

  if (!isLlmEnabled()) {
    return null;
  }

  const customFingerprint = customConfig
    ? [customConfig.role, customConfig.targetCompany, customConfig.region, customConfig.targetSalary].join('|')
    : '';
  const cacheKey = [
    'llm',
    'opening',
    PROMPT_VERSION,
    type,
    companyTier || '',
    company,
    level,
    customFingerprint,
  ].join(':');

  const cached = await cache.get(cacheKey);
  if (cached) {
    metrics.inc('prepai_cache_hits_total', { cache: 'opening_question' });
    logger.info('Serving opening question from two-tier cache (0 API cost)', { company, level, sessionType: type });
    return cached;
  }

  const prompt = `You are a ${rubric.roleDesc} at ${company}. Generate an authentic, challenging, high-depth opening ${type.toUpperCase()} interview question.
${calibrationStr}

Track-Specific Rules:
1. DSA: State clear input constraints, data types, and ask for time/space complexity analysis.
2. System Design: State realistic scale metrics (DAU, QPS, latency SLOs) and ask for architecture plus deep-dive component trade-offs.
3. Behavioral: Ask a multi-faceted question requiring STAR methodology, focusing on technical conflict, ownership, or high-stakes outages.
4. HR Round: Ask about career transitions, cultural values, conflict resolution, or navigating company-wide organizational change.
5. Case Study: Present a business or market challenge requiring MECE structuring, market sizing, or profitability turnaround.
6. Product Management: Ask for product design, feature prioritization (RICE), or metric degradation root-cause analysis.
7. Sales Pitch: Present an enterprise scenario where the prospect has budget constraints or incumbent loyalty and ask for the pitch/rebuttal.
8. Managerial: Ask how to handle a struggling direct report, cross-team roadmap collision, or organizational restructure.

Output ONLY the question prompt itself in 2-4 sentences. Do not add conversational intro greetings like "Here is your question:".`;

  const outcome = await callClaude({
    label: 'opening',
    maxTokens: 300,
    system: 'You are a senior interview question author. Return only the question text.',
    messages: [{ role: 'user', content: prompt }],
    timeoutMs: config.llm.openingTimeoutMs,
    userId,
    sessionId,
    requestId,
    reserveTokens: config.llm.reserveOpeningTokens,
  });

  if (!outcome.ok) {
    logger.warn('Dynamic question generation via Anthropic failed, falling back to QuestionBank', {
      reason: outcome.reason,
      error: outcome.error?.message,
    });
    metrics.inc('prepai_llm_fallback_total', { label: 'opening', reason: outcome.reason || 'unknown' });
    return null;
  }

  const questionText = outcome.data.content?.[0]?.text?.trim();
  if (!questionText || questionText.length < 20) return null;

  // Never cache unsafe or leaked output.
  const safeQuestion = redactOutput(questionText);
  await cache.set(cacheKey, safeQuestion, 6 * 60 * 60);
  logger.info('Dynamically generated and cached opening question via Claude', {
    company,
    level,
    sessionType: type,
    promptVersion: PROMPT_VERSION,
  });
  return safeQuestion;
}

/**
 * Dynamically construct the Anthropic tool-use schema for turn scoring
 */
function getTurnScoringToolForType(type) {
  const rubric = RUBRIC_CONFIG[type] || RUBRIC_CONFIG.dsa;
  const properties = {};
  const requiredKeys = [];

  rubric.dimensions.forEach((dim) => {
    properties[dim.key] = {
      type: 'number',
      description: `Score for ${dim.label} on a 0.0 to 10.0 scale`,
      minimum: 0,
      maximum: 10,
    };
    requiredKeys.push(dim.key);
  });

  properties.topicTags = {
    type: 'array',
    items: { type: 'string' },
    description: '1 to 3 specific domain topic tags (e.g., "Dynamic Programming", "Distributed Caching", "STAR Method", "Time Complexity", "System Design Trade-offs", "Negotiation")',
  };
  requiredKeys.push('topicTags');

  properties.reasoning = {
    type: 'string',
    description: '1-2 concise sentences explaining specifically why this score was awarded, referencing concrete strengths or vagueness.',
  };
  requiredKeys.push('reasoning');

  return {
    name: 'submit_turn_score',
    description: `Submit structured rubric scoring, topic tags, and reasoning for this specific interview turn.`,
    input_schema: {
      type: 'object',
      properties,
      required: requiredKeys,
    },
  };
}

/**
 * Score an individual turn silently and return structured turn score
 */
async function scoreTurnWithTool({
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
  const type = sessionType || 'dsa';
  const rubric = RUBRIC_CONFIG[type] || RUBRIC_CONFIG.dsa;
  const company = customConfig?.targetCompany || targetCompany || (companyTier === 'faang' ? 'Google / Meta / FAANG' : 'Tier-1 High-Growth Tech');
  const level = seniorityLevel || 'L5 (Senior)';

  const cleanAns = (answer || '').trim();
  if (!cleanAns || cleanAns.length === 0) {
    return generateSimulatedTurnScore({ sessionType: type, question, answer: cleanAns });
  }

  if (!isLlmEnabled()) {
    return generateSimulatedTurnScore({ sessionType: type, question, answer: cleanAns });
  }

  const scoringTool = getTurnScoringToolForType(type);
  const dimensionList = rubric.dimensions.map((d) => `- ${d.key} (${d.label}): ${d.description}`).join('\n');

  const systemPrompt = `You are an elite ${rubric.roleDesc} at ${company} conducting a ${type.toUpperCase()} interview (${level}).
Your job is to rigorously evaluate THIS SINGLE INTERVIEW TURN using calibrated rubric anchors.

RUBRIC DIMENSIONS:
${dimensionList}

CALIBRATED SCORING ANCHORS & BIAS REDUCTION RULES:
1. PENALIZE VAGUENESS, REWARD SPECIFICITY:
   - Example 3/10 (Vague): "Just use a hash map" or "Put a Redis cache and load balancer" -> Score 2.0 - 3.5.
   - Example 6/10 (Moderate): "Iterate through the array and store items in a hash map to find complements" -> Score 5.5 - 6.5.
   - Example 9/10 (Exceptional): "Use a single-pass hash map keyed on target - nums[i] mapping to index i, achieving O(n) time and O(n) space with O(1) amortized lookups and explicit handling of duplicates" -> Score 8.5 - 9.5.

2. SPECIFIC TRACK RULES:
   - DSA: Must explicitly evaluate algorithmic correctness, asymptotic time/space bounds, and corner cases.
   - System Design: Must evaluate capacity numbers, single points of failure, partition tolerance, and replication lag.
   - Behavioral / HR: Must evaluate STAR framework structure, quantified personal impact, and cross-functional alignment.
   - PM / Case Study / Sales / Managerial: Must evaluate structured frameworks, root-cause depth, and executive communication.

3. TOPIC TAGS:
   - Identify 1-3 precise, canonical topic tags (e.g. "Dynamic Programming", "Hash Maps", "System Design Trade-offs", "Distributed Caching", "STAR Method", "Capacity Planning").

4. REASONING:
   - Provide 1-2 sentences of direct, objective reasoning justifying the scores.

Invoke the submit_turn_score tool to submit the result.`;

  const outcome = await callClaude({
    label: 'turn_score',
    maxTokens: 600,
    system: systemPrompt,
    tools: [scoringTool],
    toolChoice: { type: 'tool', name: 'submit_turn_score' },
    messages: [
      {
        role: 'user',
        content: `QUESTION ASKED:\n${sanitizeInput(question, 2000)}\n\nCANDIDATE'S ANSWER:\n${safePromptWrap(cleanAns)}\n\nPlease evaluate this response objectively using the rubric anchors and return the turn scores.`,
      },
    ],
    userId,
    sessionId,
    requestId,
    reserveTokens: config.llm.reserveTurnTokens,
  });

  if (!outcome.ok) {
    logger.warn('Anthropic turn scoring unavailable, using calibrated simulation', {
      reason: outcome.reason,
      error: outcome.error?.message,
    });
    metrics.inc('prepai_llm_fallback_total', { label: 'turn_score', reason: outcome.reason || 'unknown' });
    return generateSimulatedTurnScore({ sessionType: type, question, answer: cleanAns });
  }

  try {
    const toolBlock = outcome.data.content.find((block) => block.type === 'tool_use' && block.name === 'submit_turn_score');
    if (!toolBlock || !toolBlock.input) {
      throw new Error('Claude did not return a valid submit_turn_score block');
    }

    const input = toolBlock.input;
    const dimensionScores = {};
    rubric.dimensions.forEach((dim) => {
      dimensionScores[dim.key] = Number(input[dim.key]) || 6.0;
    });

    return {
      dimensionScores,
      topicTags: Array.isArray(input.topicTags) && input.topicTags.length > 0 ? input.topicTags : extractDefaultTopicTags(type, question),
      reasoning: input.reasoning || 'Turn evaluated based on response clarity and correctness.',
      rubricVersion: RUBRIC_VERSION,
    };
  } catch (err) {
    logger.warn('Anthropic turn scoring response malformed, using calibrated simulation', { error: err.message });
    return generateSimulatedTurnScore({ sessionType: type, question, answer: cleanAns });
  }
}

/**
 * Intelligent calibrated simulated turn score generator
 */
function generateSimulatedTurnScore({ sessionType, question, answer }) {
  const type = sessionType || 'dsa';
  const rubric = RUBRIC_CONFIG[type] || RUBRIC_CONFIG.dsa;
  const cleanAns = (answer || '').trim().toLowerCase();
  const words = cleanAns.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const topicTags = extractDefaultTopicTags(type, question);
  const dimensionScores = {};

  // Tier A: Empty, greeting, or uninformative ("just use a map", "idk", "pass", "hello") (Score 2.0 - 3.5)
  const isGreetingOrPass =
    cleanAns === 'hello' ||
    cleanAns === 'hi' ||
    cleanAns === 'hey' ||
    cleanAns === 'pass' ||
    cleanAns === 'idk' ||
    cleanAns.includes("don't know") ||
    cleanAns.includes('i dont know');

  const isVeryVague = wordCount < 10 || isGreetingOrPass;

  if (isVeryVague) {
    rubric.dimensions.forEach((dim, idx) => {
      dimensionScores[dim.key] = Number((2.2 + (idx % 2) * 0.4).toFixed(1));
    });
    return {
      dimensionScores,
      topicTags,
      reasoning: 'Candidate provided an uninformative or overly brief response without structured reasoning or complexity analysis.',
    };
  }

  // Tier B: Mediocre / Moderate (Score 5.5 - 6.5)
  // Has some substance (10+ words) but lacks deep rigor or edge-case handling
  const seniorKeywords = [
    'o(', 'o(1)', 'o(n)', 'o(log', 'o(n log n)', 'time complexity', 'space complexity',
    'complexity', 'trade-off', 'tradeoff', 'bottleneck', 'throughput', 'latency',
    'hash map', 'hashmap', 'lookup', 'amortized', 'invariants', 'edge case',
    'star method', 'situation', 'task', 'action', 'result', 'framework', 'scalable',
    'cache', 'sharding', 'replica', 'consistency'
  ];
  const matchedKeywordsCount = seniorKeywords.filter((kw) => cleanAns.includes(kw)).length;
  const isHighQuality = (wordCount >= 20 && matchedKeywordsCount >= 2) || (wordCount >= 35 && matchedKeywordsCount >= 1);

  if (!isHighQuality) {
    rubric.dimensions.forEach((dim, idx) => {
      const base = idx === 0 ? 6.0 : idx === 1 ? 5.8 : 5.5;
      dimensionScores[dim.key] = Number((base + (idx % 2 === 0 ? 0.2 : -0.1)).toFixed(1));
    });
    return {
      dimensionScores,
      topicTags,
      reasoning: 'Candidate showed basic conceptual familiarity, but the response lacked deep complexity analysis, edge-case mitigation, or concrete trade-offs.',
    };
  }

  // Tier C: Exceptional / Senior / FAANG Bar (Score 8.5 - 9.5)
  rubric.dimensions.forEach((dim, idx) => {
    const base = idx === 0 ? 9.0 : idx === 1 ? 8.8 : idx === 2 ? 8.6 : 8.5;
    dimensionScores[dim.key] = Number(Math.min(9.8, base + (idx % 2 === 0 ? 0.2 : -0.1)).toFixed(1));
  });

  return {
    dimensionScores,
    topicTags,
    reasoning: 'Demonstrated high technical precision with clear structural rationale, explicit complexity trade-offs, and edge-case consideration.',
  };
}

/**
 * Extract default canonical topic tags based on interview type and question keywords
 */
function extractDefaultTopicTags(type, questionText) {
  const text = (questionText || '').toLowerCase();
  const tags = [];

  if (type === 'dsa') {
    if (text.includes('tree') || text.includes('binary')) tags.push('Trees & Graphs');
    else if (text.includes('array') || text.includes('subarray')) tags.push('Arrays & Sliding Window');
    else if (text.includes('dynamic') || text.includes('dp')) tags.push('Dynamic Programming');
    else if (text.includes('hash') || text.includes('map')) tags.push('Hash Maps');
    else if (text.includes('cache') || text.includes('lru')) tags.push('LRU Cache');
    else tags.push('Algorithms');
    tags.push('Time Complexity');
  } else if (type === 'system_design') {
    if (text.includes('url') || text.includes('bit.ly')) tags.push('URL Shortener');
    else if (text.includes('rate limit')) tags.push('Distributed Rate Limiter');
    else if (text.includes('kafka') || text.includes('stream')) tags.push('Event Streaming & Kafka');
    else tags.push('Distributed Systems');
    tags.push('System Design Trade-offs');
  } else if (type === 'behavioral') {
    tags.push('STAR Method');
    if (text.includes('conflict') || text.includes('disagreement')) tags.push('Conflict Resolution');
    else tags.push('Technical Leadership');
  } else if (type === 'hr_round') {
    tags.push('Career Trajectory');
    tags.push('Culture & Values');
  } else if (type === 'case_study') {
    tags.push('MECE Framework');
    tags.push('Market Sizing');
  } else if (type === 'product_management') {
    tags.push('Product Sense & Prioritization');
    tags.push('Metrics & Trade-offs');
  } else if (type === 'sales_pitch') {
    tags.push('Value Proposition');
    tags.push('Objection Handling');
  } else if (type === 'managerial') {
    tags.push('People Leadership');
    tags.push('Delegation & Strategy');
  } else {
    tags.push('General Problem Solving');
  }

  return tags.slice(0, 3);
}

/**
 * Perform deep structured scoring using dynamic tool use per session type
 * Session score is a WEIGHTED AGGREGATE of individual turn scores.
 */
async function scoreInterviewWithTool(sessionData, { requestId } = {}) {
  const sessionType = sessionData.type || 'dsa';
  const rubric = RUBRIC_CONFIG[sessionType] || RUBRIC_CONFIG.dsa;
  const company = sessionData.customConfig?.targetCompany || sessionData.targetCompany || 'Target Organization';
  const level = sessionData.seniorityLevel || 'L5 (Senior)';
  const calibrationStr = getCalibrationContext(sessionData);

  const turns = sessionData.turns || [];
  const answeredTurns = turns.filter((t) => t.answer && t.answer.trim().length > 0);

  // 1. Calculate weighted dimension scores from turn scores
  const validTurnScores = turns
    .map((t, idx) => ({ turnScore: t.turnScore, idx, hasAnswer: Boolean(t.answer && t.answer.trim()) }))
    .filter((item) => item.hasAnswer && item.turnScore && item.turnScore.dimensionScores);

  const aggregatedDimensions = {};
  let computedOverall = 0;

  if (validTurnScores.length > 0) {
    const totalWeights = validTurnScores.reduce(
      (sum, item) => sum + (1.0 + (item.idx / Math.max(1, turns.length - 1)) * 0.2),
      0
    );

    rubric.dimensions.forEach((dim) => {
      let weightedSum = 0;
      validTurnScores.forEach((item) => {
        const weight = 1.0 + (item.idx / Math.max(1, turns.length - 1)) * 0.2;
        const score = typeof item.turnScore.dimensionScores.get === 'function'
          ? item.turnScore.dimensionScores.get(dim.key)
          : item.turnScore.dimensionScores[dim.key] || 0;
        weightedSum += (Number(score) || 0) * weight;
      });
      aggregatedDimensions[dim.key] = Number((weightedSum / totalWeights).toFixed(1));
    });

    const dimValues = Object.values(aggregatedDimensions);
    computedOverall = Number((dimValues.reduce((a, b) => a + b, 0) / Math.max(1, dimValues.length)).toFixed(1));
  }

  // If candidate gave 0 answers, award 0.0 immediately
  if (answeredTurns.length === 0) {
    return generateSimulatedScore(sessionData);
  }

  // Deterministic adversarial override. A model must never be able to award a
  // passing score to a transcript containing prompt-injection attempts, even
  // if the provider ignores the hardened system directive.
  const hasInjection = answeredTurns.some((t) => containsPromptInjection(t.answer));
  if (hasInjection) {
    logger.warn('Adversarial transcript detected; forcing deterministic penalty score', {
      type: sessionType,
    });
    metrics.inc('prepai_adversarial_scoring_total', { type: sessionType });
    return generateSimulatedScore(sessionData);
  }

  // Low-effort / non-answer guard. Asking the model to grade "idk lol" invites
  // inconsistent generosity, so transcripts below the minimum substantive
  // length use the deterministic low-score path instead.
  const totalAnswerWords = answeredTurns.reduce(
    (sum, t) => sum + (t.answer.trim().split(/s+/).filter(Boolean).length || 0),
    0
  );
  if (totalAnswerWords < 15) {
    metrics.inc('prepai_low_effort_scoring_total', { type: sessionType });
    return generateSimulatedScore(sessionData);
  }

  if (!isLlmEnabled()) {
    const simScore = generateSimulatedScore(sessionData);
    if (validTurnScores.length > 0) {
      Object.assign(simScore, aggregatedDimensions);
      simScore.overall = computedOverall;
    }
    return simScore;
  }

  const scoringTool = getScoringToolForType(sessionType);
  const dimensionSummary = Object.entries(aggregatedDimensions)
    .map(([k, v]) => `- ${k}: ${v}/10`)
    .join('\n');

  const transcript = turns
    .map(
      (t, idx) =>
        `Turn ${idx + 1}:\nInterviewer: ${sanitizeInput(t.question, 2000)}\nCandidate: ${
          t.answer ? safePromptWrap(t.answer) : '(No answer provided)'
        }`
    )
    .join('\n\n');

  const systemPrompt = `You are a ${rubric.roleDesc} evaluating a candidate's ${sessionType.toUpperCase()} interview at ${company}.
${calibrationStr}

PRE-COMPUTED AGGREGATED METRICS:
${dimensionSummary || 'Aggregating from transcript'}
Overall Score: ${computedOverall || 'Derive from transcript'}

CRITICAL INSTRUCTION:
Your primary responsibility is to write the human-readable feedback paragraph, identify the top 3 strengths and 2-3 weak areas across all turns, and outline a 7-day action plan. Use the pre-computed dimension scores if provided.

Invoke submit_interview_score to output the evaluation.`;

  const outcome = await callClaude({
    label: 'final_score',
    maxTokens: 1200,
    system: systemPrompt,
    tools: [scoringTool],
    toolChoice: { type: 'tool', name: 'submit_interview_score' },
    messages: [
      {
        role: 'user',
        content: `Here is the full interview transcript for a ${sessionType} interview at ${company}:\n\n${transcript}\n\nPlease generate the evaluation feedback summary, strengths, weaknesses, and 7-day action plan.`,
      },
    ],
    userId: sessionData.userId,
    sessionId: sessionData._id ? String(sessionData._id) : undefined,
    requestId,
    reserveTokens: config.llm.reserveFinalScoreTokens,
  });

  if (!outcome.ok) {
    logger.warn('Anthropic scoring unavailable, using calculated score', {
      reason: outcome.reason,
      error: outcome.error?.message,
    });
    metrics.inc('prepai_llm_fallback_total', { label: 'final_score', reason: outcome.reason || 'unknown' });
    const simScore = generateSimulatedScore(sessionData);
    if (validTurnScores.length > 0) {
      Object.assign(simScore, aggregatedDimensions);
      simScore.overall = computedOverall;
    }
    return simScore;
  }

  try {
    const toolBlock = outcome.data.content.find((block) => block.type === 'tool_use' && block.name === 'submit_interview_score');
    if (!toolBlock || !toolBlock.input) {
      throw new Error('Claude did not return a valid tool_use score block');
    }

    const output = { ...toolBlock.input };
    // Preserve the mathematically aggregated scores from turn scores
    if (validTurnScores.length > 0) {
      Object.assign(output, aggregatedDimensions);
      output.overall = computedOverall;
    } else {
      rubric.dimensions.forEach((d) => {
        output[d.key] = Number(output[d.key]) || 7.0;
      });
      output.overall = Number(output.overall) || 7.0;
    }

    output.seniorityFit = output.seniorityFit || (output.overall >= 8.0 ? `${level} (Offer Ready)` : output.overall >= 6.0 ? 'Mid-Level Candidate' : 'Needs Preparation');
    output.percentile = Number(output.percentile) || Math.min(99, Math.max(10, Math.round(output.overall * 10.2)));
    output.strongPoints = output.strongPoints?.length ? output.strongPoints : ['Demonstrated core technical methodology'];
    output.weakPoints = output.weakPoints?.length ? output.weakPoints : ['Could delve deeper into trade-offs and edge cases'];
    output.actionPlan = output.actionPlan?.length ? output.actionPlan : ['Practice structured response frameworks'];
    output.feedback = output.feedback || 'Evaluation completed based on transcript analysis.';

    return output;
  } catch (err) {
    logger.warn('Anthropic scoring error, using calculated score', { error: err.message });
    const simScore = generateSimulatedScore(sessionData);
    if (validTurnScores.length > 0) {
      Object.assign(simScore, aggregatedDimensions);
      simScore.overall = computedOverall;
    }
    return simScore;
  }
}

/**
 * Realistic calculated fallback scoring adhering to type-specific rubrics
 */
function generateSimulatedScore(sessionData) {
  const sessionType = sessionData.type || 'dsa';
  const rubric = RUBRIC_CONFIG[sessionType] || RUBRIC_CONFIG.dsa;
  const turns = sessionData.turns || [];
  const answeredTurns = turns.filter((t) => t.answer && t.answer.trim().length > 0);
  const totalWords = answeredTurns.reduce((acc, t) => acc + (t.answer.trim().split(/\s+/).length || 0), 0);
  const targetLevel = sessionData.customConfig?.role || sessionData.seniorityLevel || 'L5 (Senior)';
  const company = sessionData.customConfig?.targetCompany || sessionData.targetCompany || 'Target Organization';

  // 1. Complete Empty / Zero Answers Submitted (0.0 Marks)
  if (answeredTurns.length === 0 || totalWords === 0) {
    const emptyScore = {
      overall: 0.0,
      percentile: 0,
      seniorityFit: 'Incomplete / No Answers Submitted',
      strongPoints: ['Session started, but no candidate answers were recorded.'],
      weakPoints: [
        'Candidate submitted the session without providing answers to the interviewer questions.',
        'Zero structured responses, methodology, or problem-solving demonstrated.',
      ],
      actionPlan: [
        'Day 1-2: Review core interview tracks and preparation frameworks.',
        'Day 3-5: Practice completing at least 1 full mock interview with active spoken/written responses.',
      ],
      feedback: `No score awarded (0.0 / 10). The interview session was completed without providing answers to the questions. To receive a valid hiring bar diagnostic, please provide responses during the session.`,
    };
    rubric.dimensions.forEach((d) => {
      emptyScore[d.key] = 0.0;
    });
    return emptyScore;
  }

  // 2. Prompt Injection / Adversarial Attempt (0.5 Marks)
  const hasInjection = turns.some((t) => t.answer && require('../utils/security').containsPromptInjection(t.answer));
  if (hasInjection) {
    const injectionScore = {
      overall: 0.5,
      percentile: 1,
      seniorityFit: 'Adversarial Bypass Detected (Unrated)',
      strongPoints: ['Attempted interaction with the interview interface.'],
      weakPoints: [
        'Candidate attempted meta-prompt injection / adversarial instructions rather than answering the problem.',
        'Zero role-relevant principles demonstrated.',
      ],
      actionPlan: [
        'Day 1-7: Review hiring bar standards and focus strictly on genuine problem-solving methodology.',
      ],
      feedback: `The hiring committee flagged this session due to non-technical adversarial inputs. Real hiring bars require rigorous problem solving.`,
    };
    rubric.dimensions.forEach((d) => {
      injectionScore[d.key] = 0.5;
    });
    return injectionScore;
  }

  // 3. Minimal / Greetings only (< 15 words) (1.0 Marks)
  if (totalWords < 15) {
    const minimalScore = {
      overall: 1.0,
      percentile: 2,
      seniorityFit: 'Needs Full Preparation',
      strongPoints: ['Connected to interview session environment.'],
      weakPoints: [
        'Candidate provided only brief greetings or single-word non-technical answers.',
        'Did not provide structured analysis, trade-offs, or framework application.',
      ],
      actionPlan: [
        'Day 1-2: Review fundamental concepts and frameworks for this interview track.',
        'Day 3-4: Practice speaking detailed 3-5 sentence structured responses out loud.',
        'Day 5-7: Complete 3 full mock interview sessions with thorough answers.',
      ],
      feedback: `The candidate provided brief non-technical responses that fall well below the evaluation bar at ${company}. Substantial depth and solution breakdown are required for scoring.`,
    };
    rubric.dimensions.forEach((d, idx) => {
      minimalScore[d.key] = idx === 0 ? 1.5 : 0.5;
    });
    return minimalScore;
  }

  // 4. Moderate / Mid-Level vs Senior Scoring
  const isSeniorWords = totalWords >= 45;
  const isMidWords = totalWords >= 25;

  let overall = isSeniorWords ? 8.6 : isMidWords ? 7.1 : 4.8;
  let percentile = isSeniorWords ? 93 : isMidWords ? 74 : 42;
  let seniorityFit = isSeniorWords ? `${targetLevel} (Offer Ready)` : isMidWords ? 'Mid-Level Candidate' : 'Associate / Needs Prep';

  const scoredResult = {
    overall,
    percentile,
    seniorityFit,
    strongPoints: [
      `Demonstrated solid methodology aligned with ${company} hiring standards.`,
      'Structured communication and clear framework application.',
      'Proactively evaluated key trade-offs and operational constraints.',
    ],
    weakPoints: [
      'Could dive deeper into quantitative edge cases and contingency planning.',
      'Could provide more concrete metrics-backed examples from past experience.',
    ],
    weakTopics: [
      'Edge Case Validation & Concurrency',
      'Asymptotic Complexity Bounds',
    ],
    actionPlan: [
      'Day 1-2: Deep dive into industry-standard frameworks for this interview track.',
      'Day 3-4: Practice structured 4-step problem breakdown on complex real-world scenarios.',
      'Day 5-7: Mock 2 full-length sessions focusing on stakeholder alignment and trade-offs.',
    ],
    feedback: isSeniorWords
      ? `Outstanding performance calibrated for ${company} (${targetLevel}). Demonstrated mastery over core competencies, clear modularity, and structured reasoning.`
      : `Solid foundational performance suitable for mid-level evaluation at ${company}. Strengthening quantitative justification and edge-case coverage will elevate your score to senior band.`,
  };

  rubric.dimensions.forEach((d, idx) => {
    const variance = (idx % 2 === 0 ? 0.2 : -0.3);
    scoredResult[d.key] = Number(Math.min(10, Math.max(1, overall + variance)).toFixed(1));
  });

  return scoredResult;
}

module.exports = {
  RUBRIC_CONFIG,
  PROMPT_VERSION,
  RUBRIC_VERSION,
  isLlmEnabled,
  getScoringToolForType,
  getTurnScoringToolForType,
  scoreTurnWithTool,
  generateSimulatedTurnScore,
  streamAdaptiveQuestion,
  scoreInterviewWithTool,
  generateSimulatedScore,
  generateOpeningQuestion,
};
