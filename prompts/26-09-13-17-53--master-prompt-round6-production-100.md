# MASTER PROMPT — Round 6 Production Closure to Independently Verified Engineering 100/100

## 0. Role & authority

You are **Claude Code** with maximum practical repo autonomy: lead architect, research-integrity closer, product editor, UI systems engineer, and browser QA lead for:

`D:\2026\260909-AI-Research Lab`
GitHub: `https://github.com/howtodonextcom-art/260909-AI-Research-Lab`

Operate with highest practical permissions inside the repo. Make justified decisions; do not ask humans for routine engineering choices. Document decisions in timestamped reports.

### Parent law (binding; never weaken)
- `prompts/MASTER_PROMPT_Claude_Code_Autonomous_Research_Lab_100.md`
- Round 5 residual reality from independent audit (~96–97/100, hard caps mostly cleared)
- Evidence hierarchy: **source → tests → runtime → browser MCP → artifacts → reports**

Reports claiming 100 are claims, not proof.

### Mission
Upgrade this Research Lab to **production-grade engineering quality**, close **all remediable GAPs**, remove **redundant surface area**, and refresh **UI/UX** so the product is coherent, honest, and operable — then earn an independently defensible **Engineering 100/100** on the parent scorecard.

**Absolute 100 applies to remediable engineering dimensions only.**
Scientific Evidence Status may remain:
`NO_DEMONSTRATED_EDGE` and/or `PROSPECTIVE_EVIDENCE_PENDING`
without blocking engineering 100. Fabricating prospective scores = automatic FAIL.

---

## 1. Mandatory execution loop (no shortcuts)

For every material change:

> **IDEATE → VERIFY IDEA → A/B SELECT → CODE → STATIC TEST → RUNTIME TEST → BROWSER MCP → RED-TEAM → FIX → RE-TEST → SCORE → REPEAT**

Rules:
1. Do not code a major UI/IA change without a written idea + verification note.
2. For contested product/UI choices, run a lightweight **A/B** (two concrete variants), score against explicit criteria, pick the winner, discard the loser.
3. Browser MCP is mandatory for acceptance — **no guessing**.
4. “Done” only when Definition of Done passes with evidence.
5. Prefer under-claiming. Never inflate to 100.

Use ≥4 sub-agents by default:
- A Provenance / CI / GAP-07 automation
- B Prune + module boundary / dead-code removal
- C UI production redesign (winner of A/B)
- D Browser MCP + a11y/E2E + independent scorecard

---

## 2. Baseline (Phase 0) — re-verify before changing anything

Run and record exit codes:

```bash
npm run typecheck
npm run test:discovery
npm test
npm run research:verify-provenance
npm run build
npm run start   # local browser target
```

Read as claims only:
- `reports/26-09-13-17-32-verified-100-scorecard.md`
- `reports/26-09-13-17-32-capability-ui-exposure-matrix.md`
- `reports/26-09-13-17-32-browser-mcp-acceptance.md`
- Independent residual gaps: GAP-07 evidence-gate not CI-automated; keyboard/browser not in CI; Advanced is anchor-not-tab; historical provenance exceptions remain documented.

Produce `Baseline Delta Memo` in the Round 6 plan report.

---

## 3. What “Engineering 100/100” means this round

Recompute parent 100-point scorecard. **All hard caps must be non-binding.** All remediable HIGH/MEDIUM findings closed.

### Residual blockers that MUST be closed
1. **GAP-07 automation:** Bao-18 evidence gate fail-closed behavior covered by a permanent automated regression (safe harness; do not rely on manual break-restore transcript alone).
2. **Browser/a11y CI floor:** add minimal automated browser or contract+documented MCP suite such that Journey 6 (keyboard) cannot silently regress without CI noticing — prefer Playwright (or existing MCP-compatible approach) wired into `npm test` / CI if feasible without destabilizing the stack; if full Playwright CI is too heavy, ship the strongest permanent automated substitute plus mandatory MCP evidence pack.
3. **UI production coherence:** Research tab is currently dense; redesign information hierarchy for production readability without losing scientific honesty panels.
4. **Prune redundancy:** remove or demote surfaces that do not serve the production Research Lab mission (see §4).
5. **Docs/matrix sync:** capability matrix + scorecard must match source/runtime after changes.

### Non-goals
- Do not fabricate prospective evidence for `#01562`.
- Do not change Bao-18 primary endpoint to manufacture significance.
- Do not promote Ranking Score as prediction.
- Do not expose prospective freeze/append or provenance verify as public mutable UI.
- Do not turn the product into a “bao chắc thắng” / tip-selling app.
- Do not claim scientific edge.

---

## 4. Prune policy (fail-closed)

Inventory every UI surface and engine module. Classify:
`KEEP_CORE` | `KEEP_READONLY` | `KEEP_OPERATOR_GATED` | `DEMOTE` | `DELETE`

### Default prune decisions (execute unless A/B disproves)
- **DELETE or fully remove from UX:** Ranking Score scaffold promotion paths; any dead imports; duplicate misleading copy; unused stubs that confuse production users. If code must remain for contract history, keep engine file but ensure zero UX affordance beyond a one-line “not promoted” note inside Advanced — prefer deletion of UX mentions if A/B shows cleaner without it.
- **KEEP_OPERATOR_GATED:** prospective freeze/append, provenance verifier CLI.
- **KEEP_CORE:** Scientific Verdict, Data Status, walk-forward/holdout honesty, Experiment Scorecard (+ chain health), Bao-18 panel, Diagnostics (Ablation + Portfolio-MC numbers), Data Explorer, Portfolio cost frontier, Ticket simulator (simulation honesty aid), Profit lab if it remains non-predictive educational; otherwise demote after A/B.
- **DEMOTE:** any secondary decorative stats that compete with Scientific Verdict in the first viewport.

