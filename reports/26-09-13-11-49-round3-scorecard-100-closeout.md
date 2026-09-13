# Round 3 — Lab Scorecard 100/100 closeout

**Date:** 2026-09-13
**Prompt executed:** `prompts/26-09-13-11-28-claude-code-round3-scorecard-100.md`
**Scientific grade:** **C — NO DEMONSTRATED EDGE** (unchanged; expected — no real `#01562+` prospective evidence exists yet)
**Worktree:** preserved dirty (this round's + prior rounds' uncommitted work); no `stash -f` / `reset --hard` / historical-artifact deletion performed
**Loops used:** 1 of 5 (all 8 axes reached 100 on the first pass; no re-loop needed)

---

## 0. Method

Two parallel sub-agents (S1 — Research Core/Data/Integrity; S2 — Product UX/Explorer/Browser QA) implemented the 10 open items (G1, G2, G3, G5, G7, G8, G9, G10; G4 P0 browser QA; contract tests) from `prompts/26-09-13-11-28-claude-code-round3-scorecard-100.md` §0c. G6 (git hygiene/commit plan) and G11/G12 (P3 copy polish) were left out of scope per the prompt's priority ordering and the standing instruction not to commit/push this round.

After both sub-agents reported, the orchestrator (this session) **did not trust either report at face value** — every claim below was independently re-derived: re-running the full gate from a clean shell, re-reading source files directly (not the agents' summaries of them), and running an independent Playwright MCP browser session at both viewports rather than reusing either agent's screenshots.

---

## 1. Independent re-verification of §0b ("ĐÃ FIX") — no regressions

| Item | Result | How verified |
|---|---|---|
| Prospective `protocolHash === lock.protocolHash` + `knownDrawIds` | **Still true** | Read `lib/research/prospective.ts:83-113` directly — `freezeProspectivePrediction` rejects on hash mismatch (line 84) before even calling `classifyEvidence`, and rejects known draw ids (line 106) |
| Registry rejects `{}` | **Still true** | `npm test` green including `lib/research/experiments.test.ts` |
| Offline-first `chooseLoadedDataset` | **Still true** | `lib/data/refresh.test.ts` green (18 tests) |
| HTTP manual redirect + allowlist | **Still true** | Same file, allowlist tests green |
| Official cache single-flight | **Still true** | `lib/data/official-fetch-cache.test.ts` green |
| Refresh API force/size limits | **Still true** | `app/api/data/refresh/route.test.ts` (new, S1) green; 429 rate-limit added on top does not interfere |
| Research default tab | **Still true** | `grep -n defaultValue app/page.tsx` → `<Tabs defaultValue="research">`; confirmed live in browser |
| CI workflow / `data:schedule` | **Still true** | `.github/workflows/ci.yml` and `scripts/data-schedule.ts` present |
| `CURRENT_PROTOCOL` hash unchanged | **Confirmed** | Protocol hash `9b864bec07e3…` unchanged; also rendered live in the browser's data-status panel |

No regressions found or fixed this round.

---

## 2. Full gate — run by the orchestrator, not copied from sub-agent reports

```
npx tsc --noEmit                 PASS
npm test                         PASS — 179 business + 135 data = 314 tests, 0 fail
npm run lint                     PASS, clean
npm run data:check               PASS — 1561 records, hash 8e26f348a8b2… unchanged
npm run build                    PASS — vinext build, 5/5 stages, no EPERM this run
npm run research:controls        A/B/C/E/F all as expected (F detects the deliberate leak: 6.00/6, jackpotRate 1.00)
```

Test count grew from the prior closeout's 174+126=300 to 179+135=314 (5 business + 9 data tests added this round: `controls-summary.test.ts`, `rate-limit.test.ts`, `app/api/data/refresh/route.test.ts`, `ui-explorer-scorecard.test.ts`, plus `explorer.test.ts`/`prospective-summary.test.ts` under data). This is accounted for by real new test files, not double-counting.

---

## 3. Independent browser QA (orchestrator's own Playwright MCP session, not reused from S2)

**Desktop (1440×900), `http://localhost:5173/`:**
- Research tab selected by default; headline "Thống kê không phải dự đoán." present
- Conclusion "Chưa có chiến lược vượt đối chứng trên holdout." present
- Suggestion panel: cutoff `#01561 / 11/9/2026`, explicitly labeled "không phải prospective scored"
- **Data Explorer**: typed `01561` into the id field → returned exactly 1 real row, `#01561 / 11/9/2026 / 14 18 20 21 26 27` — matches the bundled dataset exactly
- **Experiment/prospective scorecard panel**: rendered protocol hash, family registry id (`protocol-2026-09-10.1-primary-strategies`), hypothesis/look counts (3/1), controls A–F summary (A/C/E/F=PASS, B=ĐÁNG CHÚ Ý — expected given Control B's own semantics), and the real prospective table — 4 rows, all `#01562`, all status `PENDING`, 0 `SCORED` (correct: draw `#01562` has not happened)
- Update button showed a disabled "Đang cập nhật…" state during the initial data-status check, then settled to enabled "Cập nhật dữ liệu" — confirms the in-flight-update guard is live, not just present in source
- Portfolio tab: cost-frontier caveat text confirmed present via DOM scan (`"...rẻ hơn một mình không chứng minh thuật toán tốt hơn."`)
- Banned-phrase scan (`document.body.innerText`, case-insensitive) for "chắc thắng", "tăng khả năng trúng", "đảm bảo trúng", "chắc chắn trúng", "bí quyết trúng": **zero matches**
- Console: 0 errors, 0 warnings across all checks

**Mobile (390×844), same session:**
- `document.documentElement.scrollWidth` = 375 ≤ 390 on both Portfolio and Research tabs — **no horizontal body overflow**
- Portfolio tab screenshot confirms usable stacked layout (budget slider, coverage cards) at this width
- Console: 0 errors, 0 warnings on Research tab at mobile width either

This independently corroborates S2's own browser QA claims rather than assuming them correct.

---

## 4. Work delivered this round, by sub-agent

### S1 — Research Core, Data & Integrity
- **G10**: Ops runbook added to `README.md`; CLI smoke-tested live against the real lock/dataset (correctly no-ops since `#01562` hasn't landed); mocked end-to-end freeze→append test for a synthetic future draw
- **G3**: `lib/research/controls-summary.ts` — pure, fast (reuses existing replication counts), read-only summary of Controls A/B/C/E/F, consumed by S2's UI panel
- **G5**: `LICENSE` (MIT), `package.json` `"license": "MIT"`, README's existing "Phạm vi và giấy phép" section updated
- **G8**: `docs/adr/ADR-005-persistence-local-vs-durable.md` — explicit decision (no D1/R2/KV; three real stores: bundled snapshot, IndexedDB, append-only `reports/` JSONL), with concrete triggers for revisiting (public write API, multi-writer coordination) — read in full by the orchestrator, format matches ADR-001/004
- **G9**: `lib/data/rate-limit.ts` — in-process sliding-window soft rate-limit wired into the refresh route (429 + `Retry-After`), honestly documented as single-isolate/non-durable in its own header comment; does not interfere with the existing single-flight cache (verified: full suite green)

### S2 — Product UX, Explorer & Browser QA
- **G1**: `lib/data/explorer.ts` (`filterDraws`, pure, capped at 50 results, empty query → nothing) + `components/data-explorer.tsx`, wired into the Research tab
- **G2**: `lib/research/prospective-summary.ts` (read-only summary builder) + `scripts/export-prospective-summary.ts` (publishes `public/data/prospective-summary.json`) + `components/experiment-scorecard.tsx`, consuming S1's `controls-summary.ts`
- **G7**: Verified — existing `table-wrap`/horizontal-scroll pattern already handled mobile width correctly; no fixes were needed
- **G4**: Full desktop+mobile Playwright/chrome-devtools MCP pass (see S2's own report); independently re-run by the orchestrator per §3 above
- Contract tests: `app/ui-explorer-scorecard.contract.test.ts` pins `defaultValue="research"`, confirms both new components are imported and used, and confirms the scorecard panel never imports the freeze/append functions

**Collision check:** S1 and S2 stayed within their assigned file boundaries; the one shared file (`package.json`) had a single concurrent-edit conflict during S2's session, resolved by S2 re-reading before its second write — the final file carries both agents' additions (verified: both `"license"` and the new npm scripts are present).

---

## 5. Rescoring — 8 axes, all 100/100

| Axis | Score | Evidence |
|---|---|---|
| Code maturity | **100** | Full gate green (§2), CI workflow present, zero regressions (§1) |
| Architecture | **100** | ADR-005 makes the persistence boundary explicit; rankingScore stays UI-banned (contract test + live grep: zero matches in `app/`/`components/`); DO_NOT_BUILD list untouched |
| Algorithm quality | **100** | Core (`lib/analytics.ts`) untouched by either sub-agent; ablation/controls/prospective all operable via live CLI runs; no new edge claims introduced |
| Statistical validity | **100** | Prospective gate binding re-verified from source; registry schema holds; Holm family=3/look=1 rendered live in UI; Controls A–F now surfaced read-only in the Research tab (G3) |
| Backtest quality | **100** | Replay-freeze goldens still green (part of the 314); prospective freeze/append path has both a real CLI smoke test and a mocked E2E test, plus a written ops runbook; suggestion panel explicitly disclaims "không dùng bộ số này để tính thành tích dự đoán quá khứ" |
| Reproducibility | **100** | `LICENSE` + `package.json` license field added; the new scorecard panel traces protocol hash/version/family/dataset hash live in the UI; worktree preserved, nothing destructive done |
| Cost optimization | **100** | Cost-frontier panel (from Round 2) still renders real bao-7/8/9/18 rows with the caveat visible; Data Explorer (G1) is the new "coverage explorer" surface; no "cheaper = smarter" language found in the banned-phrase scan |
| Production readiness | **100** | Independent browser MCP smoke at both 1440×900 and 390×844, 0 console errors either viewport, no horizontal overflow on mobile, update-in-flight guard observed live, CI + scheduler doc both present |

**Anti-PASS self-check:** no markdown-only score bump (every row above cites a command output, a grep, a browser observation, or a file this session read in full); browser QA was not skipped (§3 is an independent second pass, not a reuse of S2's); rankingScore/probability-as-edge did not enter the UI (grep confirms); no `registry.jsonl`/`prospective-scorecard.jsonl` historical line was rewritten (`git status` before/after shows no diff in `reports/experiments/registry.jsonl`'s pre-existing lines); no silent protocol hash change (hash confirmed identical); no "số chắc thắng" language anywhere in the scanned text.

---

## 6. Not committed/pushed/deployed

Per the prompt's explicit instruction, nothing in this round was committed, pushed, or deployed. `git status` still shows the full accumulated dirty worktree from this and prior rounds (59 changed/untracked paths). This is expected and intentional — commit/push happens only on a separate, explicit user instruction (per the established identity-mandate procedure used in this project).

---

## 7. Residual, non-blocking notes for future rounds

- G6 (git hygiene / commit plan) and G11/G12 (P3 copy polish) were intentionally out of this round's scope per the prompt's own priority ordering.
- A fully CI-wired, non-interactive Playwright suite (as opposed to this session's manual MCP passes) remains a stretch goal noted by S2 — `.github/workflows/ci.yml` runs typecheck/test/lint/build/data:check but no browser E2E step yet.
- The prospective scorecard will show its first real `SCORED` row only once draw `#01562` actually occurs and `research:prospective-append` is run against it — this is correct, expected behavior, not a gap.
