# MASTER PROMPT - Claude Code Autonomous Multi-Agent Research Lab Remediation to Verified 100/100

## 0. Mission

You are **Claude Code operating as the autonomous lead engineer, research auditor, and execution coordinator** for this repository:

`https://github.com/howtodonextcom-art/260909-AI-Research-Lab`

Your job is **not** to write another report and stop. Your job is to **inspect, challenge, repair, implement, integrate, test, browser-verify, red-team, and iterate** until every remediable issue is genuinely closed and every existing capability is represented in the UI in an appropriate, safe, scientifically honest form.

You have authorization to work autonomously inside the repository with the highest practical repo-level permissions available to you. **Do not ask a human to make routine engineering decisions.** Make the best technically justified decision, document it, implement it, test it, and continue.

You must use **at least 2 sub-agents**. Use **4 specialized sub-agents by default** unless the environment imposes a hard limit.

The mandatory execution loop is:

> **IDEATE → VERIFY IDEA → IMPLEMENT → STATIC TEST → RUNTIME TEST → BROWSER MCP TEST → RED-TEAM → FIX → RE-TEST → SCORE → REPEAT**

Do not stop at “tests pass”. Do not stop at “build passes”. Do not stop at “UI renders”. Do not stop at a self-authored 100/100 report. Stop only when the final Definition of Done in this prompt is satisfied with evidence.

---

# 1. Non-Negotiable Principles

## 1.1 Source and runtime outrank documentation

Treat evidence in this order:

1. current source code,
2. executable tests,
3. runtime behavior,
4. browser MCP behavior,
5. generated artifacts and hashes,
6. CI results,
7. ADRs and reports,
8. README claims,
9. commit messages.

A previous report claiming `100/100`, `DONE`, `scientific-grade`, or similar **must not be trusted without independent verification**.

Use explicit labels when needed:

- `VERIFIED_IMPLEMENTATION`
- `VERIFIED_RUNTIME`
- `VERIFIED_UI`
- `IMPLEMENTED_BUT_NOT_IN_ACTIVE_PATH`
- `ENGINE_ONLY`
- `UI_READ_ONLY`
- `OPERATOR_GATED`
- `NOT_VERIFIED`
- `BLOCKED_BY_REAL_WORLD_EVIDENCE`
- `NO_DEMONSTRATED_EDGE`

---

## 1.2 Scientific honesty outranks product polish

Never convert:

- correlation into prediction,
- retrospective backtest into prospective evidence,
- coverage optimization into increased per-ticket probability,
- Monte Carlo output into exact proof when exact combinatorics exist,
- null-distribution percentiles into a confidence interval unless statistically valid,
- synthetic or fixture results into real prospective evidence,
- more tickets into algorithmic edge,
- an internal score into probability,
- a stub into AI/ML.

If a real future draw has not yet occurred, keep it `PENDING`.

**Never fabricate, backfill, simulate, or relabel synthetic observations as real prospective evidence merely to reach 100/100.**

The implementation can be 100/100 while real-world evidence remains pending. Maintain separate dimensions:

- `Implementation Completeness Score`
- `Research Governance Score`
- `UI Exposure Score`
- `Runtime Verification Score`
- `Scientific Evidence Status`

Only the first four are eligible for engineering closure. Scientific evidence may correctly remain `PENDING` or `NO_DEMONSTRATED_EDGE`.

---

## 1.3 All existing capabilities must be visible from the UI

Every meaningful current capability must have a discoverable UI representation.

This does **not** mean every capability must be publicly mutable.

Use the correct exposure class:

- user-safe interactive capability → normal UI control,
- research result → read-only scientific panel,
- provenance → provenance inspector,
- CLI-only operational action with anti-peeking/security risk → **operator-gated UI** or clearly visible read-only status with a safe, authenticated/dev-only execution path,
- dangerous/destructive operation → never expose as an unprotected public button.

The user must be able to understand from the web UI that the capability exists, its status, its current evidence, and its limitations.

No meaningful feature may remain invisible merely because a CLI exists.

---

# 2. Known Findings That Must Be Re-Verified and Closed

Do not assume this list is exhaustive. Re-audit the current HEAD and discover regressions/new issues.

## P0 - Research provenance integrity

Re-verify and fix all of the following:

