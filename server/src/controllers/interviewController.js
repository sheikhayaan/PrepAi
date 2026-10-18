const crypto = require('crypto');
const InterviewSession = require('../models/InterviewSession');
const QuestionBank = require('../models/QuestionBank');
const {
  streamAdaptiveQuestion,
  generateOpeningQuestion,
  scoreTurnWithTool,
  PROMPT_VERSION,
  RUBRIC_VERSION,
} = require('../services/anthropicClient');
const { addScoringJob } = require('../jobs/scoringQueue');
const { sanitizeInput } = require('../utils/security');
const cache = require('../utils/cache');
const config = require('../config/env');
const streamRegistry = require('../sse/streamRegistry');
const connectionRegistry = require('../sse/connectionRegistry');
const { prepareSse, getLastEventId, getClientIp } = require('../sse/sseTransport');
const featureStore = require('../learning/featureStore');
const selectionPolicy = require('../learning/selectionPolicy');
const { getPersonalization } = require('../learning/personalization');
const logger = require('../utils/logger');

const VALID_INTERVIEW_TYPES = [
  'dsa',
  'system_design',
  'behavioral',
  'hr_round',
  'case_study',
  'product_management',
  'sales_pitch',
  'managerial',
];

// @desc   Start a new interview session with company tier, seniority, package or customConfig
// @route  POST /api/interviews/start
// @access Private
const startInterview = async (req, res, next) => {
  try {
    const {
      type = 'dsa',
      companyTier = 'faang',
      targetCompany = 'Google / Meta / FAANG',
      seniorityLevel = 'L5 (Senior)',
      targetPackage = '$250k - $380k',
    } = req.body;

    if (!VALID_INTERVIEW_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Invalid interview type '${type}'. Must be one of: ${VALID_INTERVIEW_TYPES.join(', ')}`,
      });
    }

    // Process & sanitize customConfig if provided by CustomInterviewSetup
    let customConfig = null;
    if (req.body.customConfig && typeof req.body.customConfig === 'object') {
      const raw = req.body.customConfig;
      const role = sanitizeInput(raw.role, 120);
      const company = sanitizeInput(raw.targetCompany, 120);
      const region = raw.region === 'india' ? 'india' : raw.region === 'us' ? 'us' : 'us';
      const targetSalary = Number(raw.targetSalary) || undefined;
      const currency = region === 'india' ? 'INR' : 'USD';

      customConfig = {
        role: role || undefined,
        targetCompany: company || undefined,
        region,
        targetSalary,
        currency,
      };
    }

    const cleanCompany = customConfig?.targetCompany || sanitizeInput(targetCompany, 100) || 'Google / Meta / FAANG';
    const cleanSeniority = customConfig?.role || sanitizeInput(seniorityLevel, 100) || 'L5 (Senior)';

    // 1. Try to dynamically generate tailor-made opening question via Anthropic Claude 3.5 Sonnet
    let initialPrompt = await generateOpeningQuestion({
      sessionType: type,
      companyTier,
      targetCompany: cleanCompany,
      seniorityLevel: cleanSeniority,
      targetPackage,
      customConfig,
      userId: req.user._id,
      requestId: req.id,
    });

    // 2. If Anthropic is offline or no key, pick a calibrated question from the
    // bank. When adaptive selection is enabled the item is chosen by the Loop A
    // policy (Elo difficulty targeting + exploration floor), otherwise random.
    let selectedQuestionId = null;
    let selectionPolicyVersion = 'static-v1';
    if (!initialPrompt) {
      const questions = await cache.getOrSet(`bank:${type}:all`, 300, () =>
        QuestionBank.find({ type }).lean()
      );
      if (questions && questions.length > 0) {
        let selected = null;
        if (config.learning.selectionEnabled) {
          const decision = await selectionPolicy.selectNextQuestion({
            userId: req.user._id,
            type,
            candidates: questions,
          });
          selected = decision.question;
          selectedQuestionId = decision.questionId || null;
          selectionPolicyVersion = decision.policyVersion || 'static-v1';
          logger.debug('Adaptive question selected', {
            type,
            reason: decision.reason,
            exploration: decision.exploration,
            policyVersion: selectionPolicyVersion,
          });
        }
        if (!selected) {
          selected = questions[Math.floor(Math.random() * questions.length)];
          selectedQuestionId = selected ? String(selected._id) : null;
        }
        initialPrompt = selected.prompt;
      } else {
        // High quality fallback per type
        switch (type) {
          case 'hr_round':
            initialPrompt = `Welcome to your HR interview for ${cleanCompany}. Could you walk me through your career journey and explain what specifically attracted you to this role?`;
            break;
          case 'case_study':
            initialPrompt = `Our client, a leading fintech enterprise targeting expansion in ${customConfig?.region === 'india' ? 'India' : 'US'}, is seeing customer acquisition costs rise by 40%. How would you structure an investigation to diagnose the root cause?`;
            break;
          case 'product_management':
            initialPrompt = `Imagine you are the Lead PM for ${cleanCompany}'s flagship mobile app. User engagement dropped 15% following our latest release. Walk me through how you would triage this issue and determine what to roll back vs patch.`;
            break;
          case 'sales_pitch':
            initialPrompt = `You are presenting ${cleanCompany}'s enterprise solution to a skeptical VP of Engineering who says: "We already have an internal tool and zero extra budget." Pitch our value proposition and handle their objection.`;
            break;
          case 'managerial':
            initialPrompt = `A senior engineer on your team is consistently missing sprint deadlines and clashing with product managers. Walk me through your 1-on-1 coaching framework and escalation path.`;
            break;
          case 'system_design':
            initialPrompt = `Can you design a scalable distributed rate limiter capable of supporting 500,000 requests per second with sub-5ms latency across global edge locations?`;
            break;
          case 'behavioral':
            initialPrompt = `Tell me about a high-stakes technical disagreement you had with a senior teammate or tech lead. How did you resolve the conflict while maintaining project velocity?`;
            break;
          case 'dsa':
          default:
            initialPrompt = `Given an array of integers and a target integer k, return the maximum sum of any contiguous subarray of size k. What are the space and time complexities of your approach?`;
            break;
        }
      }
    }

    const session = await InterviewSession.create({
      userId: req.user._id,
      type,
      companyTier,
      targetCompany: cleanCompany,
      seniorityLevel: cleanSeniority,
      targetPackage,
      customConfig: customConfig || undefined,
      status: 'in_progress',
      maxTurns: 6,
      rubricVersion: RUBRIC_VERSION,
      promptVersion: PROMPT_VERSION,
      weightsVersion: config.learning.enabled ? 'pending' : 'static-v1',
      selectionPolicyVersion,
      correlationId: req.id,
      tokenUsage: { promptTokens: 60, completionTokens: Math.ceil(initialPrompt.length / 4), totalTokens: 60 + Math.ceil(initialPrompt.length / 4) },
      turns: [
        {
          questionId: selectedQuestionId || undefined,
          question: initialPrompt,
          answer: '',
          followUp: false,
          timestamp: new Date(),
        },
      ],
      startedAt: new Date(),
    });

    featureStore.recordExposure(selectedQuestionId ? [selectedQuestionId] : [], { type });

    logger.info('Interview session started', {
      sessionId: session._id,
      userId: req.user._id,
      type,
      targetCompany: cleanCompany,
      seniorityLevel: cleanSeniority,
      hasCustomConfig: Boolean(customConfig),
    });

    return res.status(201).json({ session });
  } catch (error) {
    logger.error('Start interview error', { error });
    next(error);
  }
};

