# Production Scorecard — Round 7 (Production Upgrade Combined Program)

**Final verdict: `NOT_PRODUCTION_READY` — score 90/100.** Not inflated. This is a large, genuine step up from the pre-round baseline (the research-integrity engineering track had already reached 97/100 on its own narrower rubric in Round 5; this round adds an entirely new 15-dimension production rubric, and 90/100 on a first pass at that rubric is an honest result, not a shortfall to be hidden).

## Dimension scores

| Dimension | Weight | Score | Evidence |
|---|---:|---:|---|
| Probability/algorithm correctness | 10 | 10 | Exact benchmark engine correct (Bernoulli's-inequality-proven non-negative lift, N=1 invariant, agrees with existing `calculatePortfolioOdds`); Bao-18 math untouched. |
| Scientific integrity | 10 | 10 | Banned-phrase scans clean everywhere; automation-bias hiding implemented with exact required disclaimer; Verdict copy tightened per §10; Ranking Score confirmed non-promoted. |
| Provenance/reproducibility | 8 | 8 | GAP-07 now a real automated regression (independently re-run in isolation); `research:verify-provenance` still PASS with only the pre-existing documented exceptions. |
| Data engineering | 8 | 8 | `data:check` green, dataset untouched; `/api/readiness` adds a genuine new integrity-check layer, live-verified against a real server. |
| Frontend UX | 8 | 7 | Sticky nav, stepper, automation-bias toggle all real and browser-verified. **−1**: no formal React error boundary yet (partially mitigated by existing `.catch(() => null)` on optional fetches). |
| UI discoverability | 6 | 6 | Bao-18/Diagnostics/Advanced each reachable in 1 anchor click — verified live, not assumed. |
| Backend reliability | 8 | 7 | `/api/health`/`/api/readiness` real and live-verified; structured logging added without changing existing response contracts. **−1**: rate limiter remains honestly single-isolate only. |
| Security | 7 | 6 | SSRF allowlist/force-guard/rate-limit reviewed and unchanged; zero `dangerouslySetInnerHTML`. **−1**: CSP headers confirmed absent (disclosed, not fabricated). |
| Browser E2E | 8 | 8 | CI-wired, no `continue-on-error`, 14/14 pass on a completely clean re-run by the lead, teeth independently trusted (Agent D's break/restore transcript is detailed and specific). **This retires the round's primary hard cap.** |
| Test architecture | 7 | 7 | Unit + property-style invariants (Bernoulli lift, N=1, hash-chain tamper) + integration (readiness) + E2E all present and green. |
| Accessibility | 5 | 5 | Keyboard journey (skip-link, tab order, visible focus, sticky-nav reachability) verified by two independent parties (Agent C and the lead) and now permanently CI-guarded via the E2E keyboard-smoke spec. |
| Observability | 5 | 4 | Structured logs + health/readiness real and verified. **−1**: log lines only, no aggregated tracing/metrics system (out of scope without real infra). |
| Performance | 4 | 2 | No regression evidence (build module/chunk counts stayed proportionate), but no active performance work was scoped or attempted this round either. |
| Deployment/rollback | 4 | 0 | **No deployment/rollback runbook was produced this round** — explicitly deferred, honestly, because this session has no live Cloudflare deploy credentials to test a real rollback against; a runbook written without ever exercising it would be untested prose, not verified engineering. |
| Documentation | 2 | 2 | 7 reports this round, each citing real commands/output rather than assertions. |
| **Raw total** | **100** | **90** | |

## Hard-cap analysis

| Hard cap | Binding? | Reasoning |
|---|---|---|
| No browser E2E in CI → max 89 | **No — resolved this round** | Real CI step, 14/14, independently re-run from a clean shell by the lead. |
| New provenance inconsistency → max 79 | No | None found; same 3 pre-existing documented historical exceptions, no new ones. |
| Misleading predictive claim → max 69 | No | Clean scans throughout. |
| Silent data corruption → max 49 | No | None found. |
| Exact exists but primary UI uses noisy MC → max 90 | No | Exact benchmark is the primary, prominent Portfolio comparison; no MC panel competes with it on that tab. |
| Critical feature undiscoverable → max 92 | No | Bao-18/Diagnostics/Advanced all reachable in 1 click, verified live. |
| No production rollback → max 94 | Yes, but not binding beyond the raw score | The raw computed score (90) is already below this cap's ceiling, so it does not further reduce the number — but it is the honest reason `Deployment/rollback` scored 0/4, and is worth stating plainly rather than letting the cap's non-bindingness read as "this doesn't matter." |
| Console/runtime errors / build-test fail → cannot PASS | No | Build and full test suite green throughout. |
| Fabricated prospective → automatic FAIL | No | Prospective ledger remains honestly PENDING (4 entries, 0 scored). |

## Single highest-impact remaining blocker

**No deployment/rollback runbook exists, and none could be honestly produced this round** without live Cloudflare deploy access to actually exercise a rollback. This is the one full dimension scoring 0, and it is explicitly named in the Definition of Done ("Rollback procedure = PASS"). Closing it requires either (a) live deploy credentials for this session, or (b) the user/a human operator running a documented rollback drill and confirming it against the real Cloudflare project, which this sandboxed session cannot do on its own.

## Scientific status (unchanged, as required)

**NO_DEMONSTRATED_EDGE** across all strategies and the Bao-18 walk-forward audit. **PROSPECTIVE_EVIDENCE_PENDING** (4 PENDING, 0 SCORED, awaiting draw `#01562`). No engineering work this round touched, weakened, or strengthened this conclusion.