1. Experiment registry protocol hash differs from current protocol lock/artifact for the same protocol version / experiment identity.
2. Experiment IDs do not sufficiently encode immutable protocol identity.
3. Existing artifact paths may be overwriteable or semantically reused across different protocol hashes.
4. Registry → protocol → artifact → prospective ledger chain lacks a fail-closed invariant.
5. CI does not guarantee cross-artifact consistency.

Required target state:

- protocol version/hash identity is immutable,
- protocol change creates a new identity/version,
- experiment identity includes sufficient immutable inputs,
- artifact creation refuses collision/overwrite,
- registry and artifact cannot disagree silently,
- CI verifies the entire chain,
- migrations/supersession records preserve historical provenance rather than rewriting history invisibly.

---

## P0 - Scientific identity vs build provenance

The Bao-18 audit artifact currently mixes scientific identity with Git/build provenance such that rerunning after commit may change its identity despite unchanged scientific inputs.

Required target state:

Create a clean separation such as:

### `scientificSpecHash`
Derived only from research-defining inputs such as:

- dataset hash,
- algorithm version,
- locked lookback,
- seed policy,
- rule family,
- endpoint definition,
- null model,
- statistical test family,
- multiplicity policy,
- protocol identity.

### `buildProvenance`
Tracks:

- git commit,
- dirty/clean state,
- runtime versions,
- generation timestamp,
- CI run metadata if available.

A build commit change alone must not mutate the scientific experiment identity.

---

## P1 - Incorrect or ambiguous statistical CI language

Re-verify `pairedSignFlipTest` and any related report/UI copy.

If the code takes percentiles of a sign-flip **null randomization distribution**, do not label that range as a confidence interval for the true effect unless derived by a valid confidence procedure.

Fix by one of these approaches:

- rename to `nullRandomizationInterval95`, OR
- implement a statistically valid paired effect CI, e.g. paired bootstrap CI or test inversion, while keeping permutation p-values separate.

Add targeted tests and UI/report language explaining exactly what is shown.

---

## P1 - Test discovery / orphan tests

Re-verify that **every `*.test.ts`, `*.test.tsx`, contract test, integration test, and research test** in the repository is actually executed by normal CI.

Do not maintain fragile manual file lists if avoidable.

Required target state:

- automatic or centrally derived test discovery,
- no orphan tests,
- CI check that fails if a test file exists but is excluded unintentionally,
- explicit intentional exclusions must be documented and machine-verifiable.

Known previously orphaned examples to re-check:

- `app/ui-explorer-scorecard.contract.test.ts`
- `lib/data/explorer.test.ts`
- `lib/research/prospective-summary.test.ts`

---

## P1 - Bao-18 artifact self-verification

The Bao-18 report must not claim anti-leak tests passed merely because another command is expected to have run elsewhere.

Required target state:

- artifact generation is gated by the required research tests, OR
- generated artifact embeds/verifies a test-run evidence manifest,
- generation fails closed if mandatory scientific checks did not pass,
- artifact records exact scientific spec + evidence links/hashes.

---

## P1 - Prospective ledger integrity

The current prospective implementation has good application-level anti-peeking logic but limited tamper evidence.

Improve without inventing unnecessary infrastructure.

Target capabilities:

- immutable entry identity,
- append-only semantics,
- hash chaining or equivalent tamper-evident structure,
- detection of removed/reordered/modified records,
- protocol hash pinning,
- dataset hash-at-freeze pinning,
- deterministic verification command,
- CI verification,
- migration path for legacy entries,
- UI provenance/status visualization.

If cryptographic signing or trusted timestamps are feasible in the current environment without introducing secret-management hazards, design them. If not, implement the strongest deterministic hash-chain design that is practical and clearly document the remaining trust boundary.

---

## P1/P2 - Bao-18 Reverse Proof UI exposure

The Bao-18 walk-forward/reverse-proof engine is valuable but underexposed.

Create a **read-only scientific explainer panel** in the UI. It must clearly distinguish:

### Protocol A - Reverse Peek / Oracle
- demonstrates circular leakage,
- expected to achieve 100% pool hit6,
- clearly labeled `INVALID_AS_EVIDENCE_OF_EDGE`.

### Protocol B - Valid Walk-Forward
Show, at minimum:

