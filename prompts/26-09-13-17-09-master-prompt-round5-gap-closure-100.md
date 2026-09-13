# MASTER PROMPT — Round 5 Gap Closure to Independently Verified 100/100

## 0. Mission

You are **Claude Code** acting as autonomous lead engineer, research-integrity closer, and browser QA coordinator for:

`D:\2026\260909-AI-Research Lab`
GitHub: `https://github.com/howtodonextcom-art/260909-AI-Research-Lab`

### Parent law (do not weaken)
All non-negotiable principles, evidence hierarchy, hard-cap rules, scoring model, scientific honesty rules, and Definition of Done from:

`prompts/MASTER_PROMPT_Claude_Code_Autonomous_Research_Lab_100.md`

remain **binding**. This Round 5 prompt is a **delta execution order** to close remaining gaps only. If anything here conflicts with the parent, **parent wins**.

### Why this round exists
An independent verification (source + `npm test` + provenance + browser MCP) concluded:

- **Composite engineering score ≈ 89/100**
- Verdict: `SUBSTANTIAL_PROGRESS_NOT_100`
- Binding hard cap: **meaningful engine capability absent from substantive UI exposure → max 89**
- Scientific status correctly remains: `NO_DEMONSTRATED_EDGE` + prospective `PENDING`

Your job is to close remediable gaps until an **honest, evidence-backed** engineering score of **100/100** is achievable under the parent scorecard and hard-cap rules.

Do **not** stop at “tests pass”, “UI renders”, or a self-authored 100 report.
Stop only when Definition of Done below is satisfied with reproducible evidence.

---

## 1. Non-goals (explicit)

1. Do **not** fabricate, backfill, simulate, or relabel prospective evidence for draw `#01562` or any future draw.
2. Do **not** change Bao-18 primary endpoint merely to manufacture significance.
3. Do **not** promote Ranking Score as prediction / probability / AI edge.
4. Do **not** turn Bao-18 into a “buy these 18 numbers” commerce flow.
5. Do **not** silently rewrite historical registry/artifact bytes to hide past mismatches; keep exception/migration honesty if still needed.
6. Do **not** claim scientific edge. Preserving `NO_DEMONSTRATED_EDGE` / `PENDING` is required when true.
7. Do **not** reopen unrelated refactors. Touch only what closes scored gaps.

---

## 2. Baseline you must re-verify first (Phase 0)

Before coding, re-establish baseline with commands and record exit codes:

```bash
npm run typecheck
npm run test:discovery
npm test
npm run research:verify-provenance
npm run build
npm run start   # if needed for browser MCP
```

Read and treat as **claims to verify**, not truth:

- `reports/26-09-13-16-40-verified-100-scorecard.md`
- `reports/26-09-13-16-40-capability-ui-exposure-matrix.md`
- `reports/26-09-13-16-40-research-provenance-integrity.md`
- Independent gap list in this prompt §3

Output a short **Baseline Delta Memo**:
what is already `VERIFIED_*` vs what still blocks 100.

Use at least **4 sub-agents** (parent model):
- A Provenance / identity
- B Ablation + Portfolio-MC export & honesty
- C UI integration (Bao-18 completeness, chain status, Advanced IA)
- D Test discovery + Browser MCP + red-team + scorecard

Mandatory loop:

> **IDEATE → VERIFY IDEA → IMPLEMENT → STATIC TEST → RUNTIME TEST → BROWSER MCP → RED-TEAM → FIX → RE-TEST → SCORE → REPEAT**

---

## 3. Remaining gaps that MUST be closed (ordered by hard-cap impact)

### GAP-01 — P1 / HARD CAP 89 — Ablation + Portfolio Monte Carlo substantive UI
**Problem:** Capability Inspector only shows CLI-status text; no real numbers → parent hard cap “meaningful capability absent from UI” binds at 89.

**Required:**
1. Add export scripts + public JSON summaries following existing patterns:
   - `scripts/export-bao18-summary.ts`
   - `scripts/export-prospective-summary.ts`
   Examples to mirror: `public/data/bao18-summary.json`, `public/data/prospective-summary.json`
2. Create:
   - `scripts/export-ablation-summary.ts` → `public/data/ablation-summary.json`
   - `scripts/export-portfolio-mc-summary.ts` → `public/data/portfolio-mc-summary.json`
3. Wire `package.json` scripts; ensure generation is reproducible from current engines:
   - `lib/research/ablation.ts` / `scripts/research-ablation.ts`
   - `lib/research/portfolio-mc.ts` / `scripts/portfolio-mc.ts`
