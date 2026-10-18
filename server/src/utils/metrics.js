/**
 * Dependency-free Prometheus metrics registry.
 *
 * Provides counters, gauges and histograms with bounded label cardinality.
 * The existing sliding-window telemetry tracker remains the admin-dashboard
 * source of truth; this registry is for load tests and production scraping.
 */

const counters = new Map();
const gauges = new Map();
const histograms = new Map();

const DEFAULT_BUCKETS = [5, 10, 25, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 30000, 60000];

function labelKey(labels = {}) {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return '';
  return keys.map((k) => `${k}="${String(labels[k]).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',');
}

function keyFor(name, labels) {
  const lk = labelKey(labels);
  return lk ? `${name}{${lk}}` : name;
}

function inc(name, labels = {}, value = 1) {
  const key = keyFor(name, labels);
  counters.set(key, (counters.get(key) || 0) + value);
}

function setGauge(name, labels = {}, value = 0) {
  gauges.set(keyFor(name, labels), value);
}

function addGauge(name, labels = {}, delta = 1) {
  const key = keyFor(name, labels);
  gauges.set(key, (gauges.get(key) || 0) + delta);
}

function observe(name, labels = {}, value = 0, buckets = DEFAULT_BUCKETS) {
  const key = keyFor(name, labels);
  let entry = histograms.get(key);
  if (!entry) {
    entry = { buckets: [...buckets].sort((a, b) => a - b), counts: new Map(), sum: 0, count: 0 };
    histograms.set(key, entry);
  }
  entry.sum += value;
  entry.count += 1;
  for (const bucket of entry.buckets) {
    if (value <= bucket) {
      entry.counts.set(bucket, (entry.counts.get(bucket) || 0) + 1);
      break;
    }
  }
}

/**
 * Normalize Express paths so IDs do not explode label cardinality.
 */
function normalizeRoute(req) {
  const routePath = req.route?.path;
  const base = req.baseUrl || '';
  if (routePath) return `${base}${routePath}`.replace(/\/+/g, '/');
  return (req.path || 'unknown')
    .replace(/[0-9a-fA-F]{24}/g, ':id')
    .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,}/g, ':uuid')
    .replace(/\/\d+/g, '/:n');
}

function render() {
  const lines = [];

  for (const [key, value] of counters) {
    lines.push(`# TYPE ${key.split('{')[0]} counter`);
    lines.push(`${key} ${value}`);
  }

  for (const [key, value] of gauges) {
    lines.push(`# TYPE ${key.split('{')[0]} gauge`);
    lines.push(`${key} ${value}`);
  }

  for (const [key, entry] of histograms) {
    const name = key.split('{')[0];
    const labelPart = key.includes('{') ? key.slice(name.length + 1, -1) : '';
    lines.push(`# TYPE ${name} histogram`);
    let cumulative = 0;
    for (const bucket of entry.buckets) {
      cumulative += entry.counts.get(bucket) || 0;
      const labels = `${labelPart}${labelPart ? ',' : ''}le="${bucket}"`;
      lines.push(`${name}_bucket{${labels}} ${cumulative}`);
    }
    const infLabels = `${labelPart}${labelPart ? ',' : ''}le="+Inf"`;
    lines.push(`${name}_bucket{${infLabels}} ${entry.count}`);
    lines.push(`${name}_sum${labelPart ? `{${labelPart}}` : ''} ${entry.sum}`);
    lines.push(`${name}_count${labelPart ? `{${labelPart}}` : ''} ${entry.count}`);
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  inc,
  setGauge,
  addGauge,
  observe,
  render,
  normalizeRoute,
  DEFAULT_BUCKETS,
};
