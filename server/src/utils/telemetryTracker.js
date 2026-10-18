/**
 * Telemetry Tracker & Sliding Window Latency Calculator
 * Provides true P50, P95, P99 percentile calculations, error rates, and AI token metrics
 */
class TelemetryTracker {
  constructor(windowSize = 1000) {
    this.windowSize = windowSize;
    this.latencies = []; // Circular sliding window
    this.totalRequests = 0;
    this.statusCounts = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    this.activeInterviewsCount = 0;
    this.aiMetrics = {
      totalRequests: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      errors: 0,
    };
    this.startTime = Date.now();
  }

  recordRequest(latencyMs, statusCode) {
    this.totalRequests++;

    // Record into sliding window
    if (this.latencies.length >= this.windowSize) {
      this.latencies.shift();
    }
    this.latencies.push(latencyMs);

    // Record status category
    if (statusCode >= 200 && statusCode < 300) this.statusCounts['2xx']++;
    else if (statusCode >= 300 && statusCode < 400) this.statusCounts['3xx']++;
    else if (statusCode >= 400 && statusCode < 500) this.statusCounts['4xx']++;
    else if (statusCode >= 500) this.statusCounts['5xx']++;
  }

  recordAiUsage({ promptTokens = 0, completionTokens = 0, isError = false }) {
    this.aiMetrics.totalRequests++;
    this.aiMetrics.promptTokens += promptTokens;
    this.aiMetrics.completionTokens += completionTokens;
    const total = promptTokens + completionTokens;
    this.aiMetrics.totalTokens += total;

    // Claude 3.5 Sonnet: $3 / 1M prompt tokens, $15 / 1M completion tokens
    const cost = (promptTokens * 0.000003) + (completionTokens * 0.000015);
    this.aiMetrics.estimatedCostUsd = parseFloat((this.aiMetrics.estimatedCostUsd + cost).toFixed(4));

    if (isError) {
      this.aiMetrics.errors++;
    }
  }

  getPercentile(p) {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return Math.max(0, sorted[Math.min(index, sorted.length - 1)] || 0);
  }

  getSnapshot() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const p50 = this.getPercentile(50);
    const p95 = this.getPercentile(95);
    const p99 = this.getPercentile(99);

    const errorRate = this.totalRequests > 0
      ? parseFloat(((this.statusCounts['5xx'] / this.totalRequests) * 100).toFixed(2))
      : 0;

    const clientErrorRate = this.totalRequests > 0
      ? parseFloat(((this.statusCounts['4xx'] / this.totalRequests) * 100).toFixed(2))
      : 0;

    return {
      uptimeSeconds,
      totalRequests: this.totalRequests,
      statusCounts: this.statusCounts,
      errorRate5xx: errorRate,
      clientErrorRate4xx: clientErrorRate,
      latency: {
        p50Ms: Math.round(p50),
        p95Ms: Math.round(p95),
        p99Ms: Math.round(p99),
        sampleSize: this.latencies.length,
      },
      aiMetrics: this.aiMetrics,
      activeInterviewsCount: this.activeInterviewsCount,
    };
  }
}

const tracker = new TelemetryTracker(1000);

module.exports = tracker;
