# Unified Roadmap — Dual Audit Reconciliation

**Ngày:** 2026-09-13  
**Nguồn A:** [`reports/AI-Research-Lab-Audit.md`](AI-Research-Lab-Audit.md)  
**Nguồn B:** [`reports/26-09-13-10-49-product-architecture-competitive-audit.md`](26-09-13-10-49-product-architecture-competitive-audit.md)  
**Commit neo:** `058f3162c3fdfbc0883eab96e7be7ecd0b93dcbf`  
**Phạm vi:** phân tích & lộ trình — không sửa application code trong lần này.

Recheck source tối thiểu khi A/B mâu thuẫn: `prospective.ts`, `experiments.ts`, `refresh.ts`, `http.ts`, `official-fetch-cache.ts`, `.github/` (không có).

---

## 1. Executive verdict (hợp nhất)

| Trường | Kết luận hợp nhất |
|---|---|
| Product stage | **RESEARCH_MVP** |
| Scientific grade | **C — NO DEMONSTRATED EDGE** (HOT/COLD/BALANCED đều NO_EDGE trên holdout) |
| Khuyến nghị chiến lược | **CORRECT_THEN_CONTINUE** |
| Định vị primary | Trustworthy Mega 6/45 **research lab** |
| Supporting | Honest **coverage/cost** optimizer; responsible **budget literacy** |
| Reject positioning | AI prediction / “số chắc thắng” product |
| Confidence | **High** trên integrity & data; **Medium** trên release (build/E2E/CI) |

Hai audit **đồng thuận nền**: đây là phòng nghiên cứu xác suất nghiêm túc, không phải công cụ kiếm tiền từ vé; pipeline dữ liệu và null-model là tài sản; cần sửa ranh giới tin cậy trước khi mở rộng mô hình/thương mại.

B bổ sung lens cạnh tranh/scorecard/LICENSE/suggestion-TEST.  
A bổ sung P0/P1 bảo đảm prospective, registry, HTTP/API boundary, offline-first, CI/E2E — **những mục này thắng trong backlog hợp nhất**.

---

## 2. Agreement / Conflict matrix

| Trục | A nói | B nói | Hợp nhất | Confidence |
|---|---|---|---|---|
| Worth continuing | Giữ nền, sửa integrity trước | CORRECT_THEN_CONTINUE | **CORRECT_THEN_CONTINUE** | High |
| Scientific edge | Không edge; candidate null | Grade C | **C — không tuyên edge** | High |
| Frontend | 3 tab ổn; thiếu Explorer/E2E/clipboard | 84/100; suggestion chồng TEST | Research UI tốt nhưng **chưa product-ready** | High |
| Backend truth | Worker mỏng; không shared store | Một route refresh; D1/R2 null | **Thin edge API + CLI persistence** | High |
| Data trust | Official + verify-live mẫu PASS | Manifest/hash/conflict FAIL-closed | **Tin cậy nghiên cứu** | High |
| Auto-update | Mount TTL ≠ scheduler | TTL 12h + lock client | **Có auto-refresh khi mở app; không daemon** | High |
| Algorithm integrity | Heuristic + kiểm định đúng hướng | 88 integrity / grade C | **KEEP core; EXTEND prospective** | High |
| Release readiness | Build chưa verify; không CI; thiếu E2E | Build PASS local; E2E partial | **CONFLICT_NEEDS_RECHECK** → Phase 0 bắt buộc CI build | Med |
| Test count | 260 (141+119) | 288 (169+119) | **OUTDATED_RELATIVE_TO_WORKING_TREE** — đóng băng baseline trên commit sạch | High |
| Commercial | Chưa | Persistence ADR + legal | **DEFER SaaS** đến sau Phase 1 | High |
| Competitive | Lotterycodex/dCode/Lottery Post/MLflow… | DigitWheel/Lottography/IOI/W&B… | Hợp nhất bộ đối thủ; học UX/covering/tracking **không** copy prediction theater | High |

