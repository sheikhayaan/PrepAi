/**
 * Standalone unit checks for the continuous-learning subsystem.
 *
 * No database or Redis required: pure logic is exercised directly, and the two
 * integration-shaped functions are tested with injected fakes.
 *
 * Run: node test-learning-loops.js
 */
const assert = require('assert');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || '0123456789abcdef0123456789abcdef';

const stats = require('./src/learning/statistics');
const selectionPolicy = require('./src/learning/selectionPolicy');
const personalization = require('./src/learning/personalization');
const evaluation = require('./src/learning/evaluation');
const calibration = require('./src/learning/calibration');
const versionRegistry = require('./src/learning/versionRegistry');
const scheduler = require('./src/learning/scheduler');
const cache = require('./src/utils/cache');

let passed = 0;
function check(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`  PASS  ${name}`);
    })
    .catch((err) => {
      console.error(`  FAIL  ${name}`);
      throw err;
    });
}

async function main() {
  console.log('Learning-loop unit checks');

  await check('statistics: mean/stddev on mixed input', () => {
    assert.strictEqual(stats.mean([1, 2, 3, '4', null]), 2.5);
    assert.strictEqual(stats.stddev([2, 4, 4, 4, 5, 5, 7, 9]), 2.138089935299395);
    assert.strictEqual(stats.mean([]), 0);
    assert.strictEqual(stats.stddev([1]), 0);
  });

  await check('statistics: weighted kappa perfect agreement is 1', () => {
    const pairs = [[8, 8], [6, 6], [9, 9], [4, 4], [7, 7], [10, 10], [5, 5], [3, 3]];
    assert.strictEqual(Number(stats.weightedKappa(pairs).toFixed(6)), 1);
  });

  await check('statistics: weighted kappa penalises ordinal disagreement', () => {
    const near = stats.weightedKappa([[8, 8], [7, 6], [9, 9], [5, 6]]);
    const far = stats.weightedKappa([[8, 2], [7, 1], [9, 3], [5, 0]]);
    assert.ok(near > far, `expected near (${near}) > far (${far})`);
  });

  await check('statistics: ICC(2,1) near 1 for identical raters', () => {
    const rows = [[8, 8], [6, 6], [9, 9], [4, 4], [7, 7], [10, 10]];
    assert.ok(stats.icc21(rows) > 0.999);
  });

  await check('statistics: window z-score guards degenerate baselines', () => {
    assert.strictEqual(stats.windowZScore({ recentMean: 8, baselineMean: 7, baselineStdDev: 0, recentN: 10 }), 0);
    assert.strictEqual(stats.windowZScore({ recentMean: 8, baselineMean: 7, baselineStdDev: 2, recentN: 1 }), 0);
    assert.ok(
      stats.windowZScore({ recentMean: 8, baselineMean: 7, baselineStdDev: 2, recentN: 16 }) > 1.9
    );
  });

  await check('selection: target difficulty sits below ability for 65% success', () => {
    const target = selectionPolicy.targetDifficulty(1500, 0.65);
    assert.ok(target < 1500 && target > 1300, `target=${target}`);
    assert.ok(
      selectionPolicy.expectedSuccess(1500, target) > 0.6 &&
        selectionPolicy.expectedSuccess(1500, target) < 0.7
    );
  });

  await check('selection: exposure cap always allows at least one exposure', () => {
    assert.strictEqual(selectionPolicy.computeExposureCap([], 0.15), 1);
    assert.strictEqual(
      selectionPolicy.computeExposureCap([{ exposureWindowCount: 100 }], 0.15),
      15
    );
  });

  await check('selection: cold-start items are preferred for exploration', () => {
    const items = [
      { questionId: 'warm', question: { _id: 'warm' }, difficulty: 1400, discrimination: 1, exposureWindowCount: 9, coldStart: false },
      { questionId: 'cold', question: { _id: 'cold' }, difficulty: 1600, discrimination: 1, exposureWindowCount: 0, coldStart: true },
      { questionId: 'mid', question: { _id: 'mid' }, difficulty: 1400, discrimination: 1, exposureWindowCount: 3, coldStart: false },
    ];
    const { explorationPool, ranked } = selectionPolicy.rankCandidates({
      items,
      ability: 1500,
      policy: { exposureCapShare: 0.15 },
      rng: () => 0.5,
    });
    assert.strictEqual(explorationPool[0].questionId, 'cold');
    // The over-exposed item must not be the exploit pick.
    assert.notStrictEqual(ranked[0].questionId, 'warm');
  });

  await check('selection: over-exposed items are excluded from exploitation', () => {
    const items = [
      { questionId: 'popular', question: { _id: 'popular' }, difficulty: 1400, discrimination: 1, exposureWindowCount: 100, coldStart: false },
      { questionId: 'fresh', question: { _id: 'fresh' }, difficulty: 1450, discrimination: 1, exposureWindowCount: 1, coldStart: false },
    ];
    const { ranked } = selectionPolicy.rankCandidates({
      items,
      ability: 1500,
      policy: { exposureCapShare: 0.15 },
      rng: () => 0.5,
    });
    const chosen = ranked.find((item) => !item.overExposed);
    assert.strictEqual(chosen.questionId, 'fresh');
  });

  await check('selection: selectNextQuestion honours excludeIds and injected fakes', async () => {
    const originalGetActive = versionRegistry.getActive;
    const featureStore = require('./src/learning/featureStore');
    const originalAbility = featureStore.getAbility;
    const originalStats = featureStore.getQuestionStats;

    versionRegistry.getActive = async () => ({
      version: 'test-policy',
      payload: { explorationEpsilon: 0, exposureCapShare: 0.15 },
    });
    featureStore.getAbility = async () => ({ ability: 1500, attempts: 5 });
    featureStore.getQuestionStats = async () => [];

    try {
      const candidates = [
        { _id: 'a', prompt: 'A', difficulty: 'easy' },
        { _id: 'b', prompt: 'B', difficulty: 'medium' },
      ];
      const decision = await selectionPolicy.selectNextQuestion({
        userId: 'u1',
        type: 'dsa',
        candidates,
        excludeIds: ['a'],
        rng: () => 0.5,
      });
      assert.strictEqual(String(decision.question._id), 'b');
      assert.strictEqual(decision.policyVersion, 'test-policy');
      assert.strictEqual(decision.exploration, false);
    } finally {
      versionRegistry.getActive = originalGetActive;
      featureStore.getAbility = originalAbility;
      featureStore.getQuestionStats = originalStats;
    }
  });

  await check('selection: empty candidate set is a typed miss, not a throw', async () => {
    const decision = await selectionPolicy.selectNextQuestion({ userId: 'u', type: 'dsa', candidates: [] });
    assert.strictEqual(decision.question, null);
    assert.strictEqual(decision.reason, 'no_candidates');
  });

  await check('personalization: weights are bounded and normalised', () => {
    const weights = personalization.normalizeWeights({ technical: 99, delivery: 0.01, consistency: -3 });
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 1) < 1e-6, `total=${total}`);
    Object.values(weights).forEach((w) => {
      assert.ok(w >= 0.1 - 1e-9 && w <= 0.6 + 1e-9, `weight out of bounds: ${w}`);
    });
  });

  await check('personalization: readiness composite uses normalised weights', () => {
    const score = personalization.readinessComposite(
      { technical: 80, delivery: 60, consistency: 40 },
      { technical: 0.5, delivery: 0.3, consistency: 0.2 }
    );
    assert.strictEqual(score, 66);
  });

  await check('personalization: struggling candidates get scaffolded hints', async () => {
    const result = await personalization.getPersonalization({ type: 'dsa', ability: 1300, recentScores: [3, 4, 4] });
    assert.strictEqual(result.hintStyle, 'scaffolded');
    assert.strictEqual(result.probingDepth, 1);
    assert.ok(result.directive.includes('hint'));
  });

  await check('calibration: offsets are clamped and applied additively', async () => {
    const originalGetActive = versionRegistry.getActive;
    versionRegistry.getActive = async () => ({
      version: 'rubric-test',
      payload: { dimensionOffsets: { clarity: 0.5, correctness: -2 } },
    });
    try {
      const result = await calibration.applyRubricOffsets({
        type: 'dsa',
        dimensionScores: { clarity: 9.7, correctness: 0.5 },
      });
      assert.strictEqual(result.dimensionScores.clarity, 10);
      assert.strictEqual(result.dimensionScores.correctness, 0);
      assert.strictEqual(result.rubricVersion, 'rubric-test');
    } finally {
      versionRegistry.getActive = originalGetActive;
    }
  });

  await check('evaluation: candidate offsets are scored against human anchors', () => {
    const items = [
      { dimensionScores: { clarity: 7 }, humanScores: { clarity: 8 } },
      { dimensionScores: { clarity: 6 }, humanScores: { clarity: 7 } },
      { dimensionScores: { clarity: 9 }, humanScores: { clarity: 9 } },
    ];
    const baseline = evaluation.evaluateScored(items, {});
    const candidate = evaluation.evaluateScored(items, { clarity: 1 });
    assert.ok(candidate.mae < baseline.mae, `candidate=${candidate.mae} baseline=${baseline.mae}`);
    assert.strictEqual(candidate.n, 3);
  });

  await check('evaluation: scoreItem clamps to the rubric range', () => {
    assert.deepStrictEqual(evaluation.scoreItem({ dimensionScores: { a: 9.8 } }, { a: 1 }), { a: 10 });
    assert.deepStrictEqual(evaluation.scoreItem({ dimensionScores: { a: 0.2 } }, { a: -1 }), { a: 0 });
  });

  await check('version registry: no proposed -> active shortcut', () => {
    assert.deepStrictEqual(versionRegistry.TRANSITIONS.proposed, ['shadow', 'archived']);
    assert.ok(!versionRegistry.TRANSITIONS.proposed.includes('active'));
    assert.ok(!versionRegistry.TRANSITIONS.shadow.includes('active'));
    assert.ok(versionRegistry.TRANSITIONS.canary.includes('active'));
  });

  await check('version registry: getActive degrades to static defaults when DB fails', async () => {
    const originalGetOrSet = cache.getOrSet;
    const LearningArtifact = require('./src/models/LearningArtifact');
    const originalFindOne = LearningArtifact.findOne;
    cache.getOrSet = async (key, ttl, producer) => producer();
    LearningArtifact.findOne = () => {
      throw new Error('simulated db outage');
    };
    try {
      const active = await versionRegistry.getActive(versionRegistry.KINDS.RUBRIC);
      assert.strictEqual(active.version, 'static-v1');
      assert.deepStrictEqual(active.payload, { dimensionOffsets: {}, anchorAdjustments: [] });
      assert.strictEqual(active.source, 'static');
    } finally {
      cache.getOrSet = originalGetOrSet;
      LearningArtifact.findOne = originalFindOne;
    }
  });

  await check('version registry: illegal and unsafe promotions are rejected', async () => {
    const LearningArtifact = require('./src/models/LearningArtifact');
    const originalFindOne = LearningArtifact.findOne;
    const makeArtifact = (overrides = {}) => ({
      kind: versionRegistry.KINDS.RUBRIC,
      version: 'candidate-test',
      status: 'proposed',
      sampleSize: 0,
      metrics: {},
      notes: '',
      save: async () => {},
      ...overrides,
    });

    try {
      // proposed -> active is forbidden outright.
      LearningArtifact.findOne = async () => makeArtifact({ status: 'proposed' });
      await assert.rejects(
        () => versionRegistry.setStatus({
          kind: versionRegistry.KINDS.RUBRIC,
          version: 'candidate-test',
          status: 'active',
          approvedBy: 'admin-1',
        }),
        /Illegal transition/
      );

      // canary -> active requires explicit human approval.
      LearningArtifact.findOne = async () => makeArtifact({ status: 'canary' });
      await assert.rejects(
        () => versionRegistry.setStatus({
          kind: versionRegistry.KINDS.RUBRIC,
          version: 'candidate-test',
          status: 'active',
        }),
        /explicit human approval/
      );

      // canary -> active is blocked by the sample-size gate.
      LearningArtifact.findOne = async () => makeArtifact({ status: 'canary', sampleSize: 1 });
      await assert.rejects(
        () => versionRegistry.setStatus({
          kind: versionRegistry.KINDS.RUBRIC,
          version: 'candidate-test',
          status: 'active',
          approvedBy: 'admin-1',
        }),
        /Insufficient evidence/
      );
    } finally {
      LearningArtifact.findOne = originalFindOne;
    }
  });

  await check('scheduler: covers every supported interview track', () => {
    assert.strictEqual(scheduler.TYPES.length, 8);
    ['dsa', 'system_design', 'behavioral', 'hr_round', 'case_study', 'product_management', 'sales_pitch', 'managerial'].forEach(
      (type) => assert.ok(scheduler.TYPES.includes(type), `missing ${type}`)
    );
  });

  console.log(`\n${passed} checks passed.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
