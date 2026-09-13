# Production Readiness Baseline — Round 7 (Production Upgrade Combined Program)

**Mission:** `prompts/26-09-13-18-30--master-prompt-production-upgrade-combined.md`, inheriting `prompts/26-09-13-17-53--master-prompt-round6-production-100.md` and the parent research-integrity master prompt.
**HEAD at start:** `00cee3c4b9fefc31083292a791569fe6700756e4`, branch `main`.
**Dirty tree at start:** `README.md` (modified), `CLAUDE.md` (new), 2 new prompt files — all from the immediately preceding turn (README/CLAUDE.md rewrite), not part of this round's work. Preserved, not touched.

## Baseline commands (ignoring prior 97/100 claims — re-verified fresh)

| Command | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm run test:discovery` | 47 files, 0 orphans/phantoms |
| `npm test` | 329 business + 143 data = 472, all pass |
| `npm run data:check` | clean, hash matches manifest |
| `npm run research:verify-provenance` | PASS, no unexplained violations |
| `npm run build` | succeeded after clearing 6 stray `wrangler`/`workerd`/`esbuild` processes (started ~17:39, holding `dist/` locked — judged safe to stop: local dev tooling, easily restartable, no data/production risk, consistent with every prior round's handling of this exact recurring issue) |

## Independent baseline score against this round's own scorecard (§29)

Not yet computed numerically — that requires implementing this round's work first. Structurally, going in: the codebase already has strong Provenance/Reproducibility, Scientific integrity, Data engineering, and Test architecture (inherited from Rounds 1–6, all re-verified above). The dimensions this round's prompt adds that are **not yet met** at baseline: Browser E2E in CI (hard cap, currently MCP-only — max 89), Backend reliability observability (no `/api/health`/`/api/readiness`, no structured logging), the Exact Random vs Projective Benchmark as *primary* UI (currently the cost-frontier panel exists but not this specific lift-comparison framing), Portfolio 10/20/30 discoverability UX, automation-bias hiding of six-number experimental output, and a deployment/rollback runbook. GAP-07 (Bao-18 evidence gate) has a manual break-restore transcript from Round 5 but **no permanent automated regression test** — Round 6 explicitly names this as a residual blocker.

## Round-6 residuals status at baseline (per this round's Phase 0 instruction to close them if still open)

| Residual | Status at baseline |
|---|---|
| GAP-07 automated regression | **Still open** — Round 5's evidence was a manual transcript, not a permanent test |
| Browser/a11y in CI (not MCP-only) | **Still open** — `.github/workflows/ci.yml` has no browser step |
| Capability matrix sync | Current as of Round 5 (`reports/26-09-13-17-32-capability-ui-exposure-matrix.md`), will need re-sync after this round's changes |

## Scope decision for this execution (stated up front, not discovered after the fact)

The combined prompt spans ~34 sections covering research integrity, an exact-benchmark engine, full UI/IA redesign, backend observability, distributed rate-limiting, security review, and a deployment/rollback runbook — a scope comparable to all of Rounds 1–6 combined. Attempting every section in one pass and then claiming `PRODUCTION_READY` would itself violate the prompt's own "never inflate" instruction. This round targets the highest-value, independently-verifiable subset via 4 parallel sub-agents plus independent lead verification:

- **Agent A** — GAP-07 automated regression, `/api/health` + `/api/readiness`, structured request logging on the refresh route, ADR-005 re-evaluation, security/reliability review.
- **Agent B** — Exact Random vs Projective Benchmark engine + UI, Portfolio 10/20/30 discoverability, Monte Carlo labeling policy pass.
- **Agent C** — Verdict-first Production IA (sticky in-page nav per §30's pre-selected default), automation-bias hiding of six-number sets, Ranking Score UX prune, capability matrix sync.
- **Agent D** — Playwright E2E test suite wired into CI (the browser-E2E hard-cap item).
- **Lead (this session)** — independent Browser MCP acceptance pass, red-team checklist, final production scorecard.

Explicitly deferred this round (named honestly, not silently dropped): distributed/edge rate-limiting (infra-dependent, unverifiable without a live edge deployment this session doesn't have credentials for), a full deployment/rollback runbook tied to actual Cloudflare deploy access, and a from-scratch historical-draw-correction redesign (existing `lib/data/merge.ts` conflict handling will be verified against §21's requirement rather than rebuilt, since it already appears to satisfy it).