### CONFLICT_NEEDS_RECHECK (lệnh đề xuất)

| ID | Conflict | Lệnh / tiêu chí |
|---|---|---|
| R1 | Build PASS (B) vs chưa verify (A) | CI: `npm run build` với timeout ≥15 phút + lưu log; không ngắt tay |
| R2 | Test 260 vs 288 | `git stash` / clean tree @ `058f316` rồi `npm test`; ghi số vào baseline |
| R3 | Offline cache “có” (B status) vs load fail-first (A) | Mock `fetch(/data/power645.jsonl)` fail → phải vẫn đọc IndexedDB |

---

## 3. Unified findings (U-xx)

| ID | Sev | Finding | Sources | Status | Evidence (recheck) | Impact | Recommendation | Acceptance |
|---|---|---|---|---|---|---|---|---|
| U-01 | P0 | Prospective freeze không bind `protocolHash` với lock; không xác nhận freshness/cutoff độc lập | A P0; B R07 PARTIAL | **A_ONLY nâng P0** | `freezeProspectivePrediction` nhận `input.protocolHash` caller, chỉ check `classifyEvidence` | Có thể gắn nhãn PROSPECTIVE sai | FIX gate: hash khớp lock, cutoff, reject stale dataset, tách register/score | Unit: hash lệch / data cũ / sau hạn → `ok:false` |
| U-02 | P1 | Registry parse chấp nhận `{}` — thiếu validate field bắt buộc | A P1 | **A_ONLY** | `describeExperimentRecordProblem` chỉ optional fields; `parseExperimentRegistry("{}")` path | Family/hypothesis metadata sai | Schema runtime bắt buộc + reject rõ | `{}` throw; record cũ hợp lệ vẫn parse |
| U-03 | P1 | Refresh API thiếu boundary (schema body, size, rate-limit, force admin) | A P1 | **A_ONLY** | `app/api/data/refresh/route.ts` | Abuse/DoS khi public | Strict schema + 400/413/429; force admin-only | Contract tests + mock oversize |
| U-04 | P1 | `redirect:"follow"` sau allowlist host ban đầu | A P1 | **A_ONLY** | `lib/data/http.ts` L136 | Thiếu phòng vệ SSRF redirect | Manual redirect + re-check Location | Test redirect → host lạ bị chặn |
| U-05 | P1 | `loadDataset` await bundled trước → offline không tới IndexedDB | A P1; B D05 overstated | **AGREED gap** (B status quá lạc quan) | `refresh.ts` L87–95 | Mất offline-first khi CDN/bundled fail | Đọc cache độc lập; fallback có thứ tự | Test: bundled fail + cache OK → origin cache |
| U-06 | P1 | Official fetch cache không single-flight khi miss đồng thời | A P1 | **A_ONLY** | không có inFlight trong `official-fetch-cache.ts` | Nhân bản upstream load | Lock theo cache key | 2 parallel miss → 1 upstream |
| U-07 | P1 | Không CI (`.github` trống); E2E browser thiếu; a11y chỉ regex | A P1; B G PARTIAL | **AGREED** | Glob `.github` = 0 | Release không tái lập | CI workflow + Playwright/MCP E2E tối thiểu | PR đỏ nếu test/lint/typecheck/build fail |
| U-08 | P1 | Không durable server persistence (D1/R2 null) — blocker thương mại | B F-03 | **B_ONLY** (A cũng mô tả device-local) | `.openai/hosting.json` | Không multi-device SaaS | ADR: local-only **hoặc** D1/R2 | ADR merged; không nửa vời |
| U-09 | P2 | Suggestion `draws.slice(-90)` chồng cửa sổ TEST | B F-02; A gợi ý tip UX | **B_ONLY→P2** | `app/page.tsx` ~124 | Hiểu nhầm “gợi ý” = holdout leak UX | Cắt pre-TEST hoặc nhãn RETROSPECTIVE DEMO | Assert window end < TEST start |
| U-10 | P2 | Thiếu LICENSE dự án | B F-01; A im lặng | **B_ONLY** | không LICENSE* | Chặn OSS/commercial clarity | SPDX + package.json | File hiện diện; README cite |
| U-11 | P2 | Auto-update ≠ scheduler định kỳ khi app đóng | A | **A_ONLY** | hook mount-only | Kỳ mới không về máy idle | CLI/cron local optional; đừng giả daemon trong browser | Doc + optional `data:sync` schedule script |
| U-12 | P2 | Thiếu Data Explorer + trang thí nghiệm (protocol/hash/pending/scored) | A | **A_ONLY** (B cũng thiếu UI registry sâu) | — | Khám phá/audit kém hơn Lottery Post / MLflow UX | EXTEND UI | Filter date/id; badge RETROSPECTIVE/PROSPECTIVE* |
| U-13 | P2 | Clipboard success/fail bị nuốt | A | **A_ONLY** | — | UX đứt | Báo aria-live success/fail | E2E mock clipboard |
| U-14 | P2 | IndexedDB `DB_VERSION=1` không migration path | B F-05 | **B_ONLY** | `browser-cache.ts` | Nâng schema sau này rủi ro | Versioned upgrade tests | v1→v2 fixture |
| U-15 | P2 | Jackpot tax/chia sẻ không model | B F-04; A profit honesty | **AGREED** | `mega645` JP null | Net bị hiểu sai nếu ai đó “ước” JP | Giữ null + cảnh báo mạnh hơn | UI copy uncertainty |
| U-16 | P2 | Competitive UX/viz/wheel SaaS kém DigitWheel/Lottography | B F-08; A Lotterycodex/dCode | **AGREED** | matrix B | Khó monetize coverage | EXTEND coverage explorer; học giải thích guarantee | Frontier + caveat; không AI tips |
| U-17 | P3 | Working tree dirty / Pha B chưa trên HEAD | B F-06 | **B_ONLY** | `git status` | Reviewer lệch baseline | Commit/PR hoặc stash | Clean story trên main |
| U-18 | P3 | rankingScore stub; cấm UI — đúng hướng | B F-07; A stub | **AGREED KEEP** | ban contract test | Không market như AI done | DO_NOT_BUILD UI đến gate | Ban test xanh |
| U-19 | P3 | Tên `power645.jsonl` kế thừa; comment refresh lỗi thời | A P2 | **A_ONLY** | README/A | Nhầm Power 6/55 | Doc fix; rename DEFER | README tách tên file vs sản phẩm |
| U-20 | P3 | `calculatePortfolioOdds(ticketCount)` không enforce pairwise≤1 | A P2 | **A_ONLY** | portfolio API | API dễ dùng sai | Nhận portfolio đã validate | Type/runtime guard |

