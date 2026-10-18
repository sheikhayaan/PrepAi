# PrepAI Production Rollback & Disaster Recovery SOP

This document defines the emergency rollback procedures and disaster recovery steps for PrepAI.

---

## 1. Quick Rollback Triggers

Initiate a rollback immediately if any of the following thresholds are breached within 10 minutes of deployment:
1. **5xx Server Error Rate $> 2.0\%$** on `/api/*`.
2. **P95 Latency $> 500\text{ms}$** on standard REST endpoints.
3. **Database connection failure** or pool exhaustion.
4. **Authentication regression** (users unable to log in or token verification failures).

---

## 2. Rollback Execution Steps

### A. Vercel Frontend Rollback (Zero Downtime)
1. Navigate to **Vercel Dashboard** $\to$ **Deployments**.
2. Identify the previous stable production deployment.
3. Click the three dots `...` $\to$ **Promote to Production**.
4. Propagation takes $< 5$ seconds worldwide across the edge network.

### B. Backend API Rollback (Render / Railway / Hugging Face / Docker)
1. **Git Revert**:
   ```bash
   git revert HEAD -m 1
   git push origin main
   ```
2. **Or Instant Tag Redeployment**:
   ```bash
   git checkout v1.0-stable
   # Trigger deployment pipeline
   ```
3. **Verify Health Endpoint**:
   ```bash
   curl -I https://api.yourdomain.com/health/ready
   # Must return HTTP/1.1 200 OK
   ```

---

## 3. Session Revocation & Emergency Security Invalidation

If an emergency token invalidation or breach isolation is required:
1. Increase `user.tokenVersion` globally across all records:
   ```javascript
   // Run via MongoDB Shell / Admin Script
   db.users.updateMany({}, { $inc: { tokenVersion: 1 } });
   ```
2. This will instantly force all active sessions and cookies across the platform to re-authenticate cleanly.

---

## 4. Learning-Artifact Rollback (Loops A–D)

Learned artifacts (rubric offsets, readiness weights, selection policy, prompt
evaluation) are versioned and never self-promoted. To roll back:

```bash
# Restore the previous active version, or the static default if none exists.
curl -X POST https://api.yourdomain.com/api/admin/learning/rollback \
  -H "Cookie: $ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"kind":"rubric_calibration","reason":"incident-1234"}'
```

Then verify:

```bash
curl -s https://api.yourdomain.com/api/admin/learning/snapshot -H "Cookie: $ADMIN_COOKIE"
```

Expected: `active` shows the restored `version` and the promotion/rollback is
present in the admin audit log (`action: learning.rollback`).

**Immediate kill switches** (no redeploy):

- `ADAPTIVE_SELECTION_ENABLED=false` — stop Loop A selection, fall back to the
  curated/random question bank.
- `LEARNING_LOOPS_ENABLED=false` — stop all scheduled proposals and evaluations.
- `LLM_FALLBACK_ENABLED=true` — keep interviews running on the simulated path
  during a provider incident.

Historical sessions retain their `rubricVersion` / `promptVersion` /
`weightsVersion` / `selectionPolicyVersion`, so rolling back does not rewrite
past scores.

---

## 5. SSE Drain During Deploys

On SIGTERM the API:

1. Stops accepting new connections and halts learning jobs.
2. Sends a `shutdown` event to every live stream.
3. Waits `SSE_DRAIN_MS` for clients to receive it.
4. Closes streams and idle sockets, then exits within
   `GRACEFUL_SHUTDOWN_MS`.

Clients reconnect with `Last-Event-ID`; the new instance replays buffered events
from Redis instead of starting a new LLM generation. If a deploy causes a
reconnect storm, raise `SSE_DEDUP_WINDOW_MS` and verify the LB idle timeout is
at least 120s.
