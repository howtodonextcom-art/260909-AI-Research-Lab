# MASTER PROMPT — Claude Code
# Mega 6/45 Research Lab → Lab Scorecard 100/100 (Round 3 — Remaining Gaps)

Bạn là Claude Code Orchestrator, quyền tự chủ tối đa trong:

`D:\2026\260909-AI-Research Lab`

## Mục tiêu

Đọc và hợp nhất các báo cáo sau, **chỉ implement phần còn mở**, nâng **8 trục lab maturity lên 100/100** theo rubric §0:

1. `reports/local-verification-refactor-closeout.md` — trạng thái gần nhất (nhiều P0/P1 ĐÃ FIX)
2. `reports/26-09-13-11-02-unified-roadmap-from-dual-audit.md`
3. `reports/AI-Research-Lab-Audit.md`
4. `reports/26-09-13-10-49-product-architecture-competitive-audit.md`

Vòng bắt buộc:

**lên ý tưởng → kiểm chứng trên source hiện tại → Code → Test (tsc + npm test + lint + data:check + build) → Browser MCP → Fix → Pass nếu thực sự done.**

Nếu bất kỳ trục < 100 sau full gate: **lặp** (tối đa **5 vòng**). Vòng 5 vẫn thiếu → ghi nợ có bằng chứng + cập nhật closeout, **không PASS giả**.

Không hỏi human (trừ credential / phá data / deploy / billing / force-push).  
Không commit/push/deploy trừ khi user yêu cầu riêng.  
Bảo toàn worktree bẩn của user; không stash -f / reset hard / xóa artifact lịch sử.

---

## 0. Rubric 100/100 (lab maturity — không phải “có edge”)

Scientific grade hiện tại: **C — NO DEMONSTRATED EDGE**. Được phép PASS 100/100 lab **và** vẫn grade C.

| Axis | =100 khi (measurable) |
|---|---|
| Code maturity | `tsc` + `npm test` + `lint` + `build` + `data:check` xanh; CI workflow chạy được; không regression |
| Architecture | Ranh giới rõ; ADR persistence (local-only vs D1) ghi nhận; dead/deferred có quyết định |
| Algorithm quality | Core giữ; ablation/controls/prospective operable; rankingScore **không** vào UI; không claim edge giả |
| Statistical validity | Prospective gate đã bind (verify); registry schema; Holm=hypothesis; alpha-spend=look; controls A–F + surface tối thiểu trong UI hoặc artifact đọc được từ Research |
| Backtest quality | Replay freeze goldens xanh; prospective freeze/append path + mock/live ops doc; suggestion không tính thành tích quá khứ |
| Reproducibility | LICENSE; experiment UI hoặc panel truy vết protocol/dataset/commit; git story sạch hoặc PR plan |
| Cost optimization | Coverage explorer usable; frontier caveat; clipboard feedback; không gọi rẻ hơn = thông minh hơn |
| Production readiness | Browser MCP E2E desktop+mobile smoke; offline/error/stale; update/double-click; CI; scheduler doc |

**Anti-PASS:** Markdown-only score bump; skip browser; đưa rankingScore/probability edge vào UI; rewrite registry.jsonl cũ; silent protocol hash change; bán “số chắc thắng”.

### 0b. ĐÃ FIX — verify then SKIP rewrite

Từ `reports/local-verification-refactor-closeout.md` (re-verify bằng grep/test, đừng viết lại nếu còn xanh):

- Prospective `protocolHash === lock.protocolHash` + `knownDrawIds`
- Registry required fields (reject `{}`)
- Offline-first `chooseLoadedDataset`
- HTTP manual redirect + allowlist hops
- Official cache in-process single-flight
- Refresh API: body/records limits; public `force` → 403
- Research default tab; suggestion cutoff labels
- CI `.github/workflows/ci.yml`; `data:schedule`
- Portfolio odds validate portfolio; clipboard status

Nếu regress → FIX ngay trước khi làm feature mới.

### 0c. CÒN MỞ — bắt buộc đóng để tiến tới 100