**Không nâng thành finding mới:** “thiếu HAC” — B REJECTED (HAC có). “Update UI-only” — REJECTED. “Conflict overwrite” — REJECTED.

---

## 4. Priority-scored backlog (Top 15)

Score = (User + Integrity + Diff + Feasibility + Evidence) − Maint − LegalRisk (mỗi tiêu chí 1–5)

| Rank | U-ID | Đề xuất | Score | Effort | Action | Lane |
|---:|---|---|---:|---|---|---|
| 1 | U-01 | Prospective protocol binding thật | 23 | M | FIX | Research |
| 2 | U-05 | Offline-first load (cache trước/độc lập bundled) | 22 | S | FIX | Data |
| 3 | U-02 | Registry required-field schema | 21 | S | FIX | Research |
| 4 | U-04 | Redirect-safe allowlist fetch | 21 | S | FIX | Data/Sec |
| 5 | U-03 | Refresh API boundaries | 20 | M | FIX | Backend |
| 6 | U-09 | Suggestion vs TEST overlap | 20 | S | FIX | Frontend |
| 7 | U-10 | LICENSE | 20 | S | FIX | Legal |
| 8 | U-07 | CI + build gate + E2E tối thiểu | 19 | M | EXTEND | Ops/QA |
| 9 | U-06 | Official cache single-flight | 18 | S | FIX | Data |
| 10 | U-12 | Experiment/scorecard UI + labels | 18 | M | EXTEND | Frontend |
| 11 | U-08 | Persistence ADR (local vs D1/R2) | 16 | L | DEFER→ADR | Arch |
| 12 | U-16 | Coverage explorer + viz honest | 16 | M | EXTEND | Product |
| 13 | U-14 | IndexedDB migrations | 15 | M | FIX | Data |
| 14 | U-11 | Local sync scheduler (optional) | 14 | M | EXTEND | Ops |
| 15 | U-13 | Clipboard feedback | 13 | S | FIX | Frontend |