// @desc   Submit answer & stream adaptive follow-up via SSE
// @route  POST /api/interviews/:id/answer
// @access Private
const submitAnswer = async (req, res, next) => {
  const { id } = req.params;
  const { answer } = req.body;

  const cleanAnswer = sanitizeInput(answer, config.security.maxAnswerLength);
  if (!cleanAnswer || cleanAnswer.length === 0) {
    return res.status(400).json({ error: 'Answer content is required' });
  }

  let session;
  try {
    session = await InterviewSession.findOne({ _id: id, userId: req.user._id });
    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ error: 'This interview has already been completed' });
    }

    const maxTurns = session.maxTurns || 6;
    if (session.turns.length >= maxTurns) {
      return res.status(400).json({
        error: `Maximum session question limit (${maxTurns} turns) reached. Please click "Finish & Score" to receive your official evaluation.`,
        maxTurnsReached: true,
      });
    }

    // Idempotency: the stream key is derived from the answer content, so a
    // retried POST (double-click, network retry, reconnect) maps to the exact
    // same channel and never scores the answer twice or overwrites the next
    // question.
    const answerHash = crypto.createHash('sha256').update(cleanAnswer).digest('hex').slice(0, 24);
    const streamKey = `${session._id}:${answerHash}`;
    const duplicateWindowMs = Math.max(config.sse.dedupWindowMs * 5, 60000);
    const alreadyAnswered = Boolean(
      session.lastAnswerHash === answerHash &&
        session.lastAnswerAt &&
        Date.now() - new Date(session.lastAnswerAt).getTime() < duplicateWindowMs
    );

    // Enforce per-user / per-IP concurrent stream limits before opening SSE.
    const registration = await connectionRegistry.register({
      userId: req.user._id,
      ip: getClientIp(req),
      res,
    });

    if (!registration.allowed) {
      if (registration.reason === 'server_draining') {
        res.setHeader('Retry-After', String(Math.ceil(config.sse.reconnectHintMs / 1000)));
        return res.status(503).json({
          error: 'Server is restarting. Please retry shortly.',
          code: 'SERVER_DRAINING',
          retryAfterMs: config.sse.reconnectHintMs,
        });
      }
      res.setHeader('Retry-After', String(Math.ceil(config.sse.reconnectHintMs / 1000)));
      return res.status(429).json({
        error: 'Too many concurrent interview streams. Close another tab or retry shortly.',
        code: 'SSE_CONNECTION_LIMIT',
        retryAfterMs: config.sse.reconnectHintMs,
      });
    }

    let released = false;
    const releaseConnection = async () => {
      if (released) return;
      released = true;
      await connectionRegistry.unregister({
        connectionId: registration.connectionId,
        userId: req.user._id,
        ip: getClientIp(req),
        res,
      });
    };
    res.once('close', () => {
      releaseConnection().catch(() => {});
    });

    const opened = streamRegistry.open(streamKey, {
      sessionId: String(session._id),
      userId: String(req.user._id),
      correlationId: req.id,
    });
    const { channel, isNew } = opened;

    const attach = () => {
      res.setHeader('X-SSE-Stream-Id', streamKey);
      prepareSse(req, res);
      const replay = channel.attach(res, getLastEventId(req));
      if (replay.replayed > 0) {
        logger.info('SSE client reconnected and replayed buffered events', {
          sessionId: String(session._id),
          streamKey,
          replayed: replay.replayed,
          from: replay.from,
        });
      }
    };

    // Duplicate answer after the original channel was cleaned up: reply with
    // the already-generated question instead of spending another LLM call.
    if (alreadyAnswered && isNew) {
      const currentQuestion = session.turns[session.turns.length - 1]?.question || '';
      channel.publish({
        type: 'done',
        fullQuestion: currentQuestion,
        turnIndex: session.turns.length - 1,
        duplicate: true,
      });
      channel.complete();
    }

    if (alreadyAnswered || !isNew) {
      attach();
      return;
    }

    // This request owns the generation for this answer.
    attach();

    try {
      channel.publish({ type: 'status', stage: 'scoring' });

      const currentTurnIndex = session.turns.length - 1;
      if (currentTurnIndex >= 0) {
        session.turns[currentTurnIndex].answer = cleanAnswer;

        // Score turn silently and deterministically, extracting topic tags for
        // the learning loops. Failure here must not block the next question.
        try {
          const turnScoreResult = await scoreTurnWithTool({
            sessionType: session.type,
            question: session.turns[currentTurnIndex].question,
            answer: cleanAnswer,
            seniorityLevel: session.seniorityLevel,
            targetCompany: session.targetCompany,
            customConfig: session.customConfig,
            userId: req.user._id,
            sessionId: String(session._id),
            requestId: req.id,
          });

          const turnDimensions = Object.values(turnScoreResult.dimensionScores || {}).filter(Number.isFinite);
          const turnOverall = turnDimensions.length
            ? Number((turnDimensions.reduce((sum, value) => sum + value, 0) / turnDimensions.length).toFixed(1))
            : null;
          session.turns[currentTurnIndex].turnScore = {
            overall: turnOverall,
            dimensionScores: turnScoreResult.dimensionScores,
            topicTags: turnScoreResult.topicTags || [],
            reasoning: turnScoreResult.reasoning || '',
          };
        } catch (scoreErr) {
          logger.warn('Per-turn scoring error during answer submission', { error: scoreErr.message });
        }
      }

      session.lastAnswerHash = answerHash;
      session.lastAnswerAt = new Date();
      session.lastStreamKey = streamKey;
      session.rubricVersion = session.rubricVersion || RUBRIC_VERSION;
      session.promptVersion = session.promptVersion || PROMPT_VERSION;
      await session.save();

      // Loop D: adapt hint/probing style to the candidate's recent trajectory.
      // Uses in-session scores (no extra DB round-trip on the stream path).
      const recentScores = session.turns
        .map((turn) => Number(turn.turnScore?.overall))
        .filter(Number.isFinite);
      const recentMean = recentScores.length
        ? recentScores.slice(-3).reduce((sum, value) => sum + value, 0) /
          Math.min(3, recentScores.length)
        : 6;
      const personalization = await getPersonalization({
        type: session.type,
        ability: Math.round(1500 + (recentMean - 6) * 100),
        recentScores,
      });

      await streamAdaptiveQuestion({
        sessionType: session.type,
        companyTier: session.companyTier,
        targetCompany: session.targetCompany,
        seniorityLevel: session.seniorityLevel,
        customConfig: session.customConfig,
        turns: session.turns,
        latestAnswer: cleanAnswer,
        personalizationDirective: personalization.directive,
        userId: req.user._id,
        sessionId: String(session._id),
        requestId: req.id,
        onChunk: (chunk) => {
          channel.publish({ type: 'chunk', text: chunk });
        },
        onDone: async (result) => {
          const fullQuestion = String(
            typeof result === 'object' ? result.fullResponse : result || ''
          ).trim();
          if (!fullQuestion) {
            throw new Error('The question generator returned an empty response');
          }

          const tokens =
            typeof result === 'object' && result.tokens
              ? result.tokens
              : { promptTokens: 100, completionTokens: 50 };

          session.turns.push({
            question: fullQuestion,
            answer: '',
            followUp: true,
            timestamp: new Date(),
          });

          session.tokenUsage = {
            promptTokens: (session.tokenUsage?.promptTokens || 0) + (tokens.promptTokens || 0),
            completionTokens:
              (session.tokenUsage?.completionTokens || 0) + (tokens.completionTokens || 0),
            totalTokens:
              (session.tokenUsage?.totalTokens || 0) +
              (tokens.promptTokens || 0) +
              (tokens.completionTokens || 0),
          };

          await session.save();

          channel.complete({
            type: 'done',
            fullQuestion,
            turnIndex: session.turns.length - 1,
            fallback: Boolean(result?.fallback),
            promptVersion: PROMPT_VERSION,
            rubricVersion: RUBRIC_VERSION,
          });
        },
      });

      if (!channel.completed) {
        channel.fail('The interview stream ended before completion.');
      }
    } catch (error) {
      logger.error('Submit answer streaming error', {
        error: error.message,
        sessionId: String(session._id),
        requestId: req.id,
      });
      channel.fail('Unable to generate the next question. Please retry.');
    } finally {
      await releaseConnection();
    }
  } catch (error) {
    logger.error('Submit answer error', { error, requestId: req.id });
    if (!res.headersSent) {
      return next(error);
    }
    // Channel/headers already opened: terminate the stream cleanly.
    if (!res.writableEnded) {
      try {
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Unexpected server error' })}\n\n`);
      } catch {
        // socket already gone
      }
      res.end();
    }
  }
};

