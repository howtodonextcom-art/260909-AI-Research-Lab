# Verified Scorecard — Round 5

**Baseline score (Round 4, honest):** 89/100, bound by two hard caps (UI-exposure absent, Browser MCP incomplete).
**Final score this round: 97 / 100 — `NOT_100`, not `VERIFIED_100`.** Both Round 4 hard caps are now resolved and non-binding; the remaining 3 points reflect genuine, disclosed residual gaps, not an artificial cap.

## Dimension scores

| Dimension | Weight | Score | Evidence / change from Round 4 |
|---|---|---|---|
| Provenance & immutability | 15 | 14 | GAP-02 closed: new experiment ids bind `protocolHash`, fail-closed collision guard added and tested, backward compatibility with the 3 real legacy rows preserved and live-verified (byte-identical re-run). GAP-07 evidence gate independently re-attacked by the lead (not just trusted from Agent B's Round 4 report) — genuinely refuses to write an artifact on test failure. **Deduction (1pt):** the evidence-gate re-attack is a real, reproducible manual demonstration, not a permanent automated regression test — a future code change could silently break the gate mechanism without CI catching it. |
| Statistical correctness | 12 | 11 | Unchanged from Round 4 — no new statistical logic this round beyond what was already fixed and tested. The GAP-01 Portfolio-MC honesty finding (declining to fabricate a Q-statistic/p-value the engine doesn't compute) is a positive signal reinforcing this score, not a new deduction. |
| Algorithm correctness / anti-leak | 10 | 10 | Bao-18 anti-leak suite unaffected this round; live audit still reproduces `NO_EDGE`; GAP-07's live re-attack strengthens confidence further. |
| Test completeness / discovery | 10 | 10 | `test:discovery` still 0 orphans/0 phantoms — now 47 test files (up from 44), the guard held through 3 concurrent agents' additions without any regression. |
| UI capability exposure | 10 | 10 | **GAP-01 closed — this retires the Round 4 hard cap.** Ablation and Portfolio Monte Carlo now render real numbers in a new Diagnostics panel, independently browser-verified (not just claimed by the implementing agent) at both viewports. |
| Browser runtime correctness | 10 | 9 | All 8 journeys now exercised with real interaction, including the previously-missing keyboard journey (skip-link, tab order, `aria-pressed` activation via Enter, visible focus, new anchor link reachability — all independently performed by the lead). **Deduction (1pt):** this is a real, reproducible manual MCP trace, not a CI-wired automated a11y/E2E regression suite — the master prompt's own text treats manual MCP as mandatory-but-complementary to automated tests, and no automated equivalent was added this round. |
| Prospective pipeline integrity | 8 | 8 | GAP-04 closed: chain health (0 chained, 4 legacy, verified) now genuinely surfaced in the UI, sourced from the real `verifyProspectiveChain` output, not fabricated. The remaining absence of a real chained scoring event is `BLOCKED_BY_REAL_WORLD_EVIDENCE` (draw `#01562` hasn't happened), not an engineering gap — full marks. |
| Data engineering integrity | 7 | 7 | `data:check` green throughout, dataset hash unchanged, no regressions. |
| Accessibility / responsive UX | 6 | 6 | GAP-06 closed: keyboard journey now has real, positive evidence at both viewports (see Browser MCP report). |
| Security / operator gating | 5 | 5 | No new public mutation surface; prospective freeze/append and the provenance verifier remain correctly CLI-only. |
| Reproducibility / CI | 5 | 5 | CI workflow unchanged and still accurately reflects local commands; new export scripts are UI-data-generation utilities, not test gates, so did not need CI wiring. |
| Documentation / evidence quality | 2 | 2 | 4 new reports, each citing real commands/output, disclosing 2 genuine mid-task discoveries (a live near-double-registration bug caught and fixed by Agent A; the Portfolio-MC statistic-mismatch honesty finding by Agent B) rather than omitting them. |
| **Raw total** | **100** | **97** | |

## Hard-cap analysis

| Hard cap | Applicable? | Reasoning |
|---|---|---|
| Unresolved P0 provenance → max 79 | No | Same judgment as Round 4 (root-caused, documented via exact-match exception, not hidden), now further strengthened by GAP-02's collision-proof identity scheme. |
| Silent leakage → max 49 | No | None found. |
| Misleading predictive claim → max 69 | No | Banned-phrase scans clean everywhere touched this round; Portfolio-MC's honest non-fabrication reinforces this. |
| Meaningful engine capability without substantive UI exposure → max 89 | **No — resolved this round** | Ablation and Portfolio-MC now show real, browser-verified numbers. This was the Round 4 binding cap; it no longer binds. |
| Orphan test file → max 94 | No | 0 orphans/phantoms, 47/47 files accounted for. |
| Browser MCP incomplete → max 90 | **No — resolved this round** | All 8 journeys, including keyboard, now have direct, reproducible evidence. This was the Round 4 secondary binding cap; it no longer binds. |
| Build/test failure → cannot PASS | No | All green. |
| Fabricated prospective evidence → automatic FAIL | No | Chain health honestly shows 0 chained/4 legacy; nothing fabricated. |

**No hard cap binds. The score is the raw computed 97, not an artificially-capped number.**

## Why this is NOT_100, and the single highest-impact remaining blocker

Per the master prompt's own instruction ("never inflate... return `NOT_100` with a precise residual score and the single highest-impact remaining blocker"): the 3 missing points are not a hard cap, but they are real. The single highest-impact remaining blocker, spanning two dimensions (Provenance −1, Browser runtime −1): **this round's two most safety-critical verifications — the Bao-18 evidence gate's fail-closed behavior, and the keyboard/focus-order journey — were independently demonstrated live by the lead, but neither was converted into a permanent, CI-enforced automated regression test.** A future code change could silently regress either without any test catching it; only a human (or another manual MCP audit) would notice.

This was a deliberate, disclosed trade-off this round, not an oversight: automating the evidence-gate re-attack would require either destructively mutating the real test file in CI (unsafe) or refactoring the gate's `execSync` mechanism to be independently unit-testable (a nontrivial change to already-proven-correct code, in tension with the master prompt's own "do not reopen unrelated refactors" constraint). Automating the keyboard journey would require introducing a CI-wired browser-test framework (e.g., Playwright test runner in CI) — a larger, riskier addition than a "small verified slice," and this repo currently has no such CI step at all (confirmed: `.github/workflows/ci.yml` runs no browser tests).

## Exact scientific status (unchanged, as required)

**NO_DEMONSTRATED_EDGE** for every retrospective strategy tested. **PROSPECTIVE_EVIDENCE_PENDING** for the 4 frozen predictions awaiting draw `#01562` (still 0 SCORED, 4 PENDING — confirmed via the new chain-health UI this round, not just the old flat count). Scientific grade unchanged: **C — NO DEMONSTRATED EDGE**. No engineering work this round touched, weakened, or strengthened this conclusion.
