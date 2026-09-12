# MASTER PROMPT — Claude Code
# Mega 6/45 Research Lab → Scorecard 100/100 (Forensics Blueprint Implementation)

Bạn là Claude Code Orchestrator với quyền tự chủ tối đa trong repo:

`D:\2026\260909-AI-Research Lab`

Nguồn blueprint bắt buộc:

- `reports/26-09-13-01-10-vietlott-forensics-replay-cost-comprehensive.md`
- Artifact: `scripts/audit-replay-2026-09-11.ts`, `reports/audit-replay-2026-09-11.json`

Mục tiêu: **nâng scorecard 8 trục lên 100/100** theo rubric §0 bên dưới, bằng cách **implement** Top upgrades (không chỉ viết lại Markdown), theo vòng:

**lên ý tưởng → kiểm chứng trên source → Code → Test (unit + `tsc` + lint) → Test MCP trình duyệt → Fix bug → Pass nếu thực sự done.**

Nếu sau một vòng full-gate vẫn < 100/100 trên bất kỳ trục nào của rubric: **lặp lại** vòng nâng cấp (tối đa **5 vòng** full). Vòng 5 vẫn thiếu → ghi nợ có bằng chứng trong closeout + `CLAUDE.md`, không tuyên PASS giả.

**Không hỏi human** trừ: thiếu credential; thao tác phá dữ liệu; thanh toán/deploy production; bị chặn quyền ngoài repo.

**Không commit / push / deploy** trừ khi user yêu cầu riêng.

---

## 0. Rubric 100/100 (BẮT BUỘC — định nghĩa “điểm tối đa”)

Scientific verdict hiện tại **C — NO DEMONSTRATED EDGE**. **Không** được đạt “Algorithm 100” bằng cách claim edge giả hoặc đổi wording marketing.

Mỗi trục = **lab maturity & honesty**, đo được:

| Axis | 100/100 nghĩa là (PASS measurable) |
|---|---|
| Code maturity | `tsc` + `npm test` + `lint` xanh; modules mới có unit tests; không regression 199+ tests |
| Architecture | Modules V2 paths tồn tại, tách research/CLI/UI; protocol hash không silent-change |
| Algorithm quality | Stack V2 **IMPLEMENTED** (baselines + rankingScore gated + portfolio MC + bao CLI + prospective machinery); HOT/COLD/BALANCED = baselines; UI không gọi probability nếu chưa qua calibration gate; **grade có thể vẫn C** |
| Statistical validity | Same-budget MC B6; Holm=hypothesisCount; alpha-spend=lookCount; HAC pin trong artifact; ≥1 control mới (E hoặc F) hoặc freeze leak test |
| Backtest quality | Replay freeze golden tests; prospective scorecard path `#01562+` (append-only; empty OK nếu chưa có draw) |
| Reproducibility | Registry fields budget/prediction/cutoff; artifacts reconstructible; freeze hashes |
| Cost optimization | `bao` math + frontier CLI; projective vs bao vs random same-budget table; UI/CLI không gọi giảm cost = “thông minh hơn” nếu coverage giảm tỷ lệ |
| Production readiness | UI honesty checklist pass trong browser MCP; EV− / Ranking Score / no edge claim; 403/cache paths không phá snapshot; ops scripts documented in closeout |

**Weighted scientific grade** (A/B/C/D) **độc lập** với scorecard 100. Được PASS 100/100 lab **và** vẫn grade C nếu chưa có prospective edge.

Cấm wording: “dự đoán chính xác”, “tăng khả năng trúng”, “tối ưu xác suất” như edge đã chứng minh.

SOURCE THẮNG Markdown. Capability: IMPLEMENTED | PARTIAL | STUB | DECLARED_ONLY | NOT_FOUND.

Không đổi `CURRENT_PROTOCOL` fields trừ khi thật sự cần + `research:lock --force` tường minh. Không rewrite `registry.jsonl` cũ (chỉ append schema-compatible optional fields cho record mới).

---

## 1. Bắt buộc ≥ 2 sub-agents (Claude Code Task / parallel agents)

Phải tạo và điều phối **ít nhất 2** sub-agents thật (nếu tool multi-agent có). Không được “một mình làm hết rồi ghi giả là 2 agent”.

### Sub-agent S1 — Research Core Implementer

Sở hữu:

1. Prospective scorecard `#01562+` (`lib/research/prospective.ts` + CLI `research:prospective-*`)
2. Replay freeze tests (golden từ `reports/audit-replay-2026-09-11.json`)
3. Registry budget/prediction/cutoff optional fields (`lib/research/experiments.ts` + tests; backward compatible parse)
4. Leak-safe feature helpers nếu cần cho rankingScore lane

Deliverable S1: code + unit tests + CLI; không browser.

### Sub-agent S2 — Cost / MC / UI Honesty + Browser QA

Sở hữu:

1. Same-budget portfolio MC (`lib/research/portfolio-mc.ts` + CLI)
2. Bao combinatorics + cost–coverage frontier CLI (`lib/research/bao.ts`)
3. rankingScore research-only + calibration **stubs/gates** (Platt/isotonic hooks OK; **không ship predictor**; default label Ranking Score)
4. UI copy / DataStatus / ResearchLab honesty nếu cần
5. **MCP browser**: mở app, Research + Portfolio tabs, xác nhận EV− / no edge / Ranking Score / familySize-hypothesis / không claim bao “win”

Deliverable S2: code + tests + browser evidence notes.

### Orchestrator (bạn)

- Chia việc S1 ∥ S2 khi độc lập; merge; chạy full gate; re-score 8 trục; loop nếu <100.
- Sub-agent S3 (khuyến nghị từ vòng 2): Adversarial Auditor — cố phá PASS (leakage, unequal budget, silent protocol change, UI claim).

---

## 2. Scope implement (thứ tự ưu tiên từ báo cáo)

### P0 — phải có để chạm 100

1. **Prospective scorecard `#01562+`** — freeze prediction append-only; refuse peek `drawDate >= target`; empty scorecard OK; `classifyEvidence` wire.
2. **Replay freeze contract tests** — pin tickets/matches từ artifact `#01560`→`#01561`; fail nếu golden drift.
3. **Registry fields** — `budgetTickets`, `budgetVnd`, `predictionKind`, `predictions`, `preRegistered`, `dataCutoffDrawId`, `dataCutoffDate`, `rankingScoreVersion` (optional; parse fail-closed nếu present-but-invalid).
4. **Same-budget portfolio MC** — seed cố định; default ≥2000 (research CLI; tách khỏi `fairnessSimulationCount`); summary mean/percentile vs projective.
5. **Bao + frontier CLI** — `C(18,6)=18564`, cost, P(JP); frontier budgets; so sánh projective/random; honesty: lower cost ≠ algorithm win nếu coverage tỷ lệ.

### P1 — Algorithm/Stat axes

6. **rankingScore lane (gated)** — train-only API; leak tests; UI/docs = Ranking Score; calibration metrics module (Brier/ECE) **report-only**; promotion gate documented; **không** auto-promote khi grade C.
7. Control E (label permute) **hoặc** Control F (future-feature must fail) — ít nhất một.
8. Persist HAC lag / spentAlpha / familySize trong artifact nếu chưa đủ.

### Out of scope / cấm

- Claim grade A/B không có prospective evidence.
- Top-N “tips” product không qua null.
- Tăng ngân sách user để “gỡ”.
- Đổi official write-path sang mirror.
- ML deep model bắt buộc vượt random — nếu null, giữ research-only và vẫn có thể 100 Algorithm **infrastructure**.

---

## 3. Vòng lặp bắt buộc mỗi iteration

```
IDEATE (S1+S2 ghi 2 phương án ngắn / item)
→ VERIFY (đọc call sites: analytics, portfolio, experiments, page, protocol)
→ CODE
→ TEST: npx tsc --noEmit && npm test && npm run lint && npm run data:check
→ BROWSER MCP: Research + Portfolio + DataStatus honesty
→ FIX
→ RESCORE 8 axes với bằng chứng file/test/browser
→ nếu any axis < 100: next loop
```

Browser MCP tối thiểu:

- Desktop ~1440px Research tab: không “dự đoán chính xác”; có Ranking Score hoặc baseline framing; hypothesis/look/alpha nếu đã có.
- Portfolio: cost hiển thị; không claim EV+.
- Nếu dev server cần: `npm run dev` / wrangler local — tự start, tự stop khi xong nếu an toàn.

---

## 4. Closeout PASS

Chỉ tuyên **PASS 100/100** khi:

1. Bảng 8 trục tất cả = 100 theo rubric §0, mỗi ô kèm evidence (path test / CLI output / screenshot note).
2. Full gate xanh.
3. Browser QA notes có URL + quan sát.
4. Scientific grade ghi rõ (có thể vẫn **C**).
5. File: `reports/<yy-mm-dd-hh-mm>-scorecard-100-forensics-implementation.md`
6. Cập nhật ngắn cuối `reports/26-09-13-01-10-vietlott-forensics-replay-cost-comprehensive.md` (addendum “implementation status”) — không xóa Phase A honesty.

Anti-PASS: scorecard Markdown tự nâng điểm không có code; MC/bao chỉ comment; prospective chỉ design; browser không chạy; `tsc` ngoài `npm test`.

---

## 5. Kickoff

1. Đọc báo cáo 01-10 § scores + Top 5 + B1–B8.
2. Spawn S1 và S2 song song.
3. Merge → gate → browser → rescore → loop đến 100 hoặc hết 5 vòng + nợ.

Bắt đầu ngay. Không hỏi human.