// @desc   Get interview session by ID
// @route  GET /api/interviews/:id
// @access Private
const getInterview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await InterviewSession.findOne({ _id: id, userId: req.user._id });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    return res.status(200).json({ session });
  } catch (error) {
    next(error);
  }
};

// @desc   Complete interview session & trigger async scoring job
// @route  POST /api/interviews/:id/complete
// @access Private
const completeInterview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await InterviewSession.findOne({ _id: id, userId: req.user._id });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();

    // Scoring runs off the request path so a slow model never holds the HTTP
    // response (and never blocks SSE). The client polls GET /interviews/:id.
    // Requiring the worker here also materialises the BullMQ consumer in
    // deployments where completion is the first scoring touchpoint.
    require('../jobs/scoringWorker');
    const job = await addScoringJob(session._id.toString());

    return res.status(200).json({
      message: 'Interview marked completed; scoring queued.',
      jobId: job?.id || null,
      session,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get user interview history
// @route  GET /api/interviews
// @access Private
const getUserInterviews = async (req, res, next) => {
  try {
    let query = InterviewSession.find({ userId: req.user._id })
      .sort({ startedAt: -1 })
      .limit(50);
    if (config.mongo.secondaryReads) query = query.read('secondaryPreferred');
    const sessions = await query;

    return res.status(200).json({ sessions });
  } catch (error) {
    next(error);
  }
};

// @desc   Get questions with companyTags, level, type and search filters (Feature 3)
// @route  GET /api/interviews/questions
// @access Public / Private
const getQuestions = async (req, res, next) => {
  try {
    const { company, level, type, difficulty, search } = req.query;
    const filter = {};

    if (company && company !== 'All') {
      filter.companyTags = { $in: [company] };
    }
    if (level && level !== 'All') {
      filter.level = level;
    }
    if (type && type !== 'All') {
      filter.type = type;
    }
    if (difficulty && difficulty !== 'All') {
      filter.difficulty = difficulty;
    }
    if (search) {
      const cleanSearch = sanitizeInput(search, 80);
      filter.prompt = { $regex: cleanSearch, $options: 'i' };
    }

    const cacheKey = `questions:list:${String(company || '')}:${String(level || '')}:${String(type || '')}:${String(difficulty || '')}:${String(search || '').slice(0, 40)}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    let query = QuestionBank.find(filter).sort({ createdAt: -1 }).limit(100);
    if (config.mongo.secondaryReads) query = query.read('secondaryPreferred');
    const questions = await query;

    const payload = { count: questions.length, questions };
    await cache.set(cacheKey, payload, 120);
    return res.json(payload);
  } catch (error) {
    logger.error('Get questions error', { error });
    next(error);
  }
};

module.exports = {
  startInterview,
  submitAnswer,
  getInterview,
  completeInterview,
  getUserInterviews,
  getQuestions,
};
