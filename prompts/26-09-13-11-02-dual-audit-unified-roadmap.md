# MASTER PROMPT — Dual-Audit Reconciliation & Full Product Roadmap
# Mega 6/45 AI Research Lab

## 0. Vai trò

Bạn là nhóm hợp nhất gồm:
- Principal Product Manager
- Staff Engineer / Architect
- Statistical Research Auditor
- Security & Data Pipeline Reviewer
- Competitive Strategy Lead

Nhiệm vụ: **đọc, đối chiếu, hợp nhất** hai báo cáo audit độc lập, rồi xuất **một lộ trình phát triển đầy đủ** từ Research MVP → Trusted Research Core → Product Experience → Commercial Readiness.

Đây là nhiệm vụ **phân tích & lập kế hoạch**. Không sửa code, không commit/push/deploy, không mở PR trừ khi user yêu cầu riêng sau.

---

## 1. Nguồn bắt buộc (SOURCE OF TRUTH)

Đọc toàn bộ và trích dẫn theo ID section:

| ID | File |
|----|------|
| A | `reports/AI-Research-Lab-Audit.md` |
| B | `reports/26-09-13-10-49-product-architecture-competitive-audit.md` |

**Repo context (không được bỏ qua):**
- Repo: `D:\2026\260909-AI-Research Lab`
- Commit audit chung: `058f3162c3fdfbc0883eab96e7be7ecd0b93dcbf`
- Product stage đồng thuận dự kiến: RESEARCH_MVP; scientific grade **C — NO DEMONSTRATED EDGE**
- Không dùng báo cáo tự chấm điểm cũ trong repo làm bằng chứng đạt chuẩn nếu mâu thuẫn với A/B.

Nếu cần làm rõ mâu thuẫn kỹ thuật (ví dụ build PASS vs build chưa verify), được **grep/read source tối thiểu** để phân loại:
- `AGREED_FACT`
- `CONFLICT_NEEDS_RECHECK`
- `A_ONLY`
- `B_ONLY`
- `OUTDATED_RELATIVE_TO_WORKING_TREE`

Không viết code fix trong lần chạy này.

---

## 2. Mục tiêu đầu ra

Tạo **một báo cáo lộ trình hợp nhất** tại:

`reports/<yy-mm-dd-hh-mm>-unified-roadmap-from-dual-audit.md`

Và (khuyến nghị) một canvas tóm tắt ưu tiên nếu môi trường hỗ trợ.

Báo cáo phải trả lời trực tiếp:
1. Hai audit đồng ý điều gì?
2. Hai audit mâu thuẫn điều gì, và bên nào có bằng chứng mạnh hơn?
3. Backlog thống nhất P0→P3 là gì?
4. Lộ trình đầy đủ Phase 0→3 (nghiên cứu → sản phẩm → thương mại) ra sao?
5. Việc nào KEEP / FIX / EXTEND / DEFER / DO_NOT_BUILD?
6. Ba việc làm ngay tuần này là gì?
7. Những việc tuyệt đối không làm?

---

## 3. Nguyên tắc hợp nhất

### 3.1. Trung thực thống kê (bắt buộc)
- Không đề xuất tính năng “tăng khả năng trúng” hoặc ML chỉ vì tên AI.
- Edge chỉ được tuyên khi có prospective ngoài mẫu + cùng ngân sách + protocol khóa trước.
- Coverage ≠ edge; payout ≠ net profit; retrospective ≠ prospective.

### 3.2. Severity hợp nhất
Dùng thang:
- `P0` — phá vỡ tính trung thực khoa học / mất dữ liệu / lỗ hổng bảo đảm prospective / false claim
- `P1` — integrity vận hành, security boundary, build/release gate, offline trust, registry correctness
- `P2` — UX gây hiểu nhầm, docs, license, a11y/E2E gaps, competitive UX lag
- `P3` — cleanup, naming, polish

**Quy tắc nâng hạng:** Nếu A gắn P0/P1 cho lỗ hổng bảo đảm (prospective gate, registry parse, refresh API, redirect, offline cache) thì **không được hạ xuống P3** chỉ vì B không liệt kê.

**Quy tắc hòa giải runtime:**
- Nếu A nói build chưa verify và B nói build PASS → ghi `CONFLICT_NEEDS_RECHECK`, đề xuất acceptance “build sạch trên CI với timeout + log”, không tuyên PASS tuyệt đối.
- Nếu B nói test 288 và A nói 260 → ghi khác biệt working tree / thời điểm audit; roadmap phải gồm “đóng băng baseline test count trên commit sạch”.

### 3.3. Dedup findings
Mỗi finding hợp nhất có ID `U-01, U-02…` và map về:
- nguồn A (section/heading)
- nguồn B (F-xx hoặc section)
- status: AGREED / A_ONLY / B_ONLY / CONFLICT

---

## 4. Việc phải làm theo thứ tự

### Bước 1 — Executive reconciliation
### Bước 2 — Diff findings matrix (A P0/P1 + B F-xx bắt buộc có mặt)
### Bước 3 — Unified backlog U-xx
### Bước 4 — Priority Score Top 15
### Bước 5 — Full roadmap Phase 0–3
### Bước 6 — Positioning & DO_NOT_BUILD
### Bước 7 — 30/60/90 day plan

---

## 5. Định dạng báo cáo bắt buộc

```text
# Unified Roadmap — Dual Audit Reconciliation
## 1. Executive verdict (hợp nhất)
## 2. Agreement / Conflict matrix
## 3. Unified findings (U-xx)
## 4. Priority-scored backlog (Top 15)
## 5. Full roadmap Phase 0–3
## 6. 30/60/90 plan
## 7. Keep / Fix / Extend / Do-not-build
## 8. Competitive implications
## 9. Open questions / recheck list
## 10. Immediate next 3 actions
```

Ngôn ngữ: **Tiếng Việt** (thuật ngữ kỹ thuật giữ English khi chuẩn).

## 6. Kickoff

Bắt đầu ngay khi nhận OK từ user.
