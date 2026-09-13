# Round 5 Gap Closure Plan & Execution Report

**Mission:** `prompts/26-09-13-17-09-master-prompt-round5-gap-closure-100.md` (delta execution order under the parent `prompts/MASTER_PROMPT_Claude_Code_Autonomous_Research_Lab_100.md`)
**Baseline HEAD:** `91acc82c77e2a6f595ed922f65bf2f3a8a58641e` (clean tree)
**Reason for this round:** Round 4's own honest scorecard (`reports/26-09-13-16-40-verified-100-scorecard.md`) computed 89/100, bound by the "meaningful capability absent from substantive UI exposure" hard cap (Ablation/Portfolio-MC were CLI-status-text only) plus an incomplete Browser MCP pass (keyboard journey not exercised).

## Baseline Delta Memo (Phase 0)

Re-ran the baseline commands before touching anything:

| Command | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm run test:discovery` | 44 files, 0 orphans/phantoms |
| `npm test` | 283 business + 143 data, all pass |
| `npm run research:verify-provenance` | PASS, 3 documented historical exceptions |
| `npm run build` | succeeds |

Claims from the Round 4 reports re-verified as genuinely `VERIFIED_*` (not just asserted): the provenance chain, hash-chained prospective ledger, Bao-18 anti-leak tests, and test-discovery guard were all real and still passing. What still blocked 100, confirmed by direct inspection rather than trusted from the report: `components/capability-inspector.tsx`'s Ablation/Portfolio-MC rows contained only status text, no real numbers anywhere in the DOM; Browser MCP Journey 6 (keyboard) had not been exercised at all in Round 4's own acceptance report.

## Method

4 workstreams per the parent model, executed as 3 parallel background sub-agents (A, B, C) plus the lead session performing the 4th role (Test discovery + Browser MCP + red-team + scorecard) directly — the same division used successfully in Round 4, since GAP-06/GAP-07 explicitly require evidence independent of whoever implemented the corresponding feature.

- **Sub-Agent A** — GAP-02 (experiment identity binds `protocolHash`)
- **Sub-Agent B** — GAP-01 (Ablation + Portfolio-MC substantive UI exposure) — the single highest-priority item, since it's what the hard cap was bound on
- **Sub-Agent C** — GAP-03, GAP-04, GAP-05 (Bao-18 completeness, prospective chain UI, Capability Inspector discoverability)
- **Lead session** — GAP-06 (full 8-journey Browser MCP pass including keyboard), GAP-07 (independent re-attack of the Bao-18 evidence gate), GAP-08 (docs alignment), final scorecard

## GAP-by-GAP outcome

### GAP-01 — Ablation + Portfolio-MC substantive UI (CLOSED)
New `scripts/export-ablation-summary.ts` and `scripts/export-portfolio-mc-summary.ts` call the real engines (`runAblation`, `runPortfolioSameBudgetMonteCarlo`) directly against real data (one-stage design — neither engine had a prior artifact-writing convention to preserve) and write `public/data/ablation-summary.json`/`portfolio-mc-summary.json`. New `components/diagnostics-panel.tsx` renders both with real numbers, seed/n/method notes, and explicit "diagnostic, not predictive edge" framing, wired into the Research tab. `capability-inspector.tsx`'s Ablation/Portfolio-MC rows were updated from `OPERATOR_GATED` to `READ_ONLY`, pointing at the new panel instead of "CLI-only" text.

**Honesty finding, not silently smoothed over:** the master prompt assumed Portfolio-MC produces a "Q statistic, p-value." The actual engine (`lib/research/portfolio-mc.ts`) only computes mean-best-match and hit≥4/hit≥5 rates — no hypothesis test exists there. Rather than fabricate a statistic to match the prompt's assumption, the export publishes exactly what the engine computes, with a test (`honesty invariant: ... never fabricates a p-value/Q-statistic`) locking this in.

**Independently re-verified by the lead:** real numbers confirmed in the browser at 1440×900 and 390×844 (Journey 5), zero console errors, `ranking-score` never imported (grep-confirmed), no banned overclaim phrases.

### GAP-02 — Experiment identity binds protocol hash (CLOSED)
New id formula for NEW registrations: `${familyId}-${strategy}-${datasetHash.slice(0,8)}-${protocolHash.slice(0,8)}` (`lib/research/experiments.ts`: `buildExperimentId`). `familyId` itself is deliberately left unchanged — it governs Holm-correction family membership (a statistical grouping concept), not registry-key identity, and folding the hash into it would have silently altered historical family-size semantics. A fail-closed guard (`findExperimentIdProtocolHashConflict`) hard-refuses registration if a computed id ever collides with an existing entry under a different `protocolHash`.

**A real near-miss caught by the sub-agent itself, not by the orchestrator:** the first implementation had no backward-compatibility path, and a live-run gate check caught that it would have double-registered the 3 real existing strategies under new ids (since today's live protocol hash differs from what they were originally registered under — the same historical drift documented in Round 4). The sub-agent reverted the accidental writes, added `buildLegacyExperimentId` + an explicit skip-check for pre-GAP-02 entries, and added a regression test against the real committed registry lines.

**Independently re-verified by the lead:** live-ran `npm run research:experiment` after all 3 agents' work landed — MD5-confirmed byte-identical artifact files and registry before/after (no accidental double-registration).

### GAP-03 — Bao-18 UI completeness (CLOSED)
`bao18-summary.ts`/`export-bao18-summary.ts` extended with per-rule `early`/`late` stability slices and top-level `scientificSpecHash`/`buildProvenance`. `components/bao18-panel.tsx` now renders an EARLY/LATE stability table, an unmissable theoretical-null callout, a strengthened power/low-event warning, and the spec hash for reproducibility. The mandated primary takeaway sentence and `INVALID_AS_EVIDENCE_OF_EDGE` label are unchanged.

### GAP-04 — Prospective chain status in UI (CLOSED)
`prospective-summary.ts`/`export-prospective-summary.ts` now derive real chain health via `parseProspectiveLedger`/`verifyProspectiveChain` (not a re-implementation) and the export **fails closed** if chain verification itself fails. `components/experiment-scorecard.tsx` renders the real result: **0 chained, 4 LEGACY_UNCHAINED, verified: true** — matching `npm run research:verify-provenance`'s own output exactly. No SCORED event was fabricated.

### GAP-05 — Advanced/Capability discoverability (CLOSED, Option A)
Chose the minimal change: a stable `id="capability-inspector"` plus a visible, keyboard-reachable anchor link from `scientific-verdict.tsx` ("Xem đầy đủ năng lực hệ thống... ↓"), rather than promoting it to a full top-level tab. Justified because the Inspector's `<details>/<summary>` was already natively keyboard-accessible; a new tab would have duplicated the Research context. Independently re-verified by the lead via real keyboard navigation (see Browser MCP report).

### GAP-06 — Browser MCP keyboard/full-journey evidence (CLOSED)
Performed directly by the lead, not delegated. Full 8-journey pass with real interaction (typed a real draw id, ran the Ticket Simulator end-to-end, tabbed through skip-link → tablist → panel → window-switch buttons → anchor link with visible focus and correct `aria-pressed` activation via Enter, checked console at every step). See `reports/26-09-13-17-32-browser-mcp-acceptance.md` for the full journey table.

### GAP-07 — Bao-18 evidence gate re-attack (CLOSED)
Performed directly by the lead: deliberately flipped one assertion in `bao18-walkforward.test.ts` (Protocol A's 100%-hit6 check, inverted to expect `false`), ran the real `npm run research:bao18-audit` CLI, confirmed it printed `STOP (§35 fail-closed): anti-leak test suite KHÔNG pass (exit code 1) — từ chối ghi artifact` and wrote **zero** new artifact files. Restored the test file, re-ran it in isolation (35/35 pass), confirmed clean.

### GAP-08 — Docs alignment (CLOSED)
This report, plus updated `reports/26-09-13-17-32-capability-ui-exposure-matrix.md`, `reports/26-09-13-17-32-browser-mcp-acceptance.md`, and `reports/26-09-13-17-32-verified-100-scorecard.md` supersede their Round 4 equivalents as current truth. The Round 4 reports are left in place (historical record), not deleted or silently edited.

## Rejected alternatives

- **Folding `protocolHash` into `familyId`** (GAP-02) — rejected; would have silently changed Holm-correction family-size semantics for a reason unrelated to the actual problem (registry/artifact key collision).
- **Fabricating a Portfolio-MC p-value/Q-statistic to match the master prompt's literal wording** (GAP-01) — rejected; the engine doesn't compute one, and inventing one would itself be exactly the kind of "manufactured significance" the parent prompt's non-negotiable principles forbid.
- **Promoting Capability Inspector to a full top-level tab** (GAP-05) — rejected as non-minimal; an anchor link + stable id achieves the same discoverability with far less structural change and no duplication of the Research context.