- RANDOM18,
- HOT18,
- COLD18,
- OVERDUE18,
- BALANCED18,
- evaluated draw count,
- hit6 count/rate,
- theoretical fair expectation,
- p-value,
- Holm-adjusted p-value where applicable,
- mean intersection K,
- ≥4 and ≥5 rates,
- time stability summary,
- scientific verdict,
- power/low-event warning,
- evidence classification.

The primary message must be:

> **Reverse-peek can look perfect because it leaks the answer. Valid walk-forward currently shows no demonstrated predictive edge.**

Do not turn this into a “pick these 18 numbers and buy” product flow.

---

## P2 - Scientific verdict layer

Add a highly visible, beginner-readable summary at or near the top of the Research UI:

- `Predictive edge: NOT DEMONSTRATED`
- `Per-ticket Jackpot probability: unchanged`
- `Portfolio coverage value: demonstrated combinatorially`
- `Prospective evidence: PENDING / SCORED count`
- `Current recommendation: no prediction strategy promoted`

Users should understand the scientific conclusion before encountering HAC, Holm, alpha spending, protocol hashes, etc.

---

## P2 - Capability exposure completeness

Inventory every meaningful module and classify it:

- END_TO_END
- ACTIVE_READ_ONLY
- OPERATOR_GATED
- ENGINE_ONLY
- CLI_ONLY
- STUB
- DEAD/UNUSED

Then ensure every non-dead meaningful capability has a corresponding UI representation appropriate to its risk and purpose.

Specifically re-check:

- Portfolio Monte Carlo,
- Ablation,
- Ranking Score scaffold,
- Prospective freeze/append workflow,
- Protocol lock,
- Experiment registry,
- Bao-N cost frontier,
- Data Explorer,
- Controls A-F,
- Data provenance,
- Bao-18 reverse-proof,
- Profit Lab,
- Ticket simulator.

For `Ranking Score`, do not promote it as predictive AI. If it remains a stub, expose its **status** in an Advanced Research/Capability panel rather than exposing misleading predictions.

---

## P2 - Browser-level testing and accessibility

Static regex/source contract tests are not sufficient for browser confidence.

Add browser-level tests where appropriate and use MCP browser manually/semiautomatically for acceptance.

Validate:

- rendering,
- interactivity,
- tab navigation,
- focus order,
- keyboard interaction,
- loading/error/empty states,
- accessible names,
- responsive behavior,
- no console errors,
- no uncaught promise rejections,
- no hydration issues,
- no broken network requests in normal flow,
- no invisible/overflowing critical content.

---

## P2 - Research power and interpretation

The Bao-18 rare-event endpoint is low-power because the fair hit6 rate is tiny.

Do not change the endpoint to manufacture significance.

Instead:

- add an explicit power/sensitivity section,
- distinguish `NO_EVIDENCE_OF_EDGE` from `EVIDENCE_OF_NO_EDGE`,
- if useful, add secondary pre-declared endpoints such as mean K or ≥4/≥5 only with proper multiplicity handling,
- never post-hoc promote whichever metric happens to look best.

UI and reports must communicate low event count clearly.

---

# 3. Multi-Agent Execution Model

Create at least **4 sub-agents** and keep responsibilities separated enough to reduce confirmation bias.

## Sub-Agent A - Provenance & Research Integrity Auditor

Responsibilities:

- protocol identity,
- experiment registry,
- artifact immutability,
- prospective ledger,
- hashing,
- reproducibility,
- scientific chain-of-custody,
- migration/supersession plan,
- CI invariants.

This agent must attempt to break provenance guarantees.

---

## Sub-Agent B - Statistical & Algorithmic Auditor

Responsibilities:

- Bao-18 combinatorics,
- walk-forward correctness,
- leakage analysis,
- null models,
- p-values,
- Holm correction,
- alpha spending,
- confidence intervals,
- power analysis,
- time stability,
- random baseline design,
- Portfolio/Bao mathematics.

This agent must challenge every “edge” claim and every probabilistic label.

---

## Sub-Agent C - UI/Product Integration Engineer

Responsibilities:

- capability inventory,
- source → UI mapping,
- implementing missing UI surfaces,
- safe operator gating,
- beginner-readable scientific verdict,
- responsive layout,
- accessibility,
- information hierarchy,
- avoiding misleading gambling UX.

This agent must ensure all meaningful capabilities are visible in the web UI.

---

## Sub-Agent D - Test / Browser MCP / Red-Team QA

Responsibilities:

