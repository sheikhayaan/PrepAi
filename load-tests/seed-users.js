#!/usr/bin/env node
/**
 * Seed disposable load-test users and persist their auth cookies.
 *
 * Usage:
 *   BASE_URL=http://localhost:5000 USERS=200 node load-tests/seed-users.js
 *
 * Output: load-tests/.tokens.json (gitignored). The k6 and SSE scripts read it.
 *
 * Run against a NON-production database. Auth rate limiting must be raised or
 * disabled for the seeding window (see load-tests/README.md).
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const USERS = Math.max(1, Number(process.env.USERS) || 50);
const PASSWORD = process.env.LOADTEST_PASSWORD || 'LoadTest123!';
const CONCURRENCY = Math.max(1, Number(process.env.SEED_CONCURRENCY) || 8);
const OUT = path.join(__dirname, '.tokens.json');

function request(url, method, body, cookie) {
  const parsed = new URL(url);
  const lib = parsed.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
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
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data = raw;
          try {
            data = JSON.parse(raw);
          } catch (_) {
            /* non-JSON */
          }
          resolve({ status: res.statusCode, headers: res.headers, data });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function cookieFrom(headers) {
  const value = headers['set-cookie'];
  if (!value) return null;
  return (Array.isArray(value) ? value[0] : value).split(';')[0];
}

async function seedOne(index) {
  const email = `loadtest+${Date.now()}-${index}@dtu.ac.in`;
  const register = await request(`${BASE_URL}/api/auth/register`, 'POST', {
    name: `Load Test ${index}`,
    email,
    password: PASSWORD,
  });
  let cookie = cookieFrom(register.headers);
  if (!cookie) {
    const login = await request(`${BASE_URL}/api/auth/login`, 'POST', { email, password: PASSWORD });
    cookie = cookieFrom(login.headers);
  }
  if (!cookie) throw new Error(`No auth cookie for ${email} (register=${register.status})`);
  return { email, cookie };
}

async function main() {
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < USERS) {
      const index = cursor++;
      try {
        results[index] = await seedOne(index);
        if ((index + 1) % 10 === 0) console.log(`seeded ${index + 1}/${USERS}`);
      } catch (err) {
        console.error(`seed ${index} failed:`, err.message);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, USERS) }, worker));
  const tokens = results.filter(Boolean);
  fs.writeFileSync(OUT, JSON.stringify({ baseUrl: BASE_URL, users: tokens }, null, 2));
  console.log(`Wrote ${tokens.length}/${USERS} tokens to ${OUT}`);
  if (tokens.length === 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