---

## 5. Full roadmap Phase 0–3

### Phase 0 — Trust & Release Blockers (0–2 tuần)

**Mục tiêu:** Không tuyên bố sai; ranh giới tin cậy + gate tái lập được.

| ID | Hạng mục | Action | Deps | Acceptance |
|---|---|---|---|---|
| U-01 | Prospective hash/cutoff/freshness gate | FIX | — | Reject hash lệch, data cũ, đăng ký sau hạn |
| U-02 | Registry schema bắt buộc | FIX | — | `{}` fail; registry.jsonl hiện tại vẫn parse |
| U-03 | Refresh API schema/size/rate/force | FIX | — | 400/413/429; force không public |
| U-04 | HTTP redirect re-allowlist | FIX | — | Redirect host lạ bị chặn |
| U-05 | Offline load order | FIX | — | Bundled fail + good IDB → app sống |
| U-06 | Cache single-flight | FIX | — | 1 upstream / key |
| U-09 | Suggestion pre-TEST / nhãn demo | FIX | — | Contract test |
| U-10 | LICENSE | FIX | — | SPDX + package field |
| U-17 | Git hygiene Pha B | FIX | — | Clean commit/PR story |
| U-07a | CI: typecheck + test + lint + build | EXTEND | R1 | Workflow xanh trên PR |
| R2 | Baseline test count trên clean tree | FIX | — | Số test ghi trong closeout |

**Exit criteria Phase 0:** mọi U-01…U-06 + U-09 + U-10 xanh; CI chạy được; scientific messaging vẫn grade C / no-edge trên first viewport.

**Risks:** siết prospective có thể làm CLI hiện tại fail — cập nhật tests/CLI cùng lúc.

---

### Phase 1 — Trustworthy Research Core (2–6 tuần)

**Mục tiêu:** Thí nghiệm truy vết end-to-end; prospective thật khi có `#01562+`.

| ID | Hạng mục | Action | Effort |
|---|---|---|---|
| U-12a | Trang/panel thí nghiệm: protocol, dataset hash, commit, predictions | EXTEND | M |
| U-12b | Badge RETROSPECTIVE / PROSPECTIVE PENDING / PROSPECTIVE SCORED | EXTEND | S |
| — | Prospective live append khi kỳ mới sync | EXTEND | M |
| — | Surface Control E/F summary trên Research (read-only) | EXTEND | M |
| U-14 | IndexedDB schema migrations | FIX | M |
| U-11 | Script/cron `data:sync` local (không giả browser daemon) | EXTEND | M |
| U-20 | Portfolio odds API an toàn kiểu | FIX | S |
| — | Optional: đối chiếu HAC/p với statsmodels oracle (script) | EXTEND | M |
| U-15 | Jackpot uncertainty copy | FIX | S |
| U-19 | Doc: power645 filename vs Mega 6/45 | FIX | S |

