/**
 * Spike + soak fault-injection scenario.
 *
 * Ramps from 20 to 1,200 VUs in 30s to verify queueing, 429s and graceful
 * degradation instead of collapse. Expect some 429/503 responses at the peak:
 * the assertion is that the service returns *typed* errors quickly and fully
 * recovers (no 5xx storm, no hung sockets).
 *
 *   k6 run load-tests/k6-spike.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:5000';
export const serverErrors = new Rate('server_errors');
export const typedRejections = new Rate('typed_rejections');

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 20,
      stages: [
        { duration: '30s', target: 1200 },
        { duration: '2m', target: 1200 },
        { duration: '30s', target: 20 },
        { duration: '2m', target: 20 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    server_errors: ['rate<0.05'],
    typed_rejections: ['rate<0.2'],
    http_req_duration: ['p(99)<5000'],
  },
};

export default function () {
  const res = http.get(`${BASE}/api/interviews/questions?type=system_design`);
  check(res, { 'responded': (r) => r.status > 0 });

  if (res.status >= 500) serverErrors.add(1);
  if ([429, 503].includes(res.status)) {
    typedRejections.add(1);
    try {
      const body = res.json();
      check(body, {
        'typed error code': (b) => Boolean(b.code || b.error),
        'retry-after present': () => Boolean(res.headers['Retry-After']),
      });
    } catch (err) {
      check(res, { 'error body is JSON': () => false });
    }
  }

  sleep(Math.random() * 2);
}
