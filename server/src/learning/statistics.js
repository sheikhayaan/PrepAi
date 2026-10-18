/**
 * Small, dependency-free statistics helpers used by the calibration and
 * evaluation loops. All functions are pure and validated by unit tests.
 */

function toNumericArray(values = []) {
  return values
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map(Number)
    .filter(Number.isFinite);
}

function mean(values = []) {
  const nums = toNumericArray(values);
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stddev(values = []) {
  const nums = toNumericArray(values);
  if (nums.length < 2) return 0;
  const m = mean(nums);
  const variance = nums.reduce((acc, v) => acc + (v - m) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

/**
 * Quadratic weighted Cohen's kappa for ordinal 0..maxScore ratings.
 * Returns NaN when there is no expected disagreement (degenerate input).
 */
function weightedKappa(pairs = [], maxScore = 10) {
  const rows = pairs
    .map(([a, b]) => [Number(a), Number(b)])
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
  if (rows.length < 2) return NaN;

  const buckets = maxScore + 1;
  const observed = Array.from({ length: buckets }, () => new Array(buckets).fill(0));
  const rowTotals = new Array(buckets).fill(0);
  const colTotals = new Array(buckets).fill(0);

  rows.forEach(([a, b]) => {
    const ra = Math.min(maxScore, Math.max(0, Math.round(a)));
    const rb = Math.min(maxScore, Math.max(0, Math.round(b)));
    observed[ra][rb] += 1;
    rowTotals[ra] += 1;
    colTotals[rb] += 1;
  });

  const n = rows.length;
  let observedDisagreement = 0;
  let expectedDisagreement = 0;

  for (let i = 0; i < buckets; i++) {
    for (let j = 0; j < buckets; j++) {
      const weight = ((i - j) ** 2) / (maxScore ** 2);
      observedDisagreement += weight * observed[i][j];
      expectedDisagreement += weight * ((rowTotals[i] * colTotals[j]) / n);
    }
  }

  if (expectedDisagreement === 0) return NaN;
  return 1 - observedDisagreement / expectedDisagreement;
}

/**
 * ICC(2,1): two-way random effects, single rater, absolute agreement.
 * @param {Array<Array<number>>} rows subjects x raters
 */
function icc21(rows = []) {
  const data = rows
    .map((row) => row.map(Number))
    .filter((row) => row.length >= 2 && row.every(Number.isFinite));
  if (data.length < 2) return NaN;

  const k = data[0].length;
  const n = data.length;
  const grand = mean(data.flat());
  const rowMeans = data.map((row) => mean(row));
  const colMeans = Array.from({ length: k }, (_, j) => mean(data.map((row) => row[j])));

  const ssRows = k * rowMeans.reduce((acc, m) => acc + (m - grand) ** 2, 0);
  const ssCols = n * colMeans.reduce((acc, m) => acc + (m - grand) ** 2, 0);
  let ssError = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      ssError += (data[i][j] - rowMeans[i] - colMeans[j] + grand) ** 2;
    }
  }

  const msRows = ssRows / (n - 1);
  const msCols = ssCols / (k - 1);
  const msError = ssError / ((n - 1) * (k - 1));
  const denominator = msRows + (k - 1) * msError + (k * (msCols - msError)) / n;
  if (denominator <= 0) return NaN;
  return (msRows - msError) / denominator;
}

function pearson(xs = [], ys = []) {
  const pairs = xs
    .map((x, i) => [x, ys[i]])
    .filter(([a, b]) => a !== null && a !== undefined && a !== '' && b !== null && b !== undefined && b !== '')
    .map(([a, b]) => [Number(a), Number(b)])
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
  if (pairs.length < 3) return NaN;

  const mx = mean(pairs.map(([a]) => a));
  const my = mean(pairs.map(([, b]) => b));
  let num = 0;
  let dx = 0;
  let dy = 0;
  pairs.forEach(([a, b]) => {
    num += (a - mx) * (b - my);
    dx += (a - mx) ** 2;
    dy += (b - my) ** 2;
  });
  if (dx === 0 || dy === 0) return NaN;
  return num / Math.sqrt(dx * dy);
}

/**
 * Z-score for a recent window mean against a baseline distribution.
 */
function windowZScore({ recentMean, baselineMean, baselineStdDev, recentN }) {
  if (!Number.isFinite(recentMean) || !Number.isFinite(baselineMean)) return 0;
  if (!Number.isFinite(baselineStdDev) || baselineStdDev <= 0 || !recentN || recentN < 2) return 0;
  return (recentMean - baselineMean) / (baselineStdDev / Math.sqrt(recentN));
}

module.exports = {
  toNumericArray,
  mean,
  stddev,
  weightedKappa,
  icc21,
  pearson,
  windowZScore,
};
