# Load & Soak Testing (1,000 concurrent users)

These scenarios validate the production target: **1,000 concurrent users** across
the read path plus **150 simultaneous SSE streams**, with a **mocked LLM** so the
run is deterministic and free.

## 1. Start the API in degraded-but-real mode

```bash
cd server
export NODE_ENV=development
export MONGO_URI=mongodb://localhost:27017/prepai_loadtest
export JWT_SECRET=local_loadtest_secret_at_least_32_chars
# Mocked LLM: force the deterministic simulation path.
unset ANTHROPIC_API_KEY

# Load-test-only limit overrides. Never use these values in production.
export RATE_LIMIT_AUTH_MAX=5000
export RATE_LIMIT_START_MAX=5000
export RATE_LIMIT_ANSWER_MAX=5000
export RATE_LIMIT_STANDARD_MAX=100000
export SSE_MAX_PER_USER=4
export SSE_MAX_PER_IP=1000
export LEARNING_LOOPS_ENABLED=false

node server.js
```

Redis is optional. With Redis running, the run exercises the shared cache,
rate-limit store, token budgets, global LLM budget and SSE registry. Without it,
the in-memory fallbacks are exercised (also a supported mode).

## 1b. Or point the load test at the Compose stack

The same run works against `docker compose` (nginx → API → Mongo/Redis) by
passing the overrides through the environment; the compose file forwards them:

```bash
export JWT_SECRET=$(openssl rand -hex 32)
export METRICS_TOKEN=local_loadtest_metrics_token
export RATE_LIMIT_AUTH_MAX=5000 RATE_LIMIT_START_MAX=5000        RATE_LIMIT_ANSWER_MAX=5000 RATE_LIMIT_STANDARD_MAX=100000
export SSE_MAX_PER_USER=4 SSE_MAX_PER_IP=1000
unset ANTHROPIC_API_KEY                 # forces the simulated LLM
docker compose up -d --build

BASE_URL=http://localhost:8080 USERS=200 SEED_CONCURRENCY=2   node load-tests/seed-users.js
BASE_URL=http://localhost:8080 USERS=200 node load-tests/sse-soak.js
```

Two practical notes learned from real runs:

- **Seed concurrency**: bcrypt cost 12 means `SEED_CONCURRENCY=8` can time out
  on a small host. Use `SEED_CONCURRENCY=2` and raise the auth limit as above.
- **Interview scenario**: the API allows one in-progress session per user, so the
  k6 interview flow now calls `/complete` before looping. Under 1,000-VU
  saturation on a single host, the interview VUs' `start` calls can fail at the
  dial layer before reaching nginx — measure SSE concurrency separately with
  `sse-soak.js` and report both numbers honestly.

The last measured run is recorded in `docs/assets/load-1000vu.json`.

## 2. Seed disposable users

```bash
BASE_URL=http://localhost:5000 USERS=200 node load-tests/seed-users.js
```

Writes `load-tests/.tokens.json` (gitignored). Use a **non-production database**.

## 3. Run the scenarios

```bash
# Read path at 1,000 VUs + 100 interview/SSE sessions.
k6 run load-tests/k6-mocked-llm.js

# Spike from 20 -> 1,200 VUs, then soak. Asserts typed 429/503s, not 5xx storms.
k6 run load-tests/k6-spike.js

# 150 concurrent real SSE streams with TTFB / completion assertions.
USERS=150 node load-tests/sse-soak.js
```

Useful k6 overrides:

```bash
READ_VUS=1000 INTERVIEW_VUS=100 DURATION=5m k6 run load-tests/k6-mocked-llm.js
```

## 4. SLOs asserted by the scripts

| Signal | Target |
|---|---|
| Read-path error rate | `< 1%` |
| Read-path latency | `p95 < 400 ms`, `p99 < 1 s` |
| SSE failure rate | `< 5%` |
| SSE TTFB | `p95 < 4 s` |
| Spike 5xx rate | `< 5%` |
| Spike p99 | `< 5 s` |

Server-side metrics to watch during the run (`GET /metrics`):

- `prepai_http_requests_total` / latency histogram
- `prepai_llm_queue_depth`, `prepai_llm_queue_timeouts_total`
- `prepai_llm_global_active` vs `LLM_GLOBAL_CONCURRENCY`
- `prepai_sse_active_connections`
- `prepai_token_budget_denied_total`
- `prepai_learning_*` (when learning loops are enabled)

## 5. Interpreting saturation

- **429 `RATE_LIMIT_EXCEEDED` on reads**: expected at extreme VUs when the
  standard bucket is left at production values. This is a *guardrail*, not a bug.
- **429 `SSE_CONNECTION_LIMIT`**: per-user/per-IP caps working. Raise the env
  values only for the load test.
- **503 `LLM_QUEUE_FULL` / `LLM_QUEUE_TIMEOUT`**: local semaphore saturated.
  Scale instances or raise `LLM_CONCURRENCY_PER_INSTANCE` only after checking
  provider limits.
- **502/504**: infrastructure problem (LB timeout, Mongo pool exhaustion,
  missing indexes). Check `TRUST_PROXY_HOPS`, Mongo `maxPoolSize`, and that
  Nginx has `proxy_buffering off` for `/api/interviews/*/answer`.
