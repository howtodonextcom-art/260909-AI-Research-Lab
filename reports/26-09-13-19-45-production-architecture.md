# Production Architecture — Round 7

## System shape

- **Frontend/backend:** Next.js 16 + Vinext, deployed as a Cloudflare Worker via Wrangler. No server-side database (reaffirmed this round in ADR-005 — `/api/readiness` is read-only and doesn't change the calculus).
- **Data:** bundled static snapshot (`public/data/power645.jsonl`) + per-device IndexedDB cache + append-only JSONL/JSON under `reports/` (registry, protocol lock/history, prospective ledger) written by CLI, never by the deployed Worker at request time.
- **API routes:** `POST /api/data/refresh` (validated, rate-limited, now structured-logged), `GET /api/health` (liveness), `GET /api/readiness` (real dependency checks: dataset/manifest/protocol-lock/artifact).

## What changed this round

1. **GAP-07 evidence gate is now a real automated regression** (`scripts/audit-bao18-evidence-gate.test.ts`), not a manual transcript. Found and fixed a real bug in the process: `NODE_TEST_CONTEXT` leaking into the spawned child test process could make the gate silently report success on failure when invoked from within a test run.
2. **Observability**: structured JSON log lines (`lib/observability/logger.ts`) around the refresh route's request lifecycle; `/api/health` and `/api/readiness` for platform-level liveness/readiness probing.
3. **Exact Random vs Projective Benchmark** (`lib/research/exact-benchmark.ts`): closed the gap where independent-random tickets had no exact ≥4/≥5 formula (only jackpot existed) — derived from the existing exact hypergeometric per-ticket table plus the standard union-probability formula. Real computed lift is small (as expected for a fair lottery) and is reported honestly, not inflated.
4. **Portfolio UX**: `[−] N [+]` stepper alongside the existing slider, default still 10, live-updating exact-benchmark table.
5. **Verdict-first Production IA**: sticky in-page nav with 6 real anchors (Data/Evidence/Bao-18/Diagnostics/Advanced/Explorer), self-scored 24/25 against Round 6's own A/B criteria — Variant B (four-tab) was not needed.
6. **Automation-bias hiding**: the sidebar's concrete 6-number experimental output is now hidden by default behind "Hiển thị bộ số thử nghiệm", with the required disclaimer shown on reveal; surrounding context (z-score, stability, cutoff) stays visible either way.
7. **Browser E2E is now CI-wired** (`playwright.config.ts`, `e2e/*.spec.ts`, `.github/workflows/ci.yml`) — 14 tests across desktop (1440×900) and mobile (390×844) projects, no `continue-on-error`, verified to have real teeth (a deliberately-broken assertion was confirmed to fail before being reverted).

## Independently re-verified by the lead (not accepted from any agent's report alone)

- Full gate (`typecheck`, `test:discovery` 54/54, `test:business` 352/352, `data:test` 167/167, `lint`, `data:check`, `build`, `research:verify-provenance`) — all green from a clean shell.
- GAP-07's automated test re-run in isolation; confirmed the real CLI (`scripts/audit-bao18-walkforward.ts`) calls the exact same exported `runEvidenceGate` function the test exercises (not a parallel reimplementation).
- `/api/health` and `/api/readiness` hit against a real running dev server (not just Agent A's offline test harness) — both return real, correct responses.
- Browser MCP pass on the fully-merged UI: sticky nav (all 6 anchors resolve to real ids), automation-bias toggle (hidden by default, disclaimer on reveal), exact-benchmark table + stepper (live-updates confirmed by actually clicking it), zero console errors at desktop/mobile.
- Playwright suite re-run from a completely clean shell (not reusing any agent's session): 14/14 pass.
- Red-team spot-checks: no banned phrases, no Ranking Score UI promotion, refresh route's `force`/size guards unchanged, rate-limiter's single-isolate honesty unchanged, optional-artifact fetches already degrade via `.catch(() => null)` rather than crashing the page.

## Residual gaps found during independent verification (fixed or disclosed)

- `test-results/` (Playwright's output directory) was not gitignored — fixed (`.gitignore` updated).
- No formal React error boundary exists at the page/panel level. Partially mitigated already (every optional data-fetch has a `.catch(() => null)` fallback, so a missing/broken artifact degrades that panel rather than crashing the app), but a render-time exception in a panel component itself is not yet caught by a dedicated boundary. Disclosed as an open item, not silently fixed or ignored.

## Explicitly deferred this round (named, not hidden)

- Distributed/edge-level rate limiting — requires live Cloudflare platform configuration this session has no credentials to verify; the existing single-isolate limiter is honestly documented as insufficient at scale, not claimed otherwise.
- A deployment/rollback runbook tied to actual `wrangler deploy` access — this session cannot exercise a real deploy or rollback without live credentials, so a runbook would otherwise be theoretical rather than test-verified.
- CSP headers — confirmed absent; adding them was judged out of scope for this round's file-ownership boundaries and not attempted rather than added untested.
