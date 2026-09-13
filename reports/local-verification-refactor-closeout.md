# Local verification & refactor closeout

**Date:** 2026-09-13  
**HEAD at start:** `058f3162c3fdfbc0883eab96e7be7ecd0b93dcbf`  
**Branch:** `main`  
**Worktree:** preserved dirty Pha B + this session’s integrity/UX fixes (not committed, not pushed)  
**AGENTS.md:** not present in repo  

---

## 1. Baseline before → after

| Check | Before (this session) | After |
|---|---|---|
| typecheck | PASS | PASS |
| test | PASS ~288 (169+119 dirty tree) | PASS **174 business + 126 data** (new tests added) |
| lint | PASS | PASS |
| build | PASS (~23s, log `reports/build-verify-2026-09-13.log`) | PASS |
| data:check | PASS 1561 / `8e26f348…` | PASS |
| CI | missing | **added** `.github/workflows/ci.yml` |
| Browser E2E | not run | **PARTIAL** local wrangler `127.0.0.1:8787` — research default tab, no-edge conclusion, suggestion cutoff visible |

Test-count drift vs Audit A (260): explained by uncommitted Pha B modules + new integrity tests — not “quality inflation.”

---

## 2. Findings verified

| ID | Topic | Status | Evidence |
|---|---|---|---|
| V-01 | Prospective `protocolHash` unbound to lock | **CONFIRMED** → fixed | Was caller-trusted; now `freezeProspectivePrediction` requires `protocolHash === lock.protocolHash` + optional `knownDrawIds` |
| V-02 | Registry accepts `{}` | **CONFIRMED** → fixed | Required-field schema; `{}` throws |
| V-03 | Suggestion `slice(-90)` = holdout leak | **PARTIALLY_CONFIRMED** | For **next-draw survey**, published lookback is valid; fixed labeling + `CURRENT_PROTOCOL.lookback` + cutoff id/date; not forced to pre-TEST |
| V-04 | Offline blocked by bundled-first fetch | **CONFIRMED** → fixed | `chooseLoadedDataset` / independent cache+bundled |
| V-05 | `redirect:"follow"` after allowlist | **CONFIRMED** → fixed | Manual redirects + re-allowlist each hop; reject credentials/non-443 |
| V-06 | Official cache concurrent miss | **CONFIRMED** → fixed | In-process single-flight (not cross-isolate) |
| V-07 | Public refresh `force` / body bounds | **CONFIRMED** → fixed | `parseRefreshRequest` 403 force; 413 size/records; route uses `allowForce:false` |
| V-08 | Auto-update ≠ daemon | **CONFIRMED** | Mount TTL only; added `npm run data:schedule` for OS scheduler |
| V-09 | IDB `DB_VERSION=1` | **REJECTED as bug** | No schema change → no migration invented |
| V-10 | Secondary mirror on critical path | **REJECTED** | Official primary; mirror only cross-check / manifest secondary descriptor |
| V-11 | Build hang (Audit A) | **REJECTED on this machine** | Build completes; CI timeout 20m |
| V-12 | LICENSE missing | **CONFIRMED** | Not changed (user forbid license-only checklist close) |

---

## 3. Data-source decision

| Source | Role | Keep? | Why |
|---|---|---|---|
| vietlott.vn (`vietlott-official`) | **primary** | **KEEP** | Authoritative results; sync + refresh path |
| vietvudanh/vietlott-data | cross-check only | **KEEP optional** | Independent MIT mirror; useful mismatch detection; **not** default update path |
| Bundled `power645.jsonl` | offline baseline | **KEEP** | Required for local-first |
| IndexedDB | device cache | **KEEP** | Offline after successful refresh |

Policy now documented in README: default update = official only; cross-check = `npm run data:cross-check`; force = CLI only.

---

## 4. Feature matrix (UX)

| Feature | Decision | Note |
|---|---|---|
| Research tab (stats + holdout + data status) | **KEEP** | Default tab now |
| Portfolio / coverage + frontier | **KEEP** | Supporting tool; not “winning tips” |
| Ticket simulator | **KEEP** | Teaching law/odds |
| Profit lab | **KEEP** | Budget literacy |
| Hot/cold matrix | **KEEP** | Descriptive only |
| Suggestion balls | **FIX** | Labeled next-draw survey + cutoff |
| rankingScore UI | **KEEP out** | Ban contract remains |
| Dual “ROI table” vs holdout | **KEEP both** | Different jobs; captions already honest |
| Data Explorer (date/id search) | **DEFER** | Not built this pass |
| Experiment history page | **DEFER** | CLI/registry exist; UI panel later |
| Controls A–F in UI | **DEFER** | CLI `research:controls` |

