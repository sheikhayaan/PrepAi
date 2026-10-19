/**
 * k6 scenario for the 1,000-concurrent-user target with a mocked LLM.
 *
 * Start the API with ANTHROPIC_API_KEY unset so every LLM call uses the
 * deterministic simulated path (no provider quota, no cost). Redis is optional;
 * without it the in-memory fallbacks are exercised.
 *
 *   k6 run load-tests/k6-mocked-llm.js
 *
 * Environment:
 *   BASE_URL       default http://localhost:5000
 *   READ_VUS       default 1000
 *   INTERVIEW_VUS  default 100
 *   DURATION       default 5m
 *
 * Seed users first so per-user SSE/answer limits are realistic:
 *   USERS=200 node load-tests/seed-users.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const BASE = __ENV.BASE_URL || 'http://localhost:5000';
const READ_VUS = Number(__ENV.READ_VUS || 1000);
const INTERVIEW_VUS = Number(__ENV.INTERVIEW_VUS || 100);
const DURATION = __ENV.DURATION || '5m';

let seededUsers = [];
try {
  seededUsers = new SharedArray('tokens', () => {
    const raw = open('./.tokens.json');
    return JSON.parse(raw).users;
  });
} catch (err) {
  seededUsers = [];
}

export const sseWaiting = new Trend('sse_waiting_ms', true);
export const sseFailed = new Rate('sse_failed');

export const options = {
  scenarios: {
    read_path: {
      executor: 'ramping-vus',
      exec: 'readPath',
      startVUs: 0,
      stages: [
        { duration: '2m', target: Math.round(READ_VUS * 0.5) },
        { duration: DURATION, target: READ_VUS },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    interview_path: {
      executor: 'constant-vus',
      exec: 'interviewPath',
      vus: INTERVIEW_VUS,
      duration: DURATION,
      startTime: '30s',
      gracefulStop: '60s',
    },
  },
  thresholds: {
    'http_req_failed{scenario:read_path}': ['rate<0.01'],
    'http_req_duration{scenario:read_path}': ['p(95)<400', 'p(99)<1000'],
    sse_failed: ['rate<0.05'],
    sse_waiting_ms: ['p(95)<4000'],
  },
};

function authHeaders(cookie) {
  return cookie
    ? { headers: { Cookie: cookie, 'Content-Type': 'application/json' } }
    : { headers: { 'Content-Type': 'application/json' } };
}

function pickUser() {
  if (seededUsers.length === 0) return null;
  return seededUsers[(__VU + __ITER) % seededUsers.length];
}

export function readPath() {
  const user = pickUser();
  const headers = authHeaders(user && user.cookie);
  const res = http.get(`${BASE}/api/interviews/questions?type=dsa&limit=20`, headers);
  check(res, { 'questions 200/304': (r) => r.status === 200 || r.status === 304 });

  const analytics = http.get(`${BASE}/api/analytics`, headers);
  check(analytics, { 'analytics 200/401': (r) => r.status === 200 || r.status === 401 });

  sleep(Math.random() * 1.5);
}

export function interviewPath() {
  const user = pickUser();
  const headers = authHeaders(user && user.cookie);
  if (!user) {
    // Anonymous probe still exercises the ingress + limiter path.
    const res = http.get(`${BASE}/health`);
    check(res, { 'health 200': (r) => r.status === 200 });
    sleep(1);
    return;
  }

  const start = http.post(`${BASE}/api/interviews/start`, JSON.stringify({ type: 'dsa' }), headers);
  const ok = check(start, { 'start 201': (r) => r.status === 201 });
  if (!ok) {
    sleep(1);
    return;
  }

  let session;
  try {
    session = start.json().session;
  } catch (err) {
    return;
  }

  const answerRes = http.post(
    `${BASE}/api/interviews/${session._id}/answer`,
    JSON.stringify({
      answer:
        'I would use a sliding window with a hash map. Maintain the left pointer, extend right, and shrink while the constraint is violated. Time O(n), space O(k).',
    }),
    { ...headers, timeout: '60s' }
  );

  const passed = check(answerRes, {
    'answer 200': (r) => r.status === 200,
    'answer is SSE': (r) => String(r.body || '').includes('event:') || String(r.body || '').includes('data:'),
  });
  if (!passed) sseFailed.add(1);
  sseWaiting.add(Number(answerRes.timings.waiting) || 0);

  // Close the session so the next iteration can start a new interview.
  // One-open-session-per-user is a product guardrail, not a load-test artifact.
  http.post(`${BASE}/api/interviews/${session._id}/complete`, JSON.stringify({}), {
    ...headers,
    timeout: '60s',
  });

  sleep(Math.random() * 2);
}