| ID | Hạng mục | Nguồn | Priority |
|---|---|---|---|
| G1 | Data Explorer (tìm kỳ / khoảng ngày / metadata) | A + unified + closeout §10 | P1 |
| G2 | Experiment / prospective scorecard panel trong UI (RETROSPECTIVE / PENDING / SCORED) | A + unified | P1 |
| G3 | Surface Controls E/F (và tóm tắt A–C) trong Research — read-only | closeout DEFER | P1 |
| G4 | Playwright hoặc MCP browser E2E suite tối thiểu + gắn CI nếu khả thi | A + B + closeout | P0 |
| G5 | LICENSE + package.json license field + README cite | B F-01; closeout V-12 | P1 |
| G6 | Git hygiene: tách/commit plan hoặc branch sạch cho Pha B + Round3 (không force user commit blindly — tạo patch/PR ready; nếu được phép commit thì commit atomic có message) | closeout §10.6 | P2 |
| G7 | Coverage explorer polish (budget ↔ frontier đã có — siết mobile + honesty) | B + unified | P2 |
| G8 | Persistence ADR (`docs/adr/…`) local-only vs D1 — quyết định tường minh | unified U-08 | P2 |
| G9 | Public Worker soft rate-limit / abuse notes (in-process hoặc documented edge limit) | A refresh P1 residual | P2 |
| G10 | Prospective live ops: freeze next + append khi `#01562+`; nếu chưa có draw → mock test + ops runbook | A + closeout | P1 |
| G11 | Jackpot tax/share uncertainty copy siết hơn | B F-04 | P3 |
| G12 | README/power645 naming clarity | A P2 | P3 |

**DO_NOT_BUILD:** AI win tips; probability-as-edge UI; Power 6/55 rename; MLflow+DVC prestige; auth/billing full SaaS; conflict overwrite; martingale.

---

## 1. Sub-agents (≥2, bắt buộc)

### S1 — Research Core, Data & Integrity
1. Re-verify §0b gates (tests + grep).
2. G10 prospective ops runbook + tests.
3. G3 controls summary module → Research UI (read-only, honest).
4. G5 LICENSE (MIT hoặc SPDX phù hợp repo; cập nhật README — **được phép** trong Round 3).
5. G8 Persistence ADR.
6. G9 rate-limit nhẹ trên refresh route (document limits).
7. Keep official-only default; cross-check optional.

### S2 — Product UX, Explorer & Browser QA
1. G1 Data Explorer component (filter id/date range trên draws đã load; không fake server search).
2. G2 Experiment/scorecard panel (đọc `protocol-lock`, family summary, prospective scorecard nếu có; badges).
3. G7 coverage/mobile polish; clipboard feedback — extend E2E.
4. G4 Browser MCP: desktop 1440×900 + mobile ~390×844; tabs Research/Portfolio/Ticket; update; offline messaging if mockable; keyboard smoke; screenshot notes.
5. Contract tests: no ranking-score UI; default research tab; explorer/scorecard present.

### Orchestrator
Merge S1∥S2 → full gates → browser → rescore 8 axes với evidence → loop.

Optional **S3 Adversarial** (vòng 2+): leak future into suggestion scoring; force on public API; UI banned phrases (“chắc thắng”, “tăng xác suất Jackpot”).

---

## 2. Quy trình mỗi hạng mục

```
IDEATE (2 options, pick 1, ghi 3 dòng)
→ VERIFY (grep call sites; đọc closeout + unified U-IDs)
→ CODE (minimal diff; match repo style)
→ TEST: npm run typecheck && npm test && npm run lint && npm run data:check && npm run build
→ npm run research:controls (E+F vẫn xanh)
→ BROWSER MCP (start/stop safely; 8787 or dev port)
→ RESCORE axes
→ loop if < 100
```

Browser minimum checklist:

- [ ] Default tab = Nghiên cứu
- [ ] “Chưa có chiến lược vượt đối chứng” hoặc honesty tương đương khi no candidate
- [ ] Suggestion shows cutoff + not prospective scored
- [ ] Data Explorer finds a known draw id
- [ ] Experiment/protocol panel visible
- [ ] Portfolio frontier caveat visible
- [ ] No banned prediction marketing phrases
- [ ] Mobile: primary actions usable; tables scroll

---

## 3. Closeout PASS

Chỉ PASS khi:

1. All 8 axes = **100** với evidence cụ thể (file/test/screenshot note)
2. Full gate green
3. Browser QA documented
4. Scientific grade stated (**C** expected unless real `#01562+` prospective evidence)
5. Files:
   - `reports/<ts>-round3-scorecard-100-closeout.md`
   - Addendum ngắn vào `reports/local-verification-refactor-closeout.md` hoặc unified roadmap
   - Prompt copy (optional): `prompts/<ts>-claude-code-round3-scorecard-100.md`

Anti-PASS list §0 applies.

---

## 4. Kickoff

1. Đọc 4 báo cáo; lập bảng FIXED vs OPEN vs DO_NOT_BUILD.
2. Spawn S1 + S2 parallel.
3. Execute until 100/100 or 5 loops.
4. Không hỏi human trong phạm vi trên.

Bắt đầu ngay.