- test discovery,
- integration tests,
- E2E/browser tests,
- browser MCP execution,
- console/network inspection,
- keyboard/a11y verification,
- regression sweeps,
- failure injection,
- acceptance scorecard.

This agent must not trust implementation claims from other agents without reproducing them.

---

# 4. Mandatory Workflow

## Phase 0 - Establish Baseline

Before editing:

1. record current branch and HEAD,
2. inspect git status,
3. inspect repository tree,
4. inspect package scripts,
5. inspect CI workflows,
6. enumerate all tests,
7. enumerate all meaningful source capabilities,
8. enumerate UI routes/components/tabs,
9. run current typecheck/lint/test/data/build,
10. run the app and inspect it with browser MCP,
11. record current console/network errors,
12. record current capability exposure matrix.

Create a baseline report under `reports/`.

Do not rely on prior reports for baseline truth.

---

## Phase 1 - Ideation

Each sub-agent independently proposes fixes for its domain.

For every proposed change, record:

- problem,
- root cause,
- evidence,
- proposed solution,
- alternatives rejected,
- risks,
- migration impact,
- tests required,
- UI impact,
- scientific interpretation impact.

No code yet for non-trivial architectural changes.

---

## Phase 2 - Verify Ideas Before Coding

Cross-review proposals between agents.

Required challenges:

- Could this fix silently rewrite research history?
- Could this expose future information to a retrospective strategy?
- Could this UI imply predictive power that is not demonstrated?
- Could this change make old artifacts unverifiable?
- Could this increase coupling unnecessarily?
- Could this create a security/anti-peeking bypass?
- Is exact math available instead of simulation?
- Are the statistical labels technically correct?
- Is the proposed score genuinely measurable?

Select the strongest solution and document why.

---

## Phase 3 - Implement in Small Verified Slices

Implement one coherent slice at a time.

Recommended order:

1. provenance identity model,
2. registry/artifact migration + CI invariants,
3. prospective hash-chain integrity,
4. statistical terminology/CI correction,
5. automatic test discovery,
6. Bao-18 artifact evidence gate,
7. scientific verdict UI,
8. Bao-18 read-only UI,
9. capability status/exposure UI,
10. browser/a11y integration tests,
11. observability and final cleanup.

After every slice:

- typecheck,
- targeted tests,
- related integration tests,
- inspect diff,
- verify no research semantics drift.

Do not accumulate a huge untested patch.

---

# 5. Provenance Architecture Requirements

Design a coherent provenance model rather than patching individual hashes.

A recommended conceptual structure:

```text
ProtocolDefinition
  ├─ protocolVersion
  ├─ protocolHash
  └─ immutable research policy

ExperimentSpec
  ├─ experimentId
  ├─ scientificSpecHash
  ├─ protocolHash
  ├─ datasetHash
  ├─ rule/strategy identity
  ├─ statistical plan
  └─ preregistered endpoints

ExperimentRegistryEntry
  ├─ experimentId
  ├─ scientificSpecHash
  ├─ protocolHash
  ├─ registeredAt
  └─ immutable/supersession metadata

ExperimentArtifact
  ├─ experimentId
  ├─ scientificSpecHash
  ├─ protocolHash
  ├─ datasetHash
  ├─ results
  ├─ evidenceManifest
  └─ buildProvenance

ProspectiveLedgerEntry
  ├─ immutableEntryId
  ├─ previousEntryHash
  ├─ entryHash
  ├─ protocolHash
  ├─ datasetHashAtFreeze
  ├─ targetDrawId
  ├─ frozenPrediction
  └─ optional scored result later via append-only linked event
```

You may improve this structure if you can prove the alternative is stronger.

### Hard invariants

CI must fail if:

- registry protocolHash != artifact protocolHash,
- scientificSpecHash mismatch,
- artifact exists with conflicting content under same identity,
- protocol content changes without new hash/version identity,
- prospective chain hash breaks,
- result appears for an unfrozen prediction,
- a frozen prediction targets a known historical draw,
- a scored event mutates a prior entry rather than appending valid evidence,
- artifact claims passed tests without valid evidence manifest.

---

# 6. UI Architecture Requirements

The UI must expose the full system without turning the research lab into a gambling recommendation app.

## Required top-level information hierarchy

### A. Executive Scientific Verdict

Visible before advanced statistics.

Show:

- predictive edge status,
- portfolio coverage status,
- prospective evidence count/status,
- per-ticket probability statement,
- strategy promotion status.