4. Render **read-only panels** (or Inspector expanded rows with real metrics) in Research UI:
   - key numeric outputs
   - seed / n / method notes
   - explicit honesty: diagnostic / fairness / contribution — **not predictive edge**
5. Add unit/contract tests for parsers + “panel present / no rankingScore / no overclaim”.
6. Update Capability Exposure Matrix: these must leave pure `CLI_ONLY` status-only and become at least `UI_READ_ONLY` with real values (or `OPERATOR_GATED` only for mutation, not for viewing results).

**Done when:** a browser user can see real Ablation and Portfolio-MC numbers without opening a terminal, and the UI-exposure hard cap no longer applies.

---

### GAP-02 — P1 — Experiment identity must encode immutable protocol identity
**Problem:** experiment IDs encode protocol **version string** + dataset prefix, not `protocolHash`. Protocol content can change under an unbumped version.

**Required:**
1. Change ID construction so new experiments encode immutable protocol identity (`protocolHash` prefix/suffix or equivalent fail-closed binding).
2. Preserve append-only registry semantics; do **not** rewrite old IDs.
3. Migration/documentation path for existing 3 registry rows (exception file / supersession record OK).
4. Tests: same version string + different hash ⇒ different experiment identity namespace / hard fail on ambiguous reuse.
5. Ensure `run-experiment.ts` still refuses overwrite; provenance verifier remains fail-closed for new mismatches.

**Done when:** new registrations cannot collide across distinct protocol hashes under the same version label.

---

### GAP-03 — P2 — Bao-18 UI completeness vs parent § Bao-18 Reverse Proof UI
Panel exists and correctly labels Protocol A invalid / Protocol B `NO_EDGE`. Still missing vs parent requirements:

**Add to Bao-18 read-only UI (from summary JSON, extend exporter if needed):**
- time stability summary (EARLY vs LATE: n, mean K, hit6, direction stability)
- theoretical fair expectation clarity (already partly present — make unmistakable)
- power / low-event warning (`NO_EVIDENCE_OF_EDGE` vs `EVIDENCE_OF_NO_EDGE` distinction if used)
- `scientificSpecHash` (and optionally compact `buildProvenance`) for reproducibility
- keep primary message:
  > Reverse-peek can look perfect because it leaks the answer. Valid walk-forward currently shows no demonstrated predictive edge.

No purchase CTA. No Protocol A metrics used as evidence of edge.

---

### GAP-04 — P2 — Prospective ledger hash-chain status in UI
**Problem:** chain verification is CLI/CI; UI shows pending/scored counts only.

**Required:**
1. Surface read-only chain health in Experiment Scorecard and/or Capability Inspector:
   - chained event count
   - `LEGACY_UNCHAINED` count
   - verification status (`PASS` / fail reason)
   - note that real scored chained events await future draws (`PENDING`)
2. Do **not** invent scored events.
3. Prefer deriving from existing prospective summary export or extend `export-prospective-summary.ts` + `verifyProspectiveChain` outputs.

---

### GAP-05 — P2 — Information architecture: Advanced / Capability discoverability
Parent §6 asks for Advanced / Capability Inspector as a clear hierarchy locus.

**Required (choose the best minimal change, justify in ADR/report):**
- Either promote Capability Inspector to a clear top-level tab/section navigation target,
- Or keep inside Research but make it impossible to miss (stable id, in-page nav/anchor from Scientific Verdict / scorecard, visible heading, not buried).

Keyboard users must reach it. Document the chosen exposure class.

---

### GAP-06 — P2 — Browser MCP Journey 6 (keyboard / a11y) must be completed with evidence
Prior independent audit: Journeys 1–5 and responsive mostly PASS; keyboard only spot-checked.

**Required browser MCP evidence (record pass/fail):**
1. Research overview honesty + Scientific Verdict first
2. Portfolio frontier caveat
3. Ticket Simulator: Chọn nhanh → Mô phỏng kỳ quay → result without overclaim
4. Data Explorer: type a real draw id → correct row
5. Capability Inspector / Advanced discoverability + Ablation/MC numbers visible
6. **Keyboard:** Tab focus order through primary controls; skip-link works; no keyboard trap; actionable controls reachable
7. Responsive: 1440×900 and 390×844; no critical horizontal overflow; verdicts/caveats readable
8. Console: 0 errors / 0 warnings in normal flow

Add or extend automated contract/a11y tests where ROI is high; MCP remains mandatory for acceptance.

---

### GAP-07 — Verification debt — Bao-18 artifact evidence gate re-attack
Independently re-verify (do not trust prior agent report only):

