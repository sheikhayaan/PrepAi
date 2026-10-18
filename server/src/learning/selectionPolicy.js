/**
 * Loop A: adaptive question selection.
 *
 * Strategy: Elo ability estimate + item difficulty targeting (~65% expected
 * success), with three guardrails:
 *
 *  1. Exploration floor  - a configurable share of selections is reserved for
 *     under-exposed items so the item bank keeps learning.
 *  2. Exposure cap       - no single item may exceed a share of traffic, which
 *     prevents a feedback loop where one "good" item monopolises sessions.
 *  3. Cold-start safety  - items without statistics fall back to their curated
 *     difficulty anchor and are preferred for exploration.
 *
 * All randomness is injected (`rng`) so behaviour is deterministic in tests.
 */
const config = require('../config/env');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');
const featureStore = require('./featureStore');
const versionRegistry = require('./versionRegistry');

const EXPLORATION_POOL_SIZE = 5;

function targetDifficulty(ability, targetSuccess = 0.65) {
  const clamped = Math.min(0.95, Math.max(0.05, targetSuccess));
  return ability - 400 * Math.log10(clamped / (1 - clamped));
}

function expectedSuccess(ability, difficulty) {
  return featureStore.eloExpected(ability, difficulty);
}

/**
 * Convert a stored question (mongoose doc or lean object) into a scorable item.
 */
function toItem(question, stat, anchorFn) {
  const id = String(question._id || question.id);
  return {
    questionId: id,
    question,
    difficulty: stat ? stat.difficulty : anchorFn(question.difficulty),
    discrimination: stat ? stat.discrimination : 1,
    attempts: stat ? stat.attempts : 0,
    exposureWindowCount: stat ? stat.exposureWindowCount : 0,
    coldStart: !stat || stat.attempts === 0,
  };
}

function computeExposureCap(items, share) {
  const totalExposure = items.reduce((sum, item) => sum + item.exposureWindowCount, 0);
  // Always allow at least one exposure so a brand-new bank is not frozen.
  return Math.max(1, Math.ceil(totalExposure * Math.min(0.5, Math.max(0.01, share))));
}

/**
 * Rank without side effects (exported for unit tests).
 *
 * @returns {{ranked: Array, explorationPool: Array, maxExposure: number, target: number}}
 */
function rankCandidates({ items, ability, policy = {}, rng = Math.random }) {
  const target = targetDifficulty(ability, policy.targetSuccess ?? 0.65);
  const maxExposure = computeExposureCap(items, policy.exposureCapShare ?? config.learning.exposureCapShare);

  const ranked = items
    .map((item) => {
      const gap = Math.abs(item.difficulty - target);
      const exploitScore = -gap / 100 + item.discrimination * 2;
      const overExposed = item.exposureWindowCount > maxExposure;
      // Thompson-like jitter: 0..1 scaled by 25 Elo points of uncertainty.
      const explorationScore = rng() * 25;
      return {
        ...item,
        expectedSuccess: expectedSuccess(ability, item.difficulty),
        exploitScore,
        explorationScore,
        totalScore: exploitScore + explorationScore - (overExposed ? 1000 : 0),
        overExposed,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);

  const explorationPool = ranked
    .filter((item) => !item.overExposed)
    .sort((a, b) => {
      // Cold-start items first, then least exposure.
      if (a.coldStart !== b.coldStart) return a.coldStart ? -1 : 1;
      return a.exposureWindowCount - b.exposureWindowCount;
    })
    .slice(0, EXPLORATION_POOL_SIZE);

  return { ranked, explorationPool, maxExposure, target };
}

/**
 * Select the next question.
 *
 * @param {Object} options
 * @param {string} options.userId
 * @param {string} options.type
 * @param {Array} options.candidates
 * @param {Array<string>} [options.excludeIds]
 * @param {Function} [options.rng]
 */
async function selectNextQuestion({ userId, type, candidates = [], excludeIds = [], rng = Math.random }) {
  const excluded = new Set(excludeIds.map(String));
  const eligible = candidates.filter((q) => q && !excluded.has(String(q._id || q.id)));

  // Fast path: never touch Redis/DB when there is nothing to choose from.
  if (eligible.length === 0) {
    return { question: null, reason: 'no_candidates', policyVersion: 'static-v1' };
  }

  const policyArtifact = await versionRegistry.getActive(versionRegistry.KINDS.SELECTION);
  const policy = {
    targetSuccess: 0.65,
    exposureCapShare: config.learning.exposureCapShare,
    explorationEpsilon: config.learning.explorationEpsilon,
    ...(policyArtifact.payload || {}),
  };

  // Hard fallback: selection must never block an interview.
  try {
    const [abilityRow, stats] = await Promise.all([
      featureStore.getAbility(userId, type),
      featureStore.getQuestionStats(type),
    ]);
    const statsById = new Map(stats.map((s) => [String(s.questionId), s]));
    const items = eligible.map((q) =>
      toItem(q, statsById.get(String(q._id || q.id)), featureStore.difficultyAnchor)
    );

    const { ranked, explorationPool, maxExposure, target } = rankCandidates({
      items,
      ability: abilityRow.ability,
      policy,
      rng,
    });

    const explore = rng() < policy.explorationEpsilon;
    const chosen = (explore ? explorationPool[0] : ranked.find((item) => !item.overExposed)) || ranked[0];

    metrics.inc('prepai_question_selections_total', {
      type,
      mode: explore ? 'explore' : 'exploit',
      cold_start: chosen.coldStart ? 'true' : 'false',
    });

    return {
      question: chosen.question,
      questionId: chosen.questionId,
      exploration: explore,
      coldStart: chosen.coldStart,
      expectedSuccess: Number(chosen.expectedSuccess.toFixed(3)),
      targetDifficulty: Math.round(target),
      itemDifficulty: Math.round(chosen.difficulty),
      ability: Math.round(abilityRow.ability),
      maxExposure,
      policyVersion: policyArtifact.version,
      reason: explore ? 'exploration_floor' : 'difficulty_match',
    };
  } catch (err) {
    logger.warn('Adaptive selection failed; falling back to random question', { error: err.message });
    metrics.inc('prepai_learning_selection_fallbacks_total', { type });
    const index = Math.floor(rng() * eligible.length);
    return {
      question: eligible[index],
      questionId: String(eligible[index]._id || eligible[index].id),
      exploration: false,
      fallback: true,
      policyVersion: policyArtifact.version,
      reason: 'fallback_random',
    };
  }
}

module.exports = {
  targetDifficulty,
  expectedSuccess,
  computeExposureCap,
  rankCandidates,
  selectNextQuestion,
  toItem,
  EXPLORATION_POOL_SIZE,
};
