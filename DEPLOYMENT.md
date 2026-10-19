# PrepAI Production Deployment Guide

This guide covers deploying PrepAI (React SPA + Node/Express API + MongoDB +
Redis + Anthropic) for the **1,000 concurrent user** target.

---

## 1. Architecture

```
Browser / Client (SPA)
       │
       ▼  HTTPS / TLS 1.3, WAF, edge rate limiting
Edge CDN / WAF (static assets + API proxy)
       │
       ▼  keep-alive, LB idle timeout >= 120s, buffering OFF for SSE
Load Balancer
       │
       ├── PrepAI API instance #1  (stateless, Node 20)
       ├── PrepAI API instance #2  (stateless, Node 20)
       └── ... N instances
              ├── MongoDB Atlas replica set (pool 75/instance, secondary reads)
              ├── Redis (cache, rate limits, token budgets, SSE registry, BullMQ)
              └── Anthropic Claude (per-instance + global concurrency ceilings)
```

### Horizontal scaling rules

1. **Stateless instances.** Sessions live in Mongo; SSE replay, rate-limit state,
   token budgets and the global LLM budget live in Redis. Sticky sessions are
   optional (they only reduce reconnect cost), never required for correctness.
2. **SSE lifecycle.** The answer route sets `X-Accel-Buffering: no`, sends
   heartbeats every `SSE_HEARTBEAT_MS`, supports `Last-Event-ID` replay, and caps
   concurrent streams per user/IP. Configure the LB idle timeout to **>= 120s**
   and disable response buffering for `/api/interviews/*/answer`.
3. **Deploys drain, not kill.** SIGTERM stops the learning scheduler, notifies
   SSE clients with a `shutdown` event, waits `SSE_DRAIN_MS`, then closes idle
   connections. Clients reconnect and replay from their last event id.
4. **Mongo sizing.** Set `MONGO_MAX_POOL_SIZE` per instance so
   `instances x pool` stays inside the cluster connection budget (4 x 75 = 300).
   Enable `MONGO_SECONDARY_READS=true` only on a replica set, for analytics and
   history routes.
5. **Redis is a shared accelerator, not a hard dependency.** Every helper has an
   in-memory fallback; losing Redis degrades limits/budgets to per-instance
   instead of returning 5xx. Alert when `redisHealth().ready === false`.
6. **LLM capacity.** `LLM_CONCURRENCY_PER_INSTANCE` is the per-process semaphore;
   `LLM_GLOBAL_CONCURRENCY` is the cluster-wide Redis ceiling. Exceeding either
   returns typed 503s and, when `LLM_FALLBACK_ENABLED=true`, falls back to the
   simulated interviewer instead of failing the interview.
7. **Proxy trust.** Set `TRUST_PROXY_HOPS` to the exact number of proxies in
   front of Node. A wrong value breaks IP rate limits and SSE per-IP caps.
8. **Edge/WAF.** Terminate TLS at the edge, enforce body size limits and bot
   rules, block unexpected methods, and keep `/metrics` private (token-gated).

---

## 2. Environment Variables Checklist

| Variable | Required | Description | Example / Recommendation |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | Environment mode | `production` |
| `PORT` | **Yes** | Server listening port | `5000` |
| `CLIENT_URL` | **Yes** | Production frontend URL (CORS allowlist) | `https://prepai.yourdomain.com` |
| `MONGO_URI` | **Yes** | MongoDB connection string | `mongodb+srv://.../prepai?retryWrites=true&w=majority` |
| `MONGO_MIN_POOL_SIZE` | No | Minimum pool per instance | `10` |
| `MONGO_MAX_POOL_SIZE` | No | Maximum pool per instance | `75` |
| `MONGO_SECONDARY_READS` | No | Read analytics from secondaries (replica set only) | `true` |
| `TRUST_PROXY_HOPS` | **Yes** | Trusted proxies (ALB/Render/Railway = 1) | `1` |
| `JWT_SECRET` | **Yes** | JWT signing secret (>= 32 chars) | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | No | Claude key; empty = simulated LLM | `sk-ant-api03-...` |
| `REDIS_URL` | Optional | Redis connection URI | `redis://default:pass@host:6379` |
| `METRICS_TOKEN` | **Yes** | Bearer token required for `/metrics` in prod | random 32+ chars |
| `LLM_CONCURRENCY_PER_INSTANCE` | No | Per-process LLM semaphore | `50` |
| `LLM_GLOBAL_CONCURRENCY` | No | Cluster-wide LLM ceiling (Redis) | `200` |
| `LLM_TOKEN_BUDGET_ENABLED` | No | Per-user/session token ceilings | `true` |
| `SSE_MAX_PER_USER` / `SSE_MAX_PER_IP` | No | Concurrent SSE caps | `2` / `10` |
| `SSE_HEARTBEAT_MS` | No | SSE keep-alive interval | `15000` |
| `LEARNING_LOOPS_ENABLED` | No | Offline learning scheduler (human-gated) | `true` |
| `ADAPTIVE_SELECTION_ENABLED` | No | Loop A adaptive question selection | `true` after calibration |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 Client ID | `your-id.apps.googleusercontent.com` |
| `EMAIL_PROVIDER` | **Yes** | Transactional mail transport | `resend` / `sendgrid` / `webhook` (never `console` in prod) |
| `EMAIL_API_KEY` | **Yes** | Provider API key (or webhook bearer) | `re_...` / `SG....` |
| `EMAIL_FROM` | **Yes** | Verified sender identity | `PrepAI <no-reply@prepai.app>` |
| `APP_PUBLIC_URL` | **Yes** | Browser origin used in verify/reset links (HTTPS) | `https://prepai.yourdomain.com` |

