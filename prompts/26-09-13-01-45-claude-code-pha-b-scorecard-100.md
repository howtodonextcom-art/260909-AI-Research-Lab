# MASTER PROMPT — Claude Code
# Pha B Remaining → Lab Scorecard 100/100 (Round 2)

Bạn là Claude Code Orchestrator, quyền tự chủ tối đa trong:

`D:\2026\260909-AI-Research Lab`

## Mục tiêu

Implement **Pha B còn lại** từ [`reports/26-09-13-01-40-vietlott-forensics-replay-cost-comprehensive-v2.md`](../reports/26-09-13-01-40-vietlott-forensics-replay-cost-comprehensive-v2.md) § B1–B8 Top 5, nâng **8 trục scorecard lên 100/100** theo rubric §0. Vòng:

**lên ý tưởng → kiểm chứng source → Code → Test (tsc + npm test + lint) → Browser MCP → Fix → Pass.**

Nếu bất kỳ trục < 100 sau full gate: **lặp** (tối đa **5 vòng**). Vòng 5 vẫn thiếu → ghi nợ + `CLAUDE.md`, không PASS giả.

Không hỏi human (trừ credential / phá data / deploy / billing). Không commit/push/deploy.

---

## 0. Baseline (đã có — cấm regress)

**Đã IMPLEMENTED (verify, không rewrite):**
- Replay freeze: [`scripts/audit-replay-2026-09-11.ts`](../scripts/audit-replay-2026-09-11.ts), [`lib/analytics.replay-freeze.test.ts`](../lib/analytics.replay-freeze.test.ts)
- Bao + frontier CLI: [`lib/research/bao.ts`](../lib/research/bao.ts), `npm run research:bao-frontier`
- Portfolio MC: [`lib/research/portfolio-mc.ts`](../lib/research/portfolio-mc.ts), `npm run research:portfolio-mc`
- Prospective freeze/append: [`lib/research/prospective.ts`](../lib/research/prospective.ts), `research:prospective-freeze`, `research:prospective-append`
- Control E: [`lib/research/negative-controls.ts`](../lib/research/negative-controls.ts)
- Registry optional fields parse: [`lib/research/experiments.ts`](../lib/research/experiments.ts) — **writer chưa ghi đủ**
- rankingScore stub: [`lib/research/ranking-score.ts`](../lib/research/ranking-score.ts) — **UI import = 0**

**Scientific grade:** **C — NO DEMONSTRATED EDGE** (không đổi trừ khi `#01562+` thật + prospective evidence). Scorecard 100 **≠** grade A/B.

**Cấm:** claim edge; probability UI; Top-N tips product; rewrite `registry.jsonl`; silent protocol hash change; deep ML ship.

---

## 0b. Rubric 100/100 — gap → deliverable

| Axis | Hiện v2 (~) | Cần để = 100 |
|---|---|---|
| Code maturity | 92 | Control F + features + ablation + tests; full gate green |
| Architecture | 94 | `features.ts` leak-safe; ablation module; UI frontier tách component |
| Algorithm quality | 78 | Ablation CLI; optional **research-only** Top-N CLI (rankingScore, không UI) |
| Statistical validity | 94 | **Control F** + leak tests; `research:controls` in F |
| Backtest quality | 90 | Mock prospective append test; ablation Δ metrics |
| Reproducibility | 95 | **`run-experiment.ts` ghi budget/prediction/cutoff** vào registry mới |
| Cost optimization | 92 | **UI frontier panel** + caveat (không claim win) |
| Production readiness | 88 | Browser MCP pass; ops doc snippet in closeout |

---

## 1. Sub-agents (≥2, bắt buộc)

### S1 — Research Core & Stats
1. **Control F** — future-only / leak feature must fail ([`lib/research/negative-controls.ts`](../lib/research/negative-controls.ts)); wire vào [`scripts/research-controls.ts`](../scripts/research-controls.ts)
2. **`lib/research/features.ts`** — leak-safe features (`drawDate < target` only); tests including **must fail** if future draw included
3. **Ablation CLI** — `scripts/research-ablation.ts` + `lib/research/ablation.ts`: Full vs Full−HOT/COLD/BALANCED marginal Δ (edge, adj-p) trên snapshot; print table
4. **`run-experiment.ts`** — khi register, ghi optional: `budgetTickets`, `budgetVnd`, `predictionKind`, `predictions`, `preRegistered`, `dataCutoffDrawId`, `dataCutoffDate`, `rankingScoreVersion` (backward compatible)
5. Prospective **append mock test** — fixture draw `#01562` synthetic trong test only; verify append-result scores without peeking