**Không kéo** MLflow + DVC cùng lúc (A+B đồng ý): dataset nhỏ → Git + manifest + registry đủ đến khi artifact phình.

**Exit criteria:** mọi metric UI truy về data/protocol/commit; prospective reject/pass có audit log; controls không chỉ CLI.

---

### Phase 2 — Product Experience (6–12 tuần)

**Mục tiêu:** Người không phải tác giả dùng được workflow nghiên cứu + coverage.

| ID | Hạng mục | Action | Học từ |
|---|---|---|---|
| U-12c | Data Explorer: tìm kỳ, khoảng ngày, export có metadata | EXTEND | Lottery Post, Vietlott Data site |
| U-16 | Coverage explorer: budget ↔ frontier ↔ caveat | EXTEND | dCode, Lotterycodex, DigitWheel |
| — | Unified narrative: Data → Backtest → Candidate → Coverage | EXTEND | — |
| U-07b | E2E browser: 3 tab, mobile, keyboard, update, offline, double-click | EXTEND | A checklist |
| U-13 | Clipboard toast/aria-live | FIX | — |
| — | Export/import experiment pack (CSV/JSON + hash) | EXTEND | MLflow artifact ý tưởng |
| — | Mobile table redesign | FIX | Lottography viz (không hot-tip framing) |

**Exit criteria:** E2E xanh desktop+mobile smoke; export round-trip giữ hash; không có rankingScore UI; không ngôn ngữ hứa thắng.

---

### Phase 3 — Commercial Readiness (có điều kiện; sau Phase 1)

**Mục tiêu:** Sản phẩm trả phí hợp pháp — **chỉ** coverage/budget/research tooling.

| ID | Hạng mục | Action | Gating |
|---|---|---|---|
| U-08 | Persistence ADR: stay local-only **hoặc** D1/R2 | EXTEND | Bắt buộc trước auth |
| — | Auth + private experiments | EXTEND | Sau ADR |
| — | Legal: Vietlott ToS, gambling marketing, LICENSE data reuse | FIX | Trước billing |
| — | Observability + support model | EXTEND | — |
| — | Billing cho coverage/budget tools | EXTEND | Cấm win-tips SKU |
| — | Power 6/55 | DEFER | Schema/law riêng; **không** đổi 45→55 |

**Exit criteria:** ADR shipped; legal review checklist; không SKU “dự đoán”; multi-device sync chỉ nếu chọn D1/R2.

---

## 6. Kế hoạch 30 / 60 / 90 ngày

### 30 ngày — Phase 0 gần hoàn tất
- U-01…U-06, U-09, U-10, U-17
- CI tối thiểu
- KPI: prospective bad-hash reject = 100%; offline IDB path PASS; LICENSE có; suggestion test PASS

### 60 ngày — Phase 1
- Experiment UI + badges
- Prospective live khi có draw mới
- Controls summary UI
- IDB migration + optional local sync script
- KPI: mọi artifact gắn protocolHash+datasetHash+gitCommit; 0 false PROSPECTIVE trên fixture adversarial

### 90 ngày — Phase 2 MVP
- Data Explorer + export
- Coverage explorer
- E2E browser suite
- KPI: E2E smoke xanh; time-to-understand “no edge” < 30s first viewport (checklist người dùng)

---

## 7. Keep / Fix / Extend / Do-not-build

