# Verified Scorecard — Round 4

**Baseline score (start of this round):** not separately computed — the mission's baseline was "many prior rounds of real, re-verified work," not a fresh repo. This round is scored as an increment of genuine, evidence-backed closure on top of that baseline, not as if starting from zero.

**Final score: 89 / 100 — NOT 100/100.** Below is every dimension, its evidence, and the hard-cap analysis, computed honestly rather than asserted.

## Dimension scores

| Dimension | Weight | Score | Evidence |
|---|---|---|---|
| Provenance & immutability | 15 | 13 | Real registry↔artifact drift found, root-caused, fixed, and honestly documented (not hidden); hash-chained prospective ledger built and unit-tested; live-verified no-op on real files. Deduction: the evidence-gate mechanism (Bao-18 CLI refusing to write an artifact if its own tests fail) was verified via Agent B's report, not independently re-broken-and-retested by the lead. |
| Statistical correctness | 12 | 11 | Misleading CI language fixed and renamed; genuinely valid paired bootstrap CI added; scientific-identity/build-provenance split proven by a real hash-invariance test. Deduction: the lead spot-checked but did not independently re-derive every statistic from scratch. |
| Algorithm correctness / anti-leak | 10 | 10 | All 5 required anti-leak tests plus the §29 brute-force proof pass; adversarial fixture testing (seed-collision scan, n=0/x=0/x=n boundary checks) found nothing broken. Live audit re-run on the real 1561-draw dataset reproduces `NO_EDGE` for all rules. |
| Test completeness / discovery | 10 | 10 | Real gap found (2 orphans + 1 phantom test file) and **structurally closed**, not just patched: `scripts/verify-test-discovery.ts` is now wired as the first step of `npm test` and will catch this class of bug automatically forever. 44/44 test files now accounted for exactly once. |
| UI capability exposure | 10 | 8 | Scientific Verdict, Bao-18 panel, Capability Inspector all built, wired, and browser-verified with real data. Deduction: Ablation and Portfolio Monte Carlo still have only a textual CLI-only status line, no real numbers surfaced — see hard-cap note below. |
| Browser runtime correctness | 10 | 7 | 3 viewports (1440×900, 768×1024, 390×844) exercised for the core Research/Portfolio/Capability-Inspector journeys; zero console errors/warnings at any viewport. Deduction: Ticket Simulator and Data Explorer's interactive flow were not re-exercised this round (verified in a prior round against unmodified code); keyboard/a11y journey not exercised at all this round. |
| Prospective pipeline integrity | 8 | 7 | Redesigned to append-only hash-chained events, thoroughly unit-tested (tamper/delete/reorder/dangling-reference), live-verified byte-identical no-op. Deduction: the chain has never yet processed a real (non-legacy) scoring event, since draw `#01562` hasn't occurred — the design is tested but not yet battle-tested against real data. |
| Data engineering integrity | 7 | 7 | `data:check` green, dataset hash unchanged, all 143 data tests pass, no regressions introduced. |
| Accessibility / responsive UX | 6 | 4 | Responsive layout verified at all 3 required viewports, no overflow, verdicts/caveats visible throughout. Deduction: no live keyboard-navigation or focus-order MCP pass this round (only the pre-existing static `a11y.test.ts` suite, unmodified). |
| Security / operator gating | 5 | 5 | No new public mutation surface introduced; prospective freeze/append correctly remain CLI-only; Capability Inspector explicitly states this is by design, not a gap. |
| Reproducibility / CI | 5 | 5 | `.github/workflows/ci.yml` runs typecheck → lint → test (which now includes test-discovery) → data:check → provenance-verify → build, in that order; all green locally in the exact same commands CI would run. |
| Documentation / evidence quality | 2 | 2 | 5 required reports produced, each citing concrete commands/output/file paths rather than assertions; known gaps stated explicitly rather than omitted. |
| **Raw total** | **100** | **89** | |

## Hard-cap analysis (applied honestly, not to flatter the score)

| Hard cap | Applicable? | Reasoning |
|---|---|---|
| Unresolved P0 provenance issue → max 79 | **No** | The one P0 issue found (registry↔artifact protocol-hash drift) has its root cause fixed (verified live) and the historical instance is transparently documented via a reviewed exception file, not hidden. This is treated as *resolved-with-documentation*, matching the mission's own explicit allowance for "migration/supersession records [that] preserve historical provenance rather than rewriting history invisibly." This is a judgment call — a future reviewer who disagrees should treat the true ceiling as 79, not 89. |
| Silent data leakage → max 49 | No | None found. |
| Misleading predictive claim → max 69 | No | Banned-phrase scan clean; verdict language honest at every layer checked. |
| Meaningful engine capability absent from UI status/exposure → max 89 | **Yes** | Ablation and Portfolio Monte Carlo remain effectively `CLI_ONLY` in substance (a one-line text description, not real rendered numbers) despite now having a status row. This cap is binding and is the actual ceiling this round. |
| Orphan test file → max 94 | No (resolved this round) | 0 orphans, 0 phantoms, permanent structural guard added. |
| Browser MCP not completed → max 90 | **Yes** | Journeys 3, 4 (interactive), and 6 were not exercised this round. |
| Build failure → cannot claim PASS | No | Build green. |
| Test failure → cannot claim PASS | No | All suites green. |
| Fabricated prospective evidence → automatic FAIL | No | The 4 real entries remain honestly PENDING; nothing fabricated. |

**Binding cap: 89** (the "absent from UI exposure" cap and the raw score coincide; the "Browser MCP incomplete" cap at 90 is also binding but looser).

## What would close the remaining 11 points

1. Export real JSON summaries for Ablation and Portfolio Monte Carlo (matching the existing `export-bao18-summary.ts`/`export-prospective-summary.ts` pattern) and render actual numbers, not just a status line — closes the UI-exposure cap.
2. Complete Browser MCP Journeys 3 (Ticket Simulator interaction), 4 (Data Explorer type-and-verify), and 6 (keyboard/focus-order) against the current code.
3. Independently re-attack the Bao-18 evidence gate (deliberately break a test, confirm the CLI refuses to write an artifact) rather than relying on Agent B's own report of having done so.
4. Exercise the prospective hash chain against a real (non-legacy) scoring event once draw `#01562` actually occurs — not achievable on demand, a legitimate `PENDING` external-world limitation, not a code gap.

## Unresolved real-world evidence (not an engineering gap)

- Prospective evidence: 4 PENDING, 0 SCORED. This is correct and expected — draw `#01562` has not happened. It cannot be closed by more engineering.

## Exact scientific status

**NO_DEMONSTRATED_EDGE** for every retrospective strategy tested (RANDOM/HOT/COLD/BALANCED in the main protocol; RANDOM18/HOT18/COLD18/OVERDUE18/BALANCED18 in the Bao-18 walk-forward audit), and **PROSPECTIVE_EVIDENCE_PENDING** for the 4 frozen predictions awaiting draw `#01562`. Scientific grade unchanged: **C — NO DEMONSTRATED EDGE**.
