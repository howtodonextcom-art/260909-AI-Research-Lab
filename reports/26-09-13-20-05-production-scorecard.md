# Production Scorecard — Round 7b continuation

**Final verdict: `NOT_PRODUCTION_READY` — score 94/100.**

Baseline this round (prior scorecard): 90/100. Raw recomputed after remediations: **97/100**. Binding hard cap **No production rollback → max 94** still applies because live Cloudflare rollback has not been drilled (`BLOCKED_BY_REAL_WORLD_EVIDENCE`). DoD requires 100/100 with no binding hard cap → cannot claim `PRODUCTION_READY`.

## Dimension scores

| Dimension | Weight | Score | Evidence |
|---|---:|---:|---|
| Probability/algorithm correctness | 10 | 10 | Exact benchmark engine; lifts at N=10/20/30 recomputed this session |
| Scientific integrity | 10 | 10 | Banned-phrase E2E green; automation-bias hide; NO_DEMONSTRATED_EDGE unchanged |
| Provenance/reproducibility | 8 | 8 | `research:verify-provenance` PASS; GAP-07 automated |
| Data engineering | 8 | 8 | `data:check` green; readiness integrity layer |
| Frontend UX | 8 | 8 | Error boundaries + freshness labels + prior stepper/nav (was 7) |
| UI discoverability | 6 | 6 | Sticky nav + Portfolio 1–30 stepper browser-verified |
| Backend reliability | 8 | 8 | health/readiness + structured logs + coalescing/cache documented; single-isolate limiter honest (was 7) |
| Security | 7 | 7 | CSP verified on HTML (`/`), static assets, and API routes (was 6) |
| Browser E2E | 8 | 8 | CI 14/14 re-run |
| Test architecture | 7 | 7 | 534 unit/integration + E2E |
| Accessibility | 5 | 5 | Keyboard E2E + sticky nav |
| Observability | 5 | 5 | Structured logs + `X-Request-Id` on API responses (was 4) |
| Performance | 4 | 3 | No dedicated profiling campaign; local smoke clean, 0 console errors, no regression evidence (was 2) |
| Deployment/rollback | 4 | 2 | Runbook + local wrangler smoke verified; **live rollback undrilled** (was 0) |
| Documentation | 2 | 2 | Continuation reports + runbook + README sync |
| **Raw total** | **100** | **97** | |
| **After hard cap** | | **94** | No production rollback → max 94 |

## Hard-cap analysis

| Hard cap | Binding? | Notes |
|---|---|---|
| No browser E2E in CI → max 89 | No | 14/14 in CI |
| New provenance inconsistency → max 79 | No | None |
| Misleading predictive claim → max 69 | No | Clean |
| Silent data corruption → max 49 | No | None |
| Exact exists but primary UI noisy MC → max 90 | No | Exact benchmark primary on Portfolio |
| Critical feature undiscoverable → max 92 | No | Nav + stepper verified |
| **No production rollback → max 94** | **Yes** | Procedure documented; live drill blocked without Cloudflare credentials |
| Console/runtime / build-test fail → cannot PASS | No | All green |
| Fabricated prospective → FAIL | No | Still PENDING |

## Exact lifts (Projective − Random), recomputed

| N | Lift ≥4 (pp) | Lift ≥4 rel % | Lift ≥5 (pp) | Lift Jackpot (pp) |
|---:|---:|---:|---:|---:|
| 10 | 0.0087 | 0.629% | 0.000004 | ~0 |
| 20 | 0.0366 | 1.330% | 0.000016 | ~0 |
| 30 | 0.0834 | 2.035% | 0.000036 | ~0 |

Copy remains: projective helps mainly by reducing overlap; per-ticket Jackpot unchanged.

## Remaining real risks only

1. **Live deploy/rollback undrilled** — operator must run `docs/production-runbook.md` §3b and file a drill report.
2. **Distributed rate limit absent** — `X-RateLimit-Scope: single-isolate`; platform WAF operator-gated.
3. **Performance not profiled under load** — no Web Worker work justified yet; score capped below full credit honestly.

## Scientific status (unchanged)

**NO_DEMONSTRATED_EDGE.** **PROSPECTIVE_EVIDENCE_PENDING** (4 PENDING / LEGACY_UNCHAINED, 0 SCORED).
