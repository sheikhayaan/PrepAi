#!/usr/bin/env node
/**
 * Concurrent SSE hold test.
 *
 * Opens N real answer streams (default 150) and measures:
 *   - time to first byte (headers flushed before the first token)
 *   - total stream duration
 *   - completion vs error frames
 *   - 429s from the connection registry
 *
 *   USERS=150 node load-tests/sse-soak.js
 *
 * Requires seeded cookies: `USERS=150 node load-tests/seed-users.js`.
 * Raise SSE_MAX_PER_IP when all clients share one loopback address, and run
 * with ANTHROPIC_API_KEY unset to exercise the simulated stream.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const tokenFile = path.join(__dirname, '.tokens.json');
const BASE = process.env.BASE_URL || 'http://localhost:5000';
const CONCURRENCY = Math.max(1, Number(process.env.USERS) || 150);
const ANSWER =
  'I would start with a sliding window over the array, tracking the left boundary and a frequency map. ' +
  'When the window becomes invalid I shrink from the left until it is valid again, recording the best length. ' +
  'This is O(n) time and O(k) space where k is the alphabet size.';

function request(url, method, body, cookie, { stream = false } = {}) {
  const parsed = new URL(url);
  const lib = parsed.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(cookie ? { Cookie: cookie } : {}),
        },
      },
      (res) => {
        if (!stream) {
          let raw = '';
          res.on('data', (c) => (raw += c));
          res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, raw }));
          return;
        }

        const result = {
          status: res.statusCode,
          ttfbMs: Date.now() - startedAt,
          chunks: 0,
          bytes: 0,
          done: false,
          error: null,
          raw: '',
        };
        res.on('data', (chunk) => {
          result.chunks += 1;
          result.bytes += chunk.length;
          const text = chunk.toString('utf8');
          if (result.raw.length < 8192) result.raw += text;
          if (text.includes('"type":"done"')) result.done = true;
          if (text.includes('"type":"error"')) result.error = 'stream_error';
        });
        res.on('end', () => {
          result.totalMs = Date.now() - startedAt;
          resolve(result);
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(120000, () => req.destroy(new Error('stream timeout')));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

async function runOne(user, index) {
  const start = await request(`${BASE}/api/interviews/start`, 'POST', { type: 'system_design' }, user.cookie);
  const parsed = parseJson(start.raw);
  const sessionId = parsed?.session?._id;
  if (!sessionId) {
    return { index, email: user.email, startStatus: start.status, failed: true, reason: 'start_failed' };
  }

  const stream = await request(
    `${BASE}/api/interviews/${sessionId}/answer`,
    'POST',
    { answer: ANSWER },
    user.cookie,
    { stream: true }
  );

  return {
    index,
    email: user.email,
    startStatus: start.status,
    status: stream.status,
    ttfbMs: stream.ttfbMs,
    totalMs: stream.totalMs,
    chunks: stream.chunks,
    bytes: stream.bytes,
    done: stream.done,
    failed: stream.status !== 200 || Boolean(stream.error) || !stream.done,
  };
}

async function main() {
  if (!fs.existsSync(tokenFile)) {
    console.error(`Missing ${tokenFile}. Run: USERS=${CONCURRENCY} node load-tests/seed-users.js`);
    process.exit(1);
  }
  const tokens = JSON.parse(fs.readFileSync(tokenFile, 'utf8')).users || [];
  if (tokens.length === 0) {
    console.error('No seeded tokens found.');
    process.exit(1);
  }

  const users = tokens.slice(0, CONCURRENCY);
  const startedAt = Date.now();
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < users.length) {
      const index = cursor++;
      try {
        results[index] = await runOne(users[index], index);
      } catch (err) {
        results[index] = { index, failed: true, reason: err.message };
      }
    }
  }

  await Promise.all(Array.from({ length: users.length }, worker));
  const elapsed = Date.now() - startedAt;

  const ok = results.filter((r) => r && !r.failed);
  const failed = results.filter((r) => !r || r.failed);
  const rateLimited = failed.filter((r) => r.status === 429);
  const ttfbs = ok.map((r) => r.ttfbMs).sort((a, b) => a - b);
  const p = (q) => (ttfbs.length ? ttfbs[Math.min(ttfbs.length - 1, Math.floor(q * ttfbs.length))] : 0);

  console.log('\nSSE soak summary');
  console.log(`  users:        ${users.length}`);
  console.log(`  elapsed:      ${elapsed} ms`);
  console.log(`  completed:    ${ok.length}`);
  console.log(`  failed:       ${failed.length} (429=${rateLimited.length})`);
  console.log(`  ttfb p50/p95: ${p(0.5)} / ${p(0.95)} ms`);
  console.log(`  total p95:    ${ok.map((r) => r.totalMs).sort((a, b) => a - b)[Math.floor(ok.length * 0.95)] || 0} ms`);
  if (failed.length) {
    console.log('  sample failures:', failed.slice(0, 5));
  }

  const failureRate = failed.length / Math.max(1, results.length);
  if (failureRate > 0.05) {
    console.error(`\nFAIL: failure rate ${(failureRate * 100).toFixed(1)}% exceeds 5%`);
    process.exit(1);
  }
  if (p(0.95) > 4000) {
    console.error(`\nFAIL: SSE TTFB p95 ${p(0.95)}ms exceeds 4000ms`);
    process.exit(1);
  }
  console.log('\nPASS');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
