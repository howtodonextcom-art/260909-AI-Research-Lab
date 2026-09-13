# Production Runbook

**Status:** documented procedure with **local smoke verification**. Deploy/rollback against a live Cloudflare project remains **`BLOCKED_BY_REAL_WORLD_EVIDENCE` / operator-gated** — this session has no live Cloudflare deploy credentials, so §§3–3b describe the correct procedure and a checklist an operator can execute, but have **not** been live-drilled. Do not treat undrilled rollback as proven incident readiness.

## 0. What this repo does and does not own

There is **no `npm run deploy` script in this repository** — deployment is handled by an external hosting integration (the app is served from a Cloudflare Worker; the specific deploy trigger — CI/CD platform, git-integration, or manual `wrangler deploy` — is external to this codebase and was not discoverable from source alone). Confirm the actual deploy mechanism with whoever manages the hosting account before following this runbook in a real incident.

What this repo DOES own and can verify locally:
```bash
npm run build                      # produces dist/ — the actual deployable artifact (+ writes CSP `_headers`)
npm run research:verify-provenance # must PASS before any deploy that touches reports/
npm test                           # full local gate
npm run e2e:ci                     # browser E2E, must PASS before any deploy
npm start                          # local wrangler against dist/ (smoke `/api/health` + `/api/readiness`)
```

## 1. Pre-deploy checklist

Before deploying a new build, run the full local gate and require every command to exit 0:

```bash
npm run typecheck
npm run test:discovery
npm test
npm run data:check
npm run research:verify-provenance
npm run build
npm run e2e:ci
```

**Never deploy if `research:verify-provenance` fails.** A provenance failure means the registry/protocol/artifact chain disagrees with itself — deploying on top of that risks shipping a UI that displays inconsistent scientific claims. Fix the provenance issue (or, if it's a genuinely new historical exception, document it via `reports/provenance-exceptions.json` per the existing exact-match-only pattern) before proceeding.

### 1b. Local post-build smoke (no Cloudflare credentials required)

After `npm run build` succeeds:

```bash
# Confirm CSP landed in the asset bundle (vinext may emit its own cache rule;
# `scripts/write-security-headers.mjs --dist` rewrites dist/client/_headers from
# lib/security/headers.ts so CSP cannot silently disappear).
rg -n "Content-Security-Policy" dist/client/_headers

npm start
# In another shell (replace port if wrangler prints a different one):
curl -sS -D - http://127.0.0.1:8787/api/health -o -
curl -sS -D - http://127.0.0.1:8787/api/readiness -o -
```

Expect: health `200` + `{"status":"ok",...}`; readiness `200` with `"ok":true` (or a named failing check if assets are missing — never a silent false ready). Response headers should include `Content-Security-Policy` and `X-Request-Id` on these API routes.

## 2. Data sync (routine)

```bash
npm run data:sync              # incremental sync from vietlott.vn
npm run data:check             # confirm hash/manifest consistency
git diff public/data/          # review the diff before committing
```

Commit the refreshed `public/data/power645.jsonl` + manifest, then deploy through the normal external pipeline. The Worker itself never writes data at request time — a data update is always a build-time/commit-time action.

## 3. Rollback (undrilled — `BLOCKED_BY_REAL_WORLD_EVIDENCE`)

**Operator gate:** validate this section against the real Cloudflare project before relying on it in an incident.

Since this repo has no in-house deploy script, rollback is whatever the external hosting platform's own rollback mechanism is (e.g., redeploying a previous git commit/build through that platform's dashboard or CLI). The repo-local half of a rollback:

1. Identify the last known-good commit: `git log --oneline -20`.
2. Confirm that commit's gate was green historically (check `reports/` for a closeout/scorecard report near that commit, or re-run the gate against a checkout of that commit in a scratch clone — never `git reset --hard` on the working tree to do this).
3. Trigger the external platform's redeploy-this-commit action (mechanism not owned by this repo — confirm with the hosting account owner).
4. After rollback, hit `/api/health` and `/api/readiness` against the live URL to confirm the rolled-back build is serving and passes its own readiness checks.
5. Record the drill result (pass/fail + timestamp + who ran it) in a new `reports/<ts>-rollback-drill.md` so the next session does not have to guess.

