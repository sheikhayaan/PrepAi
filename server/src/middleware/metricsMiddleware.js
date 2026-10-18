/**
 * HTTP metrics middleware.
 *
 * Records request count and latency with normalized route labels (never raw
 * URLs) so Prometheus cardinality stays bounded even under 1,000 VUs.
 */
const metrics = require('../utils/metrics');

function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const route = metrics.normalizeRoute(req);
    const labels = { method: req.method, route };
    metrics.inc('prepai_http_requests_total', { ...labels, status: String(res.statusCode) });
    metrics.observe(
      'prepai_http_request_duration_ms',
      labels,
      Number(process.hrtime.bigint() - start) / 1e6
    );
    if (res.statusCode >= 500) {
      metrics.inc('prepai_http_server_errors_total', labels);
    }
  });

  next();
}

module.exports = metricsMiddleware;