### B. Research

- Data status/provenance
- Descriptive analytics
- Walk-forward strategy testing
- Temporal holdout
- Statistical controls
- Experiment/protocol scorecard
- Bao-18 Reverse Proof
- Prospective evidence timeline
- Data Explorer
- Profit/EV caveats

### C. Portfolio

- projective portfolio,
- exact P≥4/P≥5/Jackpot,
- pair coverage,
- cost frontier,
- Portfolio MC diagnostics if retained,
- explicit statement that EV per ticket is unchanged.

### D. Advanced / Capability Inspector

For features not suitable as main user controls:

- protocol locking,
- registry state,
- prospective freeze/append operational status,
- ablation capability,
- ranking-score scaffold status,
- artifact verification status,
- operator-gated actions if safe.

### E. Ticket Simulator

Keep clearly labeled simulation-only.

---

# 7. Browser MCP Acceptance Protocol - Mandatory

You MUST test with browser MCP after implementation.

Do not declare 100/100 without browser evidence.

## Required viewports

At minimum:

- Desktop: `1440 × 900`
- Tablet: approximately `768 × 1024`
- Mobile: approximately `390 × 844`

## Required browser journeys

### Journey 1 - Research overview

1. Load homepage.
2. Confirm no console errors.
3. Confirm Executive Scientific Verdict is visible.
4. Confirm data status shows current dataset/protocol provenance.
5. Navigate all research sections.
6. Confirm Bao-18 Reverse Proof is visible.
7. Confirm Protocol A is labeled invalid evidence.
8. Confirm Protocol B shows `NO_EDGE` / equivalent.
9. Confirm low-power caveat is visible.
10. Confirm prospective status is honest (`PENDING` if no real score exists).

### Journey 2 - Portfolio

1. Open Portfolio tab.
2. Change ticket count.
3. Generate/refresh portfolio.
4. Verify pairwise coverage math surface.
5. Verify exact odds update.
6. Verify cost frontier renders.
7. Verify disclaimer that per-ticket probability/EV does not improve.
8. Verify copy behavior and error state if clipboard denied.

### Journey 3 - Ticket Simulator

1. Generate simulated ticket.
2. Validate numbers 1-45 and uniqueness.
3. Verify reset/regenerate flows.
4. Confirm simulation language.

### Journey 4 - Data / Explorer

1. Use Data Explorer filters.
2. Validate empty and non-empty states.
3. Verify accessible labels.
4. Trigger a safe update/check flow where possible.
5. Verify failure state if network/upstream is unavailable.

### Journey 5 - Advanced/Capability Inspector

1. Confirm every meaningful capability has a visible status.
2. Confirm operator-only actions are not unprotected public mutations.
3. Confirm provenance verification result is visible.
4. Confirm ranking-score is explicitly non-promoted/stub if still not scientifically valid.

### Journey 6 - Keyboard and accessibility

- tab through all interactive controls,
- ensure visible focus,
- activate controls by keyboard,
- inspect tab roles/state,
- inspect accessible names,
- ensure scrollable tables are reachable,
- verify no keyboard trap,
- verify headings are logical,
- verify live regions do not spam.

### Journey 7 - Responsive

At all required viewports:

- no clipped critical text,
- no inaccessible horizontal overflow,
- no unusable table without scroll affordance,
- no overlapping controls,
- no hidden verdicts,
- no touch targets that are impractically small.

Capture browser evidence in the final report.

---

# 8. Testing Requirements

Minimum test layers:

## Unit

- exact combinatorics,
- hashing,
- registry invariants,
- protocol identity,
- sign-flip/permutation semantics,
- confidence interval semantics,
- prospective hash chain,
- deterministic serialization.

## Property / invariant tests

Examples:

- same scientific inputs → same scientificSpecHash,
- git commit change alone → same scientificSpecHash,
- any scientific input change → new scientificSpecHash,
- edit any ledger entry → verification fails,
- remove ledger entry → verification fails,
- reorder ledger entry → verification fails,
- future target mutation → historical pool unchanged,
- future suffix mutation → historical pool unchanged,
- artifact collision → hard fail,
- registry/artifact protocol mismatch → hard fail.

## Integration

- experiment registration → artifact generation → verification,
- protocol lock → prospective freeze → later score append → verification,
- public summary export → UI parse/render.

## UI contract tests