### 3b. Operator checklist (copy/paste when credentials exist)

- [ ] Confirm Cloudflare account + Worker/Pages project name
- [ ] Note current live deployment ID / git SHA
- [ ] Deploy candidate build (or promote preview)
- [ ] Smoke: `/api/health`, `/api/readiness`, home Research tab loads, Portfolio stepper 10→20→30
- [ ] If bad: rollback to previous deployment ID
- [ ] Re-smoke health/readiness on rolled-back URL
- [ ] File `reports/<ts>-rollback-drill.md` with evidence (status codes + deployment IDs)

## 4. Provenance verification failure (incident)

```bash
npm run research:verify-provenance
```

If this fails with an **unexplained** violation (not one of the pre-existing documented entries in `reports/provenance-exceptions.json`):
1. Do NOT deploy.
2. Do NOT edit `reports/experiments/registry.jsonl`, any `reports/experiments/*.json` artifact, or `reports/prospective-scorecard.jsonl` to "fix" the disagreement — these are append-only/immutable by design.
3. Identify the root cause (most likely: a script was changed to compute identity/hash differently without a corresponding migration).
4. Fix the root cause in code.
5. If the violation reflects a genuine historical fact (not an ongoing bug), document it as a new, fully-justified entry in `reports/provenance-exceptions.json` — never a blanket suppression, always an exact-match entry for the specific violation.

## 5. Upstream (vietlott.vn) outage

```bash
npm run data:verify-live   # read-only; exits 2 (not 1) when the network/upstream is unavailable — this is the correct "not executed" signal, not a data-integrity failure
```

The app's own client-side behavior already handles this gracefully: it always has the bundled snapshot + any valid IndexedDB cache to fall back to, and `POST /api/data/refresh` fails closed (old data preserved) rather than corrupting the snapshot on a partial/failed upstream fetch. No manual intervention is required for a transient upstream outage — only investigate if `data:verify-live` stays failing for an extended period, which would indicate an upstream structural change (see `lib/data/sources/vietlott-official.ts`'s parser, which is the most likely thing to need updating if vietlott.vn changes its page structure).

## 6. Stale data

Check current freshness:
```bash
npm run data:status
curl https://<deployed-url>/api/readiness
```

UI badge on Data Status shows **Fresh / Delayed / Stale / Unknown** from `lib/data/freshness.ts` (Fresh ≤12h since `lastSuccessfulSync`, Delayed ≤7d, Stale >7d). `/api/readiness` confirms the BUNDLED snapshot is present/consistent — it does not by itself tell you how recently it was synced. Cross-check `data:status`'s `lastSuccessfulSync` against the current date. If Stale, run a manual sync (§2) and redeploy.

## 7. General incident checklist

1. Check `/api/health` — if this fails, the Worker itself is down (platform-level incident, not an application bug).
2. Check `/api/readiness` — if this fails, read its JSON body for exactly which check failed (`dataset`/`manifest`/`protocolLock`/`requiredArtifact`) and address that specific cause rather than guessing.
3. Check recent commits for anything that touched `lib/data/`, `lib/research/protocol.ts`, or `scripts/run-experiment.ts` — these are the highest-blast-radius areas for a provenance or data-integrity incident.
4. Run the full local gate (§1) against the currently-deployed commit to confirm whether the issue is a genuine regression or an external/infra problem.
5. If in doubt, prefer rolling back (§3) over attempting a forward-fix under incident pressure — this project's own established discipline throughout its history has been to fix root causes deliberately, not patch live under time pressure.

## 8. Rate limiting honesty (operator-gated distributed layer)

In-repo mitigations (single-isolate / single-browser only):
- Soft sliding-window limiter on `POST /api/data/refresh` (`lib/data/rate-limit.ts`) — responses advertise `X-RateLimit-Scope: single-isolate`.
- Client single-flight (`lib/data/refresh.ts` `inFlight`).
- Official-fetch cache + in-process single-flight (`lib/data/official-fetch-cache.ts`, 12h TTL).

**Not claimed:** cross-isolate / edge WAF rate limiting. Configuring Cloudflare WAF rate-limiting rules (or Durable Object / KV counters) is **operator-gated** and remains `BLOCKED_BY_REAL_WORLD_EVIDENCE` until drilled with live credentials. See ADR-005.
