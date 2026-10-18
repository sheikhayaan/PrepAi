/**
 * Feature store for the adaptive loops.
 *
 * Hot reads (ability, item statistics) are cached; writes are incremental and
 * fire-and-forget so the interview request path never waits on analytics.
 */
const QuestionStat = require('../models/QuestionStat');
const UserAbility = require('../models/UserAbility');
const config = require('../config/env');
const cache = require('../utils/cache');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');

const DEFAULT_ABILITY = 1500;
const MIN_ABILITY = 800;
const MAX_ABILITY = 2200;
const DIFFICULTY_ANCHORS = { easy: 1300, medium: 1450, hard: 1600 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Standard Elo expectation for "candidate solves item". */
function eloExpected(ability, difficulty) {
  return 1 / (1 + Math.pow(10, (difficulty - ability) / 400));
}

function difficultyAnchor(label) {
  return DIFFICULTY_ANCHORS[label] || DIFFICULTY_ANCHORS.medium;
}

function abilityCacheKey(userId, type) {
  return `learning:ability:${userId}:${type}`;
}

function statsCacheKey(type) {
  return `learning:question-stats:${type}`;
}

async function getAbility(userId, type) {
  if (!userId) return { ability: DEFAULT_ABILITY, attempts: 0, version: 'default' };

  const cached = await cache.get(abilityCacheKey(userId, type));
  if (cached) return cached;

  try {
    const row = await UserAbility.findOne({ userId, type }).lean();
    const value = row
      ? { ability: row.ability, attempts: row.attempts, version: 'db' }
      : { ability: DEFAULT_ABILITY, attempts: 0, version: 'default' };
    await cache.set(abilityCacheKey(userId, type), value, 300);
    return value;
  } catch (err) {
    logger.warn('Ability lookup failed; defaulting', { error: err.message });
    return { ability: DEFAULT_ABILITY, attempts: 0, version: 'fallback' };
  }
}

/**
 * Elo update with continuous outcome in [0,1] (score/10).
 * K shrinks for experienced users to stabilise estimates.
 */
async function updateAbility({ userId, type, score, itemDifficulty = difficultyAnchor('medium') }) {
  if (!userId || !Number.isFinite(Number(score))) return null;

  const outcome = clamp(Number(score) / 10, 0, 1);
  const current = await getAbility(userId, type);
  const expected = eloExpected(current.ability, itemDifficulty);
  const k = config.learning.abilityKFactor / Math.max(1, Math.log10(current.attempts + 10));
  const nextAbility = clamp(current.ability + k * (outcome - expected), MIN_ABILITY, MAX_ABILITY);

  try {
    const updated = await UserAbility.findOneAndUpdate(
      { userId, type },
      {
        $set: { ability: nextAbility, lastUpdated: new Date() },
        $inc: { attempts: 1 },
        $push: { recentScores: { $each: [Number(score)], $slice: -20 } },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    const payload = { ability: updated.ability, attempts: updated.attempts, version: 'db' };
    await cache.set(abilityCacheKey(userId, type), payload, 300);
    metrics.observe('prepai_learning_ability', { type }, nextAbility);
    return payload;
  } catch (err) {
    logger.warn('Ability update failed', { error: err.message });
    return null;
  }
}

async function getQuestionStats(type) {
  return (
    (await cache.getOrSet(statsCacheKey(type), 120, async () => {
      const rows = await QuestionStat.find({ type }).lean();
      return rows.map((row) => ({
        questionId: String(row.questionId),
        difficulty: row.difficulty,
        discrimination: row.discrimination,
        attempts: row.attempts,
        correct: row.correct,
        scoreSum: row.scoreSum,
        scoreCount: row.scoreCount,
        exposureWindowCount: row.exposureWindowCount,
        exposureWindowStart: row.exposureWindowStart,
        topicTags: row.topicTags || [],
      }));
    })) || []
  );
}

/**
 * Record that a question was shown. Fire-and-forget: a failure here must never
 * affect the interview.
 */
function recordExposure(questionIds = [], { type = 'dsa' } = {}) {
  const ids = questionIds.filter(Boolean);
  if (ids.length === 0) return;

  setImmediate(async () => {
    try {
      // Upsert so a brand-new bank starts accumulating exposure statistics
      // immediately; otherwise the exposure cap/exploration loop is inert.
      await QuestionStat.bulkWrite(
        ids.map((questionId) => ({
          updateOne: {
            filter: { questionId },
            update: {
              $inc: { exposureCount: 1, exposureWindowCount: 1 },
              $setOnInsert: {
                type,
                difficulty: difficultyAnchor('medium'),
                exposureWindowStart: new Date(),
              },
            },
            upsert: true,
          },
        })),
        { ordered: false }
      );
      await cache.del(statsCacheKey(type));
    } catch (err) {
      logger.warn('Exposure recording failed', { error: err.message });
    }
  });
}

/** Update item difficulty (Elo, K=16) and correctness counters. */
async function applyItemElo({ questionId, type, score, ability = DEFAULT_ABILITY }) {
  if (!questionId) return;
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) return;

  try {
    const stat = await QuestionStat.findOne({ questionId });
    const difficulty = stat ? stat.difficulty : difficultyAnchor('medium');
    // The item is "solved" as the candidate's score approaches the bar.
    const outcome = clamp(numericScore / 10, 0, 1);
    const expected = eloExpected(Number(ability) || DEFAULT_ABILITY, difficulty);
    const nextDifficulty = clamp(difficulty - 16 * (outcome - expected), 900, 2000);

    await QuestionStat.updateOne(
      { questionId },
      {
        $set: { difficulty: nextDifficulty, lastCalibratedAt: new Date(), type },
        $inc: {
          attempts: 1,
          correct: numericScore >= 6 ? 1 : 0,
          scoreSum: numericScore,
          scoreCount: 1,
        },
      },
      { upsert: true }
    );
    await cache.del(statsCacheKey(type));
  } catch (err) {
    logger.warn('Item Elo update failed', { error: err.message });
  }
}

/**
 * Reset the rolling exposure window used by the exposure cap. Runs from the
 * scheduler, not per request.
 */
async function resetExposureWindows({ olderThanMs = 7 * 24 * 60 * 60 * 1000 } = {}) {
  const cutoff = new Date(Date.now() - olderThanMs);
  try {
    const result = await QuestionStat.updateMany(
      { exposureWindowStart: { $lt: cutoff } },
      { $set: { exposureWindowStart: new Date(), exposureWindowCount: 0 } }
    );
    return result.modifiedCount || 0;
  } catch (err) {
    logger.warn('Exposure window reset failed', { error: err.message });
    return 0;
  }
}

module.exports = {
  DEFAULT_ABILITY,
  DIFFICULTY_ANCHORS,
  eloExpected,
  difficultyAnchor,
  clamp,
  getAbility,
  updateAbility,
  getQuestionStats,
  recordExposure,
  applyItemElo,
  resetExposureWindows,
};
