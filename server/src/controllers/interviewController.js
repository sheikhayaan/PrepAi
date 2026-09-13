const InterviewSession = require('../models/InterviewSession');
const QuestionBank = require('../models/QuestionBank');
const { streamAdaptiveQuestion, generateOpeningQuestion } = require('../services/anthropicClient');
const { addScoringJob } = require('../jobs/scoringQueue');
const { sanitizeInput } = require('../utils/security');
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
    });

    // 2. If Anthropic is offline or no key, pick calibrated question from QuestionBank based on type
    if (!initialPrompt) {
      let questions = await QuestionBank.find({ type });
      if (questions && questions.length > 0) {
        const randomIndex = Math.floor(Math.random() * questions.length);
        initialPrompt = questions[randomIndex].prompt;
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
      tokenUsage: { promptTokens: 60, completionTokens: Math.ceil(initialPrompt.length / 4), totalTokens: 60 + Math.ceil(initialPrompt.length / 4) },
      turns: [
        {
          question: initialPrompt,
          answer: '',
          followUp: false,
          timestamp: new Date(),
        },
      ],
      startedAt: new Date(),
    });

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
  try {
    const { id } = req.params;
    const { answer } = req.body;

    const cleanAnswer = sanitizeInput(answer, 3000);
    if (!cleanAnswer || cleanAnswer.length === 0) {
      return res.status(400).json({ error: 'Answer content is required' });
    }

    const session = await InterviewSession.findOne({ _id: id, userId: req.user._id });
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

    // Save candidate's answer into current active turn
    const currentTurnIndex = session.turns.length - 1;
    if (currentTurnIndex >= 0) {
      session.turns[currentTurnIndex].answer = cleanAnswer;
    }
    await session.save();

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Stream next adaptive question calibrated to company tier & seniority
    await streamAdaptiveQuestion({
      sessionType: session.type,
      companyTier: session.companyTier,
      targetCompany: session.targetCompany,
      seniorityLevel: session.seniorityLevel,
      customConfig: session.customConfig,
      turns: session.turns,
      latestAnswer: cleanAnswer,
      onChunk: (chunk) => {
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
      },
      onDone: async (result) => {
        const fullQuestion = typeof result === 'object' ? result.fullResponse : result;
        const tokens = typeof result === 'object' && result.tokens ? result.tokens : { promptTokens: 100, completionTokens: 50 };

        session.turns.push({
          question: fullQuestion.trim(),
          answer: '',
          followUp: true,
          timestamp: new Date(),
        });

        session.tokenUsage = {
          promptTokens: (session.tokenUsage?.promptTokens || 0) + tokens.promptTokens,
          completionTokens: (session.tokenUsage?.completionTokens || 0) + tokens.completionTokens,
          totalTokens: (session.tokenUsage?.totalTokens || 0) + tokens.promptTokens + tokens.completionTokens,
        };

        await session.save();

        res.write(`data: ${JSON.stringify({ type: 'done', fullQuestion: fullQuestion.trim(), turnIndex: session.turns.length - 1 })}\n\n`);
        res.end();
      },
    });
  } catch (error) {
    logger.error('Submit answer error', { error });
    if (!res.headersSent) {
      return next(error);
    }
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
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

    // Dispatch async scoring job to BullMQ
    const job = await addScoringJob(session._id.toString());

    return res.status(200).json({
      message: 'Interview marked completed. Scoring job enqueued.',
      jobId: job.id,
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
    const sessions = await InterviewSession.find({ userId: req.user._id })
      .sort({ startedAt: -1 })
      .limit(50);

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

    const questions = await QuestionBank.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      count: questions.length,
      questions,
    });
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