---

## 5. Refactors performed

- Prospective freeze gates (hash bind + known draws)
- Registry required-field validation
- Offline-first dataset resolve
- HTTP redirect hop allowlist
- Official fetch in-process single-flight
- Refresh API schema / size / force policy
- Portfolio odds accepts validated tickets
- Default IA: Research first
- CI workflow
- Local scheduler script + npm script
- README accuracy (refresh path, offline, scheduler, force)

**Not done (out of scope / deferred):** auth, billing, Power 6/55, ML expansion, D1/R2, full Playwright suite, LICENSE file.

---

## 6. Behaviour changes (intentional)

| Change | Impact |
|---|---|
| Freeze rejects mismatched protocolHash | Old “pass with wrong hash” adversarial case now fails — correct |
| Public API rejects `force:true` | Clients cannot force upstream; CLI `--force` still works via `data:sync` |
| `handleDataRefresh({force:true})` needs `allowForce:true` | Tests updated |
| Offline load can use cache alone | App can start without bundled fetch |
| Default tab = research | First viewport is research conclusion |

No historical registry/scorecard artifacts rewritten.

---

## 7. Commands & limits

```bash
npm run typecheck
npm test
npm run lint
npm run build          # log: reports/build-verify-2026-09-13.log
npm run data:check
npm run data:schedule  # local scheduler
npm run start          # after build → http://127.0.0.1:8787
```

**Limits:** Browser mobile/keyboard/double-click deep paths only partially covered (desktop smoke). Live official crawl not forced this pass. Scheduler cannot run while machine is off.

---

## 8. Browser evidence

- URL: `http://127.0.0.1:8787/`
- Research tab **selected** by default
- Headline: “Thống kê không phải dự đoán”
- Conclusion: “Chưa có chiến lược vượt đối chứng trên holdout”
- Suggestion copy includes cutoff `#01561` / date and “không phải prospective scored”
- Data status shows 1561 draws, official source, hash prefix `8e26f348…`

---

## 9. Local run & scheduler

1. `npm run install:ci`
2. `npm run dev` or `npm run build && npm run start`
3. Optional catch-up without UI: `npm run data:schedule`
4. Windows Task Scheduler: action = `node --import=tsx scripts/data-schedule.ts` in repo cwd; review `reports/scheduler/last-run.log`

---

## 10. Remaining risks / next

1. ~~Add Data Explorer + experiment scorecard UI (deferred).~~ **Done in Round 3** — see addendum below.
2. Real browser E2E in CI (Playwright) beyond contract regex. **Still open** — manual MCP passes done (Round 2 + Round 3), not yet CI-wired.
3. ~~Cross-isolate rate-limit if Worker is publicly exposed at scale.~~ **Partially addressed in Round 3** — in-process soft rate-limit added (single-isolate only, documented as such); real cross-isolate limiting still needs a durable store per ADR-005.
4. ~~LICENSE / legal review when publishing OSS (explicitly not auto-closed here).~~ **Done in Round 3** — MIT LICENSE added.
5. Prospective live append when `#01562+` lands. **Still open** — cannot be exercised until that draw occurs; ops runbook + mocked E2E test now cover the procedure (Round 3).
6. Commit/PR this worktree when user requests — do not auto-commit mixed user+agent changes without review. **Still standing** — nothing committed in Round 3 either.

---

## 11. Round 3 addendum (2026-09-13, scorecard-100 prompt)

Full closeout: `reports/26-09-13-11-49-round3-scorecard-100-closeout.md`.

Closed this round: G1 (Data Explorer), G2 (experiment/prospective scorecard panel), G3 (Controls A–F surfaced read-only in Research tab), G5 (LICENSE), G7 (verified already-handled, no fix needed), G8 (ADR-005, persistence decision), G9 (soft rate-limit on refresh route), G10 (prospective ops runbook + mocked E2E test). All 8 lab-maturity axes independently rescored to 100/100 with fresh command output, source reads, and a second (orchestrator-run, not reused) Playwright MCP pass at desktop + mobile. No regressions found in any V-01–V-12 item from this document. Scientific grade unchanged: **C — NO DEMONSTRATED EDGE**. Nothing committed or pushed.
