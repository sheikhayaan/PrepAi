const InterviewSession = require('../models/InterviewSession');
const QuestionBank = require('../models/QuestionBank');
const { streamAdaptiveQuestion, generateOpeningQuestion } = require('../services/anthropicClient');
const { addScoringJob } = require('../jobs/scoringQueue');
const { sanitizeInput } = require('../utils/security');
const logger = require('../utils/logger');

// @desc   Start a new interview session with company tier, seniority & package target
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

    if (!['dsa', 'system_design', 'behavioral'].includes(type)) {
      return res.status(400).json({ error: 'Invalid interview type. Must be dsa, system_design, or behavioral.' });
    }

    const cleanCompany = sanitizeInput(targetCompany, 100) || 'Google / Meta / FAANG';
    const cleanSeniority = sanitizeInput(seniorityLevel, 100) || 'L5 (Senior)';

    // 1. Try to dynamically generate tailor-made opening question via Anthropic Claude 3.5 Sonnet
    let initialPrompt = await generateOpeningQuestion({
      sessionType: type,
      companyTier,
      targetCompany: cleanCompany,
      seniorityLevel: cleanSeniority,
      targetPackage,
    });

    // 2. If Anthropic is offline or no key, pick calibrated question from QuestionBank based on seniority
    if (!initialPrompt) {
      const isSenior = cleanSeniority.includes('L5') || cleanSeniority.includes('L6') || cleanSeniority.includes('Staff');
      const targetDifficulty = isSenior ? { $in: ['medium', 'hard'] } : { $in: ['easy', 'medium'] };

      let questions = await QuestionBank.find({ type, difficulty: targetDifficulty });
      if (!questions || questions.length === 0) {
        questions = await QuestionBank.find({ type });
      }

      if (questions && questions.length > 0) {
        const randomIndex = Math.floor(Math.random() * questions.length);
        initialPrompt = questions[randomIndex].prompt;
      } else {
        initialPrompt = 'Can you design a scalable URL shortener like bit.ly? What would the read/write traffic estimates look like, and how would you generate unique 7-character hashes while handling race conditions?';
      }
    }

    const session = await InterviewSession.create({
      userId: req.user._id,
      type,
      companyTier,
      targetCompany: cleanCompany,
      seniorityLevel: cleanSeniority,
      targetPackage,
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

module.exports = {
  startInterview,
  submitAnswer,
  getInterview,
  completeInterview,
  getUserInterviews,
};