A/B criterion for prune:
- Clarity of “no demonstrated edge”
- Time-to-find Bao-18 + Diagnostics + chain health
- Absence of predictive overclaim
- Fewer competing CTAs

Winner = fewer distractions without losing required scientific panels.

---

## 5. UI/UX production upgrade (A/B required)

### Problem
First Research viewport is overloaded; Advanced/Diagnostics/Bao-18 are easy to miss; production users need a clear story.

### Ideate ≥2 variants, then A/B
**Variant A — “Verdict-first Production IA” (default favorite):**
- Keep 3 tabs: Research / Portfolio / Ticket
- Research order: Scientific Verdict → sticky in-page nav (Data, Evidence, Bao-18, Diagnostics, Advanced, Explorer) → progressive disclosure for dense tables
- Capability Inspector remains anchored Advanced section (not fourth tab) but visually first-class

**Variant B — “Four-tab Lab”:**
- Add top-level Advanced tab hosting Capability Inspector + Diagnostics + provenance status
- Research becomes stricter: Verdict + core evidence only

### A/B selection scorecard (0–5 each)
1. Scientific honesty immediately visible
2. All required panels reachable ≤2 clicks / 1 anchor
3. Mobile 390px: no critical overflow; verdicts readable
4. Keyboard: skip-link + focus order through primary nav
5. Implementation risk / regression surface

Pick the higher total. Implement only the winner. Document loser rejection.

### Visual/system rules
- Preserve existing brand/fonts where coherent; production polish (spacing, hierarchy, section rhythm), not a random new aesthetic cluster.
- No prediction marketing chrome.
- Banned UX: chắc thắng, đánh bại xác suất, rankingScore as probability, Protocol A as edge.

---

## 6. Engineering closure checklist (must all PASS)

### Provenance / identity
- New experiment IDs bind `protocolHash` (already present — regression-protect).
- Historical exceptions remain exact-match only; no silent rewrites.
- `npm run research:verify-provenance` PASS.

### Bao-18 evidence gate (GAP-07)
- Automated test proves: when research tests fail, audit refuses artifact write.
- Prefer dependency-injected runner / temp workspace over mutating committed tests in CI.

### Prospective
- UI continues to show chained vs LEGACY_UNCHAINED vs verified honestly.
- No fake SCORED rows.

### Diagnostics
- Ablation + Portfolio-MC real numbers remain visible post-UI redesign.

### Test discovery
- `npm run test:discovery` = 0 orphans / 0 phantoms after file adds/deletes.

### CI
- `.github/workflows/ci.yml` runs typecheck → discovery → tests → data:check → provenance → build (extend if new gates added).

---

## 7. Browser MCP acceptance (mandatory; no guessing)

After implementation, start local app and execute with browser MCP. Record pass/fail + evidence strings:

1. Research: default tab; Scientific Verdict first; CHƯA CHỨNG MINH / no recommend
2. In-page/Advanced reachability (winner IA)
3. Bao-18: INVALID_AS_EVIDENCE_OF_EDGE; Protocol B NO_EDGE; no purchase CTA
4. Diagnostics: real Ablation + MC numbers
5. Chain health visible and honest
6. Portfolio frontier caveat
7. Ticket: Chọn nhanh → Mô phỏng → no overclaim
8. Explorer: type real draw id → correct row
9. Keyboard: skip-link, tab order, no trap
10. Responsive: 1440×900 and 390×844
11. Console: 0 errors / 0 warnings in normal flow
12. Banned-phrase scan clean

If any fail → FIX → re-test. Do not score 100 with failing journeys.

---

## 8. Scoring & stop condition

Parent scorecard dimensions (sum 100). Hard caps unchanged.

Stop only when:

```text
Engineering score = 100/100
AND all hard caps non-binding
AND Provenance PASS
AND Anti-Leak PASS
AND Test Discovery PASS
AND CI local commands PASS
AND Browser MCP journeys PASS with evidence
AND UI Exposure PASS (no meaningful capability invisible)
AND Prune complete (no redundant promoted surfaces)
AND Scientific Evidence Status may remain PENDING / NO_DEMONSTRATED_EDGE
AND final independent-style scorecard says VERIFIED_ENGINEERING_100 (not marketing 100)
```

If blocked only by real-world draws, label `BLOCKED_BY_REAL_WORLD_EVIDENCE` and still require engineering 100 on remediable items.

If you cannot reach 100, return `NOT_100` with residual score and single highest-impact blocker — never inflate.

---

## 9. Deliverables

1. Code + tests implementing closure + UI winner + prune
2. Updated `public/data/*.json` if exporters change
3. Reports under `reports/` with timestamp `YY-MM-DD-HH-MM-...`:
   - round6-ideate-ab-decision.md
   - round6-capability-ui-exposure-matrix.md
   - round6-browser-mcp-acceptance.md
   - round6-verified-engineering-100-scorecard.md
4. Final stdout: verdict, commands/exit codes, journey table, prune list, scientific status

### Git
Do not commit/push/deploy unless the human explicitly asks later. Leave a clean, reviewable working tree.

---

## 10. Red-team before claiming VERIFIED_ENGINEERING_100

- [ ] Ablation + MC numbers still visible after UI redesign
- [ ] GAP-07 automated gate test green
- [ ] Keyboard journey evidenced + protected against silent regression
- [ ] No rankingScore UI imports
- [ ] No predictive overclaim
- [ ] Prospective PENDING not relabeled SCORED
- [ ] test:discovery clean
- [ ] Mobile + desktop MCP pass
- [ ] Capability matrix matches UI
- [ ] Scorecard does not call scientific PENDING an engineering failure
- [ ] Scorecard does not claim 100 if any hard cap binds
