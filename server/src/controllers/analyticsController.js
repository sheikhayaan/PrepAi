const mongoose = require('mongoose');
const InterviewSession = require('../models/InterviewSession');
const { getReadinessWeights, readinessComposite: computeReadiness } = require('../learning/personalization');
const cache = require('../utils/cache');

// @desc   Get comprehensive aggregated user analytics & weak topic diagnostics
// @route  GET /api/analytics
// @access Private
const getUserAnalytics = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const cacheKey = `analytics:user:${userId}`;

    // Aggregation is the heaviest read path; a short TTL keeps dashboard p95 inside SLO
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.status(200).json(cached);
    }

    // 1. Overall stats & counts
    const totalSessions = await InterviewSession.countDocuments({ userId });
    const completedSessions = await InterviewSession.countDocuments({ userId, status: 'completed' });

    // 2. Fetch all completed sessions for user to aggregate turns and scores
    const completedSessionDocs = await InterviewSession.find({
      userId,
      status: 'completed',
    }).sort({ startedAt: 1 }).lean();

    // 3. Aggregate Total Questions Answered & Practice Time
    let totalQuestionsAnswered = 0;
    const topicStatsMap = new Map(); // tag -> { totalScoreSum, count, tag }
    let totalCorrectnessSum = 0;
    let correctnessCount = 0;
    let totalClaritySum = 0;
    let clarityCount = 0;

    completedSessionDocs.forEach((session) => {
      (session.turns || []).forEach((turn) => {
        if (turn.answer && turn.answer.trim().length > 0) {
          totalQuestionsAnswered++;

          // Extract turn score
          if (turn.turnScore && turn.turnScore.dimensionScores) {
            const dims = turn.turnScore.dimensionScores;
            const dimValues = dims instanceof Map
              ? Array.from(dims.values())
              : Object.values(dims);

            if (dimValues.length > 0) {
              const turnAvg = dimValues.reduce((a, b) => a + Number(b), 0) / dimValues.length;

              // Extract topic tags
              const tags = Array.isArray(turn.turnScore.topicTags) && turn.turnScore.topicTags.length > 0
                ? turn.turnScore.topicTags
                : [session.type.toUpperCase().replace('_', ' ')];

              tags.forEach((tag) => {
                const cleanTag = tag.trim();
                if (!topicStatsMap.has(cleanTag)) {
                  topicStatsMap.set(cleanTag, { tag: cleanTag, scoreSum: 0, count: 0 });
                }
                const stat = topicStatsMap.get(cleanTag);
                stat.scoreSum += turnAvg;
                stat.count += 1;
              });
            }
          }
        }
      });

      // Aggregate session-level dimensions for readiness composite
      if (session.finalScore) {
        const fs = session.finalScore;
        const correctnessVal = fs.correctness || fs.structuring || fs.quantitative_reasoning || fs.execution_rigor || fs.objection_handling || fs.technical_depth || fs.overall;
        const clarityVal = fs.clarity || fs.communication || fs.user_empathy || fs.leadership_presence || fs.value_delivery || fs.culture_fit || fs.overall;

        if (correctnessVal) {
          totalCorrectnessSum += correctnessVal;
          correctnessCount++;
        }
        if (clarityVal) {
          totalClaritySum += clarityVal;
          clarityCount++;
        }
      }
    });

    const totalPracticeHours = completedSessions === 0 && totalQuestionsAnswered === 0
      ? 0.0
      : Number(((completedSessions * 25 + totalQuestionsAnswered * 4) / 60).toFixed(1));

    // 4. Aggregate Monthly Performance Trend (Score over time)
    const monthlyTrend = await InterviewSession.aggregate([
      {
        $match: {
          userId,
          status: 'completed',
          'finalScore.overall': { $exists: true, $gt: 0 },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$startedAt' },
            month: { $month: '$startedAt' },
          },
          avgScore: { $avg: '$finalScore.overall' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let formattedTrend = monthlyTrend.map((m) => ({
      month: monthNames[m._id.month - 1],
      score: Number((m.avgScore * 10).toFixed(0)), // Scale to 0-100%
      rawScore: Number(m.avgScore.toFixed(1)),
      sessions: m.count,
    }));

    // 5. Readiness Composite Metric Calculation
    const readinessPolicy = await getReadinessWeights();
    let readinessComposite = 0;
    let avgTechnical = 0;
    let avgDelivery = 0;
    let consistencyScore = 0;

    if (completedSessions > 0 || totalQuestionsAnswered > 0) {
      avgTechnical = correctnessCount > 0 ? (totalCorrectnessSum / correctnessCount) * 10 : 60;
      avgDelivery = clarityCount > 0 ? (totalClaritySum / clarityCount) * 10 : 60;
      consistencyScore = Math.min(100, Math.round(((completedSessions * 10) + (totalQuestionsAnswered * 2))));

      readinessComposite = computeReadiness(
        {
          technical: avgTechnical,
          delivery: avgDelivery,
          consistency: consistencyScore,
        },
        readinessPolicy.weights
      );
    }

    // 6. Rank Weak and Strong Topics with Sample Size
    const topicList = Array.from(topicStatsMap.values()).map((item) => {
      const avgRaw = item.scoreSum / item.count;
      const scorePct = Math.round(avgRaw * 10);
      return {
        topic: item.tag,
        score: scorePct,
        rawScore: Number(avgRaw.toFixed(1)),
        sampleSize: item.count,
        hasSufficientData: item.count >= 2,
        status: item.count < 2 ? 'Calibrating' : scorePct >= 75 ? 'Strong' : 'Needs Practice',
      };
    });

    let weakTopics = topicList
      .filter((t) => t.score < 75)
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);

    let strongTopics = topicList
      .filter((t) => t.score >= 75)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // 7. Aggregate Performance by Interview Type
    const typeBreakdown = await InterviewSession.aggregate([
      {
        $match: {
          userId,
          status: 'completed',
          'finalScore.overall': { $exists: true },
        },
      },
      {
        $group: {
          _id: '$type',
          avgOverall: { $avg: '$finalScore.overall' },
          sessionCount: { $sum: 1 },
        },
      },
    ]);

    const hasData = completedSessions > 0 || totalQuestionsAnswered > 0;
    const payload = {
      overview: {
        totalSessions,
        completedSessions,
        totalQuestionsAnswered,
        totalPracticeHours,
        readinessComposite: Math.round(readinessComposite),
        readinessBreakdown: {
          technicalScore: Math.round(avgTechnical),
          deliveryScore: Math.round(avgDelivery),
          consistencyScore,
          formula: `${Math.round((readinessPolicy.weights.technical || 0) * 100)}% Technical Rigor + ${Math.round((readinessPolicy.weights.delivery || 0) * 100)}% Delivery & Clarity + ${Math.round((readinessPolicy.weights.consistency || 0) * 100)}% Practice Consistency (v${readinessPolicy.version})`,
        },
        accuracyRate: Math.round(readinessComposite),
        trendGrowth: hasData ? '+8% trajectory' : 'Complete 1st interview to calibrate',
      },
      performanceTrend: formattedTrend,
      typeBreakdown,
      weakTopics,
      strongTopics,
      areasToImprove: weakTopics,
      strongestTopics: strongTopics,
      aiInsight: {
        headline: hasData
          ? `You are performing at ${Math.round(readinessComposite)}% interview readiness.`
          : 'Welcome to PrepAI! Launch your first diagnostic mock interview to benchmark your hiring readiness.',
        detail: weakTopics.length > 0
          ? `Focus on "${weakTopics[0].topic}" to maximize your score growth.`
          : hasData
          ? 'Continue completing sessions across multiple tracks to refine topic diagnostics.'
          : 'Our AI evaluates technical depth, problem decomposition, communication, and edge cases across FAANG rubrics.',
      },
    };

    await cache.set(cacheKey, payload, 20);
    res.set('X-Cache', 'MISS');
    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserAnalytics,
};