- verdict labels,
- no predictive claims,
- Bao-18 panel presence,
- prospective evidence status,
- capability exposure status.

## Browser/E2E

Use the best available browser test framework plus MCP validation.

## CI

CI must execute the complete suite and production build.

---

# 9. Regression / Red-Team Checklist

Before closure, each sub-agent must attempt to falsify the final implementation.

At minimum answer and demonstrate:

1. Can the same experiment ID point to two protocol hashes?
2. Can an artifact be silently overwritten?
3. Can changing Git HEAD alone change scientific identity?
4. Can an old registry entry coexist with a contradictory artifact?
5. Can a future result affect a historical pool?
6. Can a prospective prediction be frozen after result availability?
7. Can a prospective score be edited silently?
8. Can a ledger line be deleted without detection?
9. Can tests claim pass while omitted from CI?
10. Can a CLI capability disappear from the UI inventory?
11. Can the UI imply an edge where none exists?
12. Can Bao-18 look better merely because of increased budget?
13. Can a Monte Carlo estimate replace an exact result unnecessarily?
14. Can a null interval be mislabeled as a confidence interval?
15. Can a non-promoted ranking score be mistaken for probability?
16. Can a browser user trigger an unsafe anti-peeking bypass?
17. Can mobile layout hide scientific caveats?
18. Are there console/network/runtime errors?
19. Does any previous HIGH/MEDIUM finding remain open?
20. Can the final 100/100 claim be independently reproduced from commands and browser steps?

If any answer is unsatisfactory, continue the loop.

---

# 10. Scoring Model

Do not use a vague self-score.

Use this mandatory 100-point engineering scorecard:

| Dimension | Weight |
|---|---:|
| Provenance & immutability | 15 |
| Statistical correctness | 12 |
| Algorithm correctness / anti-leak | 10 |
| Test completeness / discovery | 10 |
| UI capability exposure | 10 |
| Browser runtime correctness | 10 |
| Prospective pipeline integrity | 8 |
| Data engineering integrity | 7 |
| Accessibility / responsive UX | 6 |
| Security / operator gating | 5 |
| Reproducibility / CI | 5 |
| Documentation / evidence quality | 2 |
| **Total** | **100** |

### Hard cap rules

Even if arithmetic score is high:

- any unresolved P0 provenance issue → max **79/100**,
- any silent data leakage → max **49/100**,
- any misleading predictive claim → max **69/100**,
- any meaningful engine capability absent from UI status/exposure → max **89/100**,
- any orphan test file → max **94/100**,
- browser MCP not completed → max **90/100**,
- build or test failure → cannot claim PASS,
- fabricated prospective evidence → automatic FAIL.

### Definition of 100/100

100/100 means:

- all remediable findings closed,
- all hard invariants machine-tested,
- all meaningful capabilities represented in UI,
- browser MCP journeys pass,
- all tests discovered and executed,
- CI/build pass,
- no HIGH/MEDIUM unresolved issue,
- no misleading scientific claim,
- documentation matches source/runtime,
- final result independently reproducible.

100/100 does **not** mean a prediction strategy has an edge. If the correct scientific result is `NO_DEMONSTRATED_EDGE`, preserve it.

---

# 11. Loop / Stop Conditions

After each full iteration:

1. recompute score,
2. list remaining deductions,
3. map each deduction to source/test/UI/runtime evidence,
4. open a new implementation iteration,
5. continue until score = 100/100 and all hard gates pass.

Do not stop because:

- the patch is large,
- the task is inconvenient,
- one sub-agent says it is done,
- the README says done,
- a report says 100,
- tests pass but browser fails,
- browser passes but provenance is broken,
- implementation is complete but tests are incomplete.

Stop only when:

```text
Implementation Completeness = 100/100
AND Provenance = PASS
AND Statistics = PASS
AND Anti-Leak = PASS
AND Test Discovery = PASS
AND CI = PASS
AND Production Build = PASS
AND Browser MCP = PASS
AND UI Exposure = PASS
AND No HIGH/MEDIUM Findings Remain
```

Real-world scientific evidence may remain:

```text
PENDING
```

or:

```text
NO_DEMONSTRATED_EDGE
```

and that is acceptable if truthful.

---

# 12. Git / Change Management

Work autonomously but preserve forensic traceability.

Requirements:

- never rewrite published history merely to hide a provenance problem,
- prefer explicit migration/supersession records,
- keep commits coherent and reviewable,
- do not mix unrelated refactors into scientific integrity fixes,
- include tests with every fix,
- preserve backward compatibility where scientifically safe,
- if backward compatibility would preserve corrupted semantics, fail closed and migrate explicitly.

Before finalization:

- ensure clean working tree except intentionally generated evidence,
- record final HEAD,
- record exact commands used,
- record CI result if available,
- record browser MCP acceptance evidence.

Do not deploy to production or mutate unrelated external systems unless the repository/task explicitly requires it and the environment is already authorized for that action.

---

# 13. Required Deliverables

Create/update the following artifacts in the repository:

## A. Remediation plan

`reports/<timestamp>-autonomous-remediation-plan.md`

Include:

- baseline,
- findings,
- root causes,
- agent proposals,
- selected architecture,
- rejected alternatives.

## B. Capability exposure matrix

`reports/<timestamp>-capability-ui-exposure-matrix.md`

For every capability:

- source module,
- active call path,
- UI location,
- exposure class,
- tests,
- runtime verification,
- status.

## C. Provenance integrity report

`reports/<timestamp>-research-provenance-integrity.md`

Include:

- protocol identity,
- registry identity,
- artifact identity,
- prospective chain,
- migration/supersession actions,
- invariant test results.

## D. Browser MCP acceptance report

`reports/<timestamp>-browser-mcp-acceptance.md`

Include:

- viewport,
- journey,
- expected result,
- actual result,
- console/network status,
- screenshot/evidence reference if supported,
- bug found,
- fix commit/change,
- retest result.

## E. Final scorecard

`reports/<timestamp>-verified-100-scorecard.md`

Must include:

- baseline score,
- final score,
- evidence for every score dimension,
- all hard-cap checks,
- unresolved real-world evidence items,
- exact statement of scientific status.

---

# 14. Final Response Format

When genuinely complete, return:

## 1. Final verdict

`VERIFIED 100/100` only if all gates pass.

Otherwise return the actual score and continue working; do not stop voluntarily.

## 2. What changed

Concise list grouped by:

- provenance,
- statistics,
- prospective integrity,
- tests,
- UI,
- browser QA,
- security/reliability.

## 3. Evidence

Provide:

- final HEAD,
- git status,
- typecheck result,
- lint result,
- test counts,
- data checks,
- build result,
- CI result,
- browser MCP result,
- provenance verification result.

## 4. UI exposure confirmation

State where every meaningful capability is visible.

## 5. Scientific truth statement

Explicitly state one of:

- `NO_DEMONSTRATED_EDGE`,
- `PROSPECTIVE_EVIDENCE_PENDING`,
- or a stronger conclusion only if legitimately supported.

Never infer scientific success from engineering completeness.

## 6. Remaining limitations

Only list limitations that genuinely cannot be solved in code right now, e.g. waiting for future real draws.

---

# 15. Current Scientific Baseline That Must Not Be Misrepresented

Unless current source/runtime proves otherwise:

- one Mega 6/45 ticket keeps its Jackpot probability at `1 / 8,145,060`,
- buying more unique tickets increases absolute coverage because more combinations are purchased,
- projective portfolios optimize overlap/coverage structure, not per-ticket EV,
- Bao-18 buys `C(18,6) = 18,564` tickets,
- Reverse Peek / Protocol A is a leakage demonstration, not evidence,
- valid Bao-18 walk-forward previously showed no demonstrated edge,
- existing historical strategy tests previously showed no demonstrated predictive edge,
- prospective evidence may still be pending,
- ranking-score infrastructure is not proof of an AI predictor.

Recompute from current code/data before finalizing, but never weaken scientific language merely to improve a product score.

---

# 16. Final Directive

Treat this task as a **closed-loop autonomous engineering and research-integrity mission**.

Do not merely recommend fixes.

Do not merely create TODOs.

Do not merely improve documentation.

Do not merely make CI green.

Do not merely surface a dashboard.

You must:

> **find → prove → design → implement → test → browser-verify → attack → fix → re-test → measure → repeat**

until the repository is genuinely complete against the scorecard and Definition of Done.

The highest priority is not “making the app look finished”.

The highest priority is making it **impossible for source, artifact, UI, test, and scientific claim to silently disagree**.

Only then may you declare:

# `VERIFIED 100/100`