### S2 — Cost UI + Browser QA
1. **UI cost-frontier panel** — component nhỏ (Research hoặc Portfolio tab): bảng rút gọn từ `bao` math (10/20/30 vs bao18) + **FRONTIER_CAVEAT** copy; không EV+, không “thông minh hơn”
2. **Browser MCP**: Research + Portfolio + frontier panel; verify honesty strings; screenshot notes
3. Contract test: no `ranking-score` import in `app/`/`components/`

### Orchestrator
Merge S1∥S2 → gates → browser → rescore 8 axes → loop.

Optional **S3 Adversarial** (vòng 2+): cố leak future date, unequal budget compare, UI banned phrases.

---

## 2. Scope chi tiết (P0)

### P0-1 Prospective ops `#01562+`
- Giữ freeze/append hiện có; thêm **test** append khi mock `#01562` xuất hiện trong fixture
- CLI smoke: `freeze next` → pending; `append-result` no-op khi chưa có draw (OK)
- Closeout: hướng dẫn ops 3 lệnh khi kỳ mới sync

### P0-2 Control F + features leak suite
- Control F: ví dụ shuffle ticket-draw pairing **hoặc** inject feature computed with `drawDate >= target` → pipeline/test **must reject or collapse**
- ≥3 unit tests; `research:controls` prints F summary

### P0-3 Experiment writer pre-registration fields
- [`scripts/run-experiment.ts`](../scripts/run-experiment.ts): populate fields từ snapshot (latest draw id, cutoff, 1 ticket × 4 strategies hoặc document portfolio path)
- Test: new registry line parses; old lines still parse

### P0-4 Ablation CLI
- `npm run research:ablation` — table: strategy removed | Δ validation edge | Δ TEST adj-p | verdict
- Pure logic in `lib/research/ablation.ts`; no UI

### P0-5 UI frontier + caveat
- Fetch static summary hoặc inline computed từ `buildCostCoverageFrontier` (reuse [`lib/research/bao.ts`](../lib/research/bao.ts))
- Vietnamese caveat: chi phí thấp hơn ≠ thuật toán thắng nếu coverage giảm tỷ lệ

### Out of scope
- Calibrated probability in UI
- rankingScore non-stub ML training
- Protocol relock unless unavoidable (document if so)

---

## 3. Vòng lặp

```
IDEATE (2 options/item, pick 1)
→ VERIFY (grep call sites, read v2 + 01-45 closeout)
→ CODE
→ TEST: npx tsc --noEmit && npm test && npm run lint && npm run data:check
→ npm run research:controls (must include E + F)
→ BROWSER MCP (5173 or wrangler; start/stop safely)
→ RESCORE 8 axes with evidence
→ loop if any < 100
```

Browser minimum: no banned phrases; RETROSPECTIVE badge; hypothesis/look/alpha; frontier caveat visible.

---

## 4. Closeout PASS

Chỉ PASS khi:
1. All 8 axes = **100** with evidence per §0b
2. Full gate green
3. Browser QA documented
4. Scientific grade stated (**C** expected)
5. Files:
   - `reports/<ts>-pha-b-scorecard-100-closeout.md`
   - Addendum § at end of [`reports/26-09-13-01-40-vietlott-forensics-replay-cost-comprehensive-v2.md`](../reports/26-09-13-01-40-vietlott-forensics-replay-cost-comprehensive-v2.md)

Anti-PASS: Markdown-only score bump; Control F missing; experiment writer still omits fields; no browser; rankingScore in UI.

---

## 5. Kickoff

1. Read v2 report Top 5 + grep what's missing (Control F, features.ts, ablation, run-experiment fields, UI frontier)
2. Spawn S1 + S2 parallel
3. Execute until 100/100 or 5 loops

Bắt đầu ngay.