1. Temporarily break one `bao18-walkforward` test (or inject failing child-process status in a controlled way),
2. Confirm `research:bao18-audit` **refuses to write** a new artifact,
3. Restore tests,
4. Document command transcript in the Round 5 report.

---

### GAP-08 — Soft / docs alignment
Update:
- capability exposure matrix
- provenance integrity note if ID scheme changes
- Round 5 verified scorecard

Docs must match source/runtime. No aspirational 100 without evidence.

---

## 4. Scoring target (parent model)

Recompute the parent 100-point scorecard after fixes.

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

### Hard caps still apply
- unresolved P0 provenance → max 79
- silent leakage → max 49
- misleading predictive claim → max 69
- meaningful engine capability without substantive UI exposure → max 89
- orphan test → max 94
- browser MCP incomplete → max 90
- build/test failure → cannot PASS
- fabricated prospective evidence → automatic FAIL

### Round 5 success definition
```text
Implementation Completeness = 100/100
AND all hard caps non-binding
AND Provenance = PASS
AND Statistics = PASS
AND Anti-Leak = PASS
AND Test Discovery = PASS
AND CI commands PASS locally (typecheck, test, data:check if applicable, verify-provenance, build)
AND Browser MCP journeys 1–7 PASS with evidence
AND UI Exposure = PASS (Ablation + Portfolio-MC show real numbers)
AND No HIGH/MEDIUM remediable findings remain
AND Scientific Evidence Status may remain PENDING / NO_DEMONSTRATED_EDGE
```

If a future reviewer could still apply the UI-exposure hard cap, you are **not** done.

---

## 5. Implementation constraints

- Prefer small verified slices; include tests with each fix.
- Keep scientific honesty copy in Vietnamese UI consistent with existing voice.
- Reuse existing components/patterns (`scientific-verdict`, `bao18-panel`, `capability-inspector`, export-summary scripts).
- Wire new tests into `package.json` discovery lists; `npm run test:discovery` must stay green.
- CI workflow (`.github/workflows/ci.yml`) must keep provenance + test discovery; extend only if new verify steps are required.
- If `dist` is locked by a running local server, stop the server or build to an unlocked state; do not treat EPERM lock as “code red” without confirming.
- Do **not** commit/push/deploy unless the human explicitly asks in a later message. Prepare clean changes and reports locally.

---

## 6. Required deliverables

1. Code + tests implementing GAP-01…GAP-07 as applicable.
2. Updated public data JSON summaries committed/generated as appropriate for UI offline-first behavior.
3. Reports (create new timestamped files under `reports/`):
   - `reports/YY-MM-DD-HH-MM-round5-gap-closure-plan.md`
   - `reports/YY-MM-DD-HH-MM-capability-ui-exposure-matrix.md` (updated)
   - `reports/YY-MM-DD-HH-MM-browser-mcp-acceptance.md` (journeys 1–7 evidence)
   - `reports/YY-MM-DD-HH-MM-verified-100-scorecard.md` (honest dimension scores + hard-cap analysis)
4. Final stdout summary with:
   - Executive verdict: `VERIFIED_100` or `NOT_100` + remaining blockers
   - Commands run + exit codes
   - Browser journey table
   - Scientific status unchanged unless evidence truly changed (it should not)

---

## 7. Red-team checklist before claiming 100

- [ ] Ablation numbers visible in UI (not only “CLI-only” sentence)
- [ ] Portfolio-MC numbers visible in UI
- [ ] No `rankingScore` in `app/` / `components/` imports
- [ ] No banned claims: chắc thắng / đánh bại xác suất / Protocol A as edge
- [ ] Experiment identity binds protocolHash for new experiments
- [ ] Provenance verify PASS (historical exceptions only if still exact-match and documented)
- [ ] Bao-18 evidence gate refuses artifact on failing tests (re-attacked)
- [ ] Prospective UI shows chain/legacy status without fake SCORED rows
- [ ] Keyboard journey evidenced
- [ ] Mobile 390px: critical content readable, no blocking overflow
- [ ] `test:discovery` = 0 orphans / 0 phantoms
- [ ] Scorecard does not mark scientific PENDING as engineering failure
- [ ] Scorecard does not claim 100 if any hard cap still binds

---

## 8. Stop condition

Continue iterating until:

`VERIFIED_100` under parent hard caps,

or you can prove a remaining item is `BLOCKED_BY_REAL_WORLD_EVIDENCE` (e.g., first real prospective score after `#01562`) and **all remediable engineering gaps are closed**.

If you cannot reach 100, return `NOT_100` with a precise residual score and the single highest-impact remaining blocker — never inflate.