See [`.env.example`](.env.example) for the complete list with safe defaults.

---

## 3. Health, Metrics & Alerts

Configure uptime monitoring against:

- **Liveness**: `GET /health` (process is up)
- **Readiness**: `GET /health/ready` (Mongo required; Redis reported as
  `degraded`/`disabled`, never fatal)
- **Service info**: `GET /api/health`
- **Prometheus**: `GET /metrics` with `Authorization: Bearer $METRICS_TOKEN`
  (in production, missing/incorrect token is rejected)

### Alerts that matter

| Alert | Condition |
|---|---|
| LLM queue saturation | `prepai_llm_queue_depth` sustained high or queue-timeout rate > 1% |
| Global LLM budget | `prepai_llm_global_active` pinned at `LLM_GLOBAL_CONCURRENCY` |
| Token budget exhaustion | spike in `prepai_token_budget_denied_total` |
| SSE pressure | `prepai_sse_active_connections` approaching instance limits |
| Error budget | 5xx rate > 0.5% for 5 minutes |
| Redis degraded | readiness reports `redis: degraded` / health ping fails |
| Score drift | `prepai_learning_anomalies` > 0 after a deploy |

---

## 4. Continuous Learning Loops (human-gated)

Four offline loops improve selection, calibration, prompt/model choice and
personalisation. They are **never** allowed to self-promote:

1. **Loop A — adaptive selection.** Elo ability + item difficulty, exposure caps
   and an exploration floor. Enable with `ADAPTIVE_SELECTION_ENABLED=true`.
2. **Loop B — rubric calibration.** Offsets computed only from human overrides /
   reviewer scores / CSAT, with kappa/ICC and score-drift anomaly gates.
3. **Loop C — prompt/model evaluation.** Golden set built from human-annotated
   sessions; candidates move `proposed -> shadow -> canary -> active` and can be
   rolled back. Promotion requires an admin (`approvedBy`) and sufficient samples.
   Register candidates with `POST /api/admin/learning/prompt`; after promotion,
   set `PROMPT_VERSION`/`RUBRIC_VERSION` in the deploy environment to the promoted
   label so new sessions are stamped with it.
4. **Loop D — personalisation.** Hint/probing strategy adapts to recent scores;
   readiness weights are re-estimated from human-reviewed dimensions and bounded
   to `[0.1, 0.6]`.

Admin control plane (all transitions are audit-logged):

```bash
GET  /api/admin/learning/snapshot
GET  /api/admin/learning/versions?kind=rubric_calibration
GET  /api/admin/learning/calibration?type=dsa
POST /api/admin/learning/calibrate   { "type": "dsa" }
POST /api/admin/learning/readiness   { }
POST /api/admin/learning/prompt      { "type": "dsa", "promptVersion": "2026.03.1" }
POST /api/admin/learning/evaluate    { "kind": "rubric_calibration", "type": "dsa", "version": "..." }
POST /api/admin/learning/canary      { "kind": "...", "version": "..." }
POST /api/admin/learning/promote     { "kind": "...", "version": "...", "reason": "..." }
POST /api/admin/learning/rollback    { "kind": "...", "reason": "..." }
POST /api/admin/learning/feedback    { "sessionId": "...", "type": "dsa", "dimension": "clarity", "aiScore": 7.5, "humanScore": 8 }
```

Run the scheduler with `LEARNING_LOOPS_ENABLED=true`. Jobs are single-flight,
bounded, and failure-isolated from the request path. A promoted artifact takes
effect within `LEARNING_VERSION_CACHE_SECONDS` (default 1 hour) or immediately
after the promotion invalidates the cache.

---

## 5. Pre-Deployment Verification

```bash
# 1. Client production build
cd client && npm run build

# 2. Deterministic unit checks (no DB/Redis required)
cd .. && npm test          # learning + addendum + email delivery

# 3. Schema + security verification (MongoDB required)
cd server && node test-verification.js

# 4. Boot the API, then run E2E + SSE integration
node server.js &
node test-e2e.js

# 5. Load / spike / SSE soak (see load-tests/README.md)
cd .. && npm run load-test
```

---

## 5b. Container Deployment (single host)

```bash
JWT_SECRET=$(openssl rand -hex 32) EMAIL_PROVIDER=resend EMAIL_API_KEY=re_xxx APP_PUBLIC_URL=https://prepai.yourdomain.com docker compose up --build -d
```

- `web` (`:8080`) serves the built SPA and proxies `/api`; proxy buffering is off for SSE.
- `api` (`:5000`) runs as non-root with a liveness health check; readiness still gates traffic.
- Mongo and Redis are bundled for parity only — use managed services before scaling horizontally.
- Confirm mail delivery before opening signup: `prepai_email_sent_total{status="failed"}` must stay at 0.

## 6. Rollback

- **Application**: redeploy the previous container image. Migrations are
  additive; no destructive schema change is required for a rollback.
- **Learning artifacts**: `POST /api/admin/learning/rollback` restores the
  previous active version (or the static default). Sessions are stamped with
  `rubricVersion`, `promptVersion`, `weightsVersion` and `selectionPolicyVersion`
  so historical scores stay explainable.
- **Feature flags**: disable `ADAPTIVE_SELECTION_ENABLED` or
  `LEARNING_LOOPS_ENABLED` to stop writes without redeploying.
- **LLM**: set `LLM_FALLBACK_ENABLED=true` to keep interviews working during a
  provider incident; the simulated path is clearly marked in logs/metrics.