| Module | Quyết định |
|---|---|
| Walk-forward, temporal split, Holm, alpha-spend, HAC, null model | **KEEP** |
| Official Vietlott pipeline, conflict fail-closed, manifest hash | **KEEP** |
| Negative controls A/B/C/E/F | **KEEP** → **EXTEND** lên UI |
| Projective portfolio + bao frontier | **KEEP** → **EXTEND** explorer |
| Prospective freeze/append | **FIX** gate rồi **EXTEND** ops |
| Experiment registry | **FIX** schema rồi **EXTEND** UI |
| rankingScore | **KEEP** stub; **DO_NOT_BUILD** UI |
| Hot/cold as predictions | **DO_NOT_BUILD** |
| Auto buy tickets / martingale / guaranteed profit | **DO_NOT_BUILD** |
| Silent conflict overwrite | **DO_NOT_BUILD** |
| Power 6/55 by renaming 45→55 | **DO_NOT_BUILD** |
| MLflow+DVC “for prestige” | **DO_NOT_BUILD** (chọn sau khi scale) |
| D1/R2 + auth + billing | **DEFER** đến Phase 3 sau ADR |
| LICENSE, suggestion window, offline order, redirect, API bounds | **FIX** ngay |

---

## 8. Competitive implications (A ∪ B)

| Học từ | Áp vào Lab | Không sao chép |
|---|---|---|
| vietlott-data | Crawl schedule / multi-product adapter ý tưởng | Coi mirror là authoritative |
| Lotterycodex / dCode | Giải thích covering có điều kiện + checker | Đóng kín / hứa guarantee tuyệt đối |
| Lottery Post | Drill-down lịch sử, lưu bộ lọc | Pick3/4 framing |
| Lottography / LotteryGuru | Viz tần suất đẹp | Hot/cold = dự đoán |
| DigitWheel / Wheel Any Lottery | UX wheel/budget | Prediction theater |
| IOI-LottoLab | Audit ledger trước/sau quay | Ngôn ngữ “production predictor” |
| MLflow / W&B / DVC / sklearn / statsmodels | Traceability, split, oracle thống kê | Stack nặng sớm |

**Moat giữ:** anti-leakage + multiple testing + HAC + controls + provenance + honesty UI.  
**Gap vá:** Explorer, experiment UX, covering productization, CI/E2E, legal license.

---

## 9. Open questions / recheck list

1. **R1** Build hang vs PASS — cần log CI đầy đủ.  
2. Hosted site private — E2E production **LIMITED BY ACCESS** đến khi có credential test.  
3. Có chọn **local-only forever** hay **D1** trong 1 ADR trước tháng 3?  
4. Prospective `#01562` pending — khi nào sync kỳ mới để append-result?  
5. Working tree Pha B (ablation/features/frontier) merge vào baseline trước Phase 0 hay song song?

---

## 10. Immediate next 3 actions

1. **FIX U-01** — Prospective binding (`protocolHash` ≡ lock, cutoff/freshness, adversarial tests).  
2. **FIX U-05 + U-09 + U-10** — Offline-first load, suggestion/TEST separation, LICENSE (ship nhanh, effort S).  
3. **FIX U-02/U-03/U-04 + CI** — Registry/API/redirect boundaries và workflow GitHub Actions (đóng Phase 0).

---

## Định nghĩa done (hợp nhất A+B)

- **Feature done:** hành vi user rõ, biên lỗi xử lý, test trong CI, docs khớp code.  
- **Algorithm edge done:** chỉ khi vượt đối chứng **cùng ngân sách** trên dữ liệu **ngoài mẫu thật** theo protocol **khóa trước** — unit xanh ≠ edge.  
- **Release done:** typecheck + test + lint + **build CI** + E2E smoke tối thiểu.

---

## Kết luận chiến lược

**CORRECT_THEN_CONTINUE.**

Lab đã có nền nghiên cứu đáng giữ và mạnh hơn hầu hết trang hot/cold về tính trung thực. Audit A chỉ ra lỗ hổng bảo đảm/ops mà audit B chưa đẩy đủ severity; audit B chỉ ra định vị sản phẩm, LICENSE và cạnh tranh. Lộ trình hợp nhất ưu tiên **khóa prospective + ranh giới dữ liệu/API + offline/CI**, rồi mới mở **Explorer/coverage UX**, và chỉ thương mại hóa **công cụ coverage/budget/research** — không bao giờ bán lời hứa trúng số.
