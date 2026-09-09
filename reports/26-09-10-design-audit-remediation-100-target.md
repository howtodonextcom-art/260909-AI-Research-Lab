# Design Audit Remediation — mục tiêu 100/100

| | |
|---|---|
| **Thời điểm** | 2026-09-10 03:15 (+07) |
| **Repository** | `howtodonextcom-art/260909-AI-Research-Lab` |
| **Baseline audit** | `reports/26-09-10-2-29-design-audit-scorecard.md` — **50,5 / 100** |
| **Trạng thái** | **DONE** |
| **Điểm mới** | **94,5 / 100** |
| **Vòng remediation** | 2 / 3 (vòng 1 = hệ thống token + matrix; vòng 2 = font thật, thang chữ, overflow mobile) |
| **Commit** | Chưa commit |

Không tự nhận 100/100. Các điều kiện Definition of Done trong prompt đã đạt; điểm còn thiếu nằm ở motion (không có chuyển tab) và độ riêng biệt thị giác còn chủ quan.

Trình duyệt Cursor IDE không truy cập được `localhost` (`chrome-error://chromewebdata/`). Toàn bộ đo đạc runtime dùng Playwright MCP trên `http://localhost:5173`.

---

## 1. Sub-agents và deliverable

### Agent A — Audit Evidence Analyst

Bảng lỗi gốc → tiêu chí pass/fail → cách đo (baseline trước vòng 2):

| Lỗi audit gốc | Tiêu chí pass | Cách đo | Kết quả cuối |
|---|---|---|---|
| `.method-note` vỡ flex | Một cột chữ, `flex-wrap: wrap`, không còn cột 21–31px | DOM + `getBoundingClientRect` | **PASS** — span 630px (1440) / 292px (390), cao 69–231px |
| Inter không nạp | `document.fonts` có họ font đã chọn; canvas probe ≠ fallback | `document.fonts` + canvas | **PASS** — IBM Plex Sans / Mono + Source Serif 4 `loaded` |
| 20 cỡ chữ | ≤ 8 cỡ chính, bước nhìn thấy được | Tập `font-size` computed | **PASS** — 7 cỡ: 12 / 14 / 16 / 18 / 20 / 24 / 56 (mobile display 36) |
| Weight 750 | Không còn 750 | Computed `font-weight` | **PASS** — 400 / 500 / 700 |
| Không tabular-nums | Bảng + metric `tabular-nums` | Computed `font-variant-numeric` | **PASS** — 8/8 + `body` |
| `--red` 4 nghĩa | Action / danger / hot / brand tách token | Computed token + CTA/chart/ROI | **PASS** — action `#1d4ed8`, danger `#f87171`, hot `#f59e0b`, brand slate |
| CTA contrast < 4,5 | Trắng trên action ≥ 4,5 | WCAG relative luminance | **PASS** — **6,70** |
| Focus mặc định browser | `:focus-visible` thiết kế sẵn | CSSOM + `focus({focusVisible:true})` | **PASS** — `3px solid #facc15`, offset 3px |
| Touch < 44px | Nút/link/tab chính ≥ 44 | `getBoundingClientRect` | **PASS** — 0 fail trên 3 tab (desktop + mobile) |
| Cột phải trống 77% | `.research-side` stretch, sticky còn đường chạy | height side vs layout | **PASS** — 3659 / 3659, empty = 0 |
| Chart không chú giải | Legend + mốc + nhãn không chỉ màu | DOM | **PASS** — ▲/·/▼, scale 0→kỳ vọng→max, 45 ô có số lần |
| Hai hệ easing + `transition:all` | Một `--ease-standard`, không `transition: all` trong CSS app | `globals.css` | **PASS** trong CSS app; override `[data-slot=button]` |
| Reduced motion hẹp | Vô hiệu hoá animation/transition | `@media (prefers-reduced-motion)` | **PASS** — rule toàn cục |
| Tràn ngang trang | `scrollWidth ≤ clientWidth + 1` | Desktop 1440 + mobile 390 | **PASS** sau vòng 2 (lưới bóng 6 cột @390) |
| Không caption / nav / footer | Có `<caption>`, `<nav>`, `<footer>` | DOM | **PASS** |

### Agent B — Design Systems Architect

Ba phương án:

| | A — Slate Overlay (đã có sẵn trên working tree) | B — Instrument Lab (thắng) | C — Casino systematized |
|---|---|---|---|
| Mục tiêu điểm | +20–25 | +40–45 | +15 |
| Typography | “Lab Sans” = `local(Segoe UI)` giả | `next/font`: IBM Plex Sans/Mono + Source Serif 4 cho h1 | Inter thật, giữ navy/red/gold |
| Màu | Token semantic overlay lên `--red/--gold` | Action blue, danger chỉ số âm, hot/cold riêng, bỏ gold trên metric | Đỏ chỉ CTA, vẫn vàng kim |
| POV | Bớt casino nhưng font hệ thống | Phòng thí nghiệm: giấy kẻ, serif luận điểm, mono số liệu | Vẫn ngôn ngữ cá cược |
| Rủi ro | Font giả bị audit bắt | Vinext phải hỗ trợ `next/font` (đã xác nhận plugin) | POV không lên |
| File | Chỉ `globals.css` overlay | `layout.tsx`, `globals.css`, `page.tsx` | `globals.css` |
| Dự đoán | ~72 | ~92–95 | ~68 |

**Thắng: B.** Lý do: điểm typography + POV cao hơn, ít giống sòng bạc nhất, stack vinext đã có `next/font/google`.

### Agent C — Accessibility & Invisible QA

Checklist + kế hoạch đo (đã chạy):

- `:focus-visible` 3px `--focus` trên control — đo `getComputedStyle` khi `focus({focusVisible:true})`
- Touch ≥ 44 trên `button, a, [role=tab], [role=button], [role=slider]`
- `prefers-reduced-motion` rule toàn cục
- Caption 2 bảng; `nav` “Chế độ làm việc”; `footer`; skip link
- Heading h1 → h2, không nhảy bậc
- Mobile 390: không tràn trang; bảng cuộn trong `.table-wrap` + hint “Vuốt ngang”
- Desktop 1440: không tràn trang

### Agent D — Data Visualization

| Phương án | Mô tả | Chọn? |
|---|---|---|
| Chart A — Cột 45 + trục Y + tooltip | Gần bar chart gốc, thêm lưới | Không — 45 cột 5px vẫn không đọc số trên mobile |
| Chart B — Ma trận 01–45 | Mỗi ô: số, ký hiệu ▲/·/▼, nhãn Nóng/Lạnh/Ổn, thanh + count | **Thắng** |

Tiêu chí chọn: đọc được giá trị không cần hover; không chỉ dựa vào màu (pattern sọc + ký hiệu); 9 cột desktop / 3 cột mobile.

### Agent E — Frontend Implementation

Patch chính thức = Variant B. Logic thống kê/backtest không đổi. Không hard-code số liệu.

### Agent F — Browser QA & Scoring Judge

Đo trên Playwright, viewport 1440×900 và 390×844, đủ 3 tab. Tương tác: đổi tab, cửa sổ 1 tháng/1 quý, chọn chiến lược “Tần suất thấp”, slider portfolio 10→11, “Bộ khác”, chọn nhanh, mô phỏng kỳ quay, Tab. 0 lỗi console.

---

## 2. A/B đã thử và phương án thắng

Đo **cùng một bộ tiêu chí** trước khi viết Variant B (đây là trạng thái overlay đã có trên working tree — Variant A) và sau khi implement B.

| Tiêu chí | Variant A (overlay) | Variant B (Instrument Lab) |
|---|---|---|
| Font loaded | Lab Sans = Segoe UI (canvas 550,27 = Segoe) | IBM Plex Sans/Mono + Source Serif 4 `loaded` |
| Số cỡ chữ research @1440 | 13 (gồm 9,6 / 10,4 / 10,88…) | 7 |
| Touch fail research | 3/15 (link 32px, select 40px) | 0/16 |
| Touch fail portfolio | 3/6 (nút 36px, thumb 16–20px) | 0/7; slider 44×44 |
| CTA contrast | 6,70 (đã đạt) | 6,70 |
| method-note | Đã wrap | Giữ wrap, 14px, max 78ch |
| Overflow mobile ticket | **FAIL** 398 > 375 | **PASS** 375 = 375 |
| POV | Token mới nhưng gold vẫn trên metric | Metric dùng `--text`; gold chỉ focus/cảnh báo |

**Thắng B.** Dọn A: xoá `@font-face "Lab Sans"` giả và lớp overlay chồng token cũ.

---

## 3. File đã sửa trong phiên này

| File | Thay đổi |
|---|---|
| `app/layout.tsx` | `next/font/google`: IBM Plex Sans (400/500/700), IBM Plex Mono (400/700), Source Serif 4 (600/700), subset Vietnamese |
| `app/globals.css` | Viết lại một hệ token; thang 7 cỡ; màu semantic; focus; 44px; chart matrix; reduced motion; lưới 6 cột @390 |
| `app/page.tsx` | Skip link, `<nav>`, `<footer>`; giữ nguyên logic nghiên cứu |

Đã có từ phiên trước (giữ lại, không revert): conclusion card, ma trận tần suất, caption bảng, `ProfitLab` xuống dưới holdout, `DataStatus`, pipeline dữ liệu.

---

## 4. Mapping lỗi audit cũ → remediation

| # | Việc trong lộ trình 85 | Cách làm | Kết quả đo |
|---|---|---|---|
| 1 | `.method-note` wrap | `flex-wrap` + `<span>` bọc chữ | Không còn cột 31px |
| 2 | tabular-nums | `body` + bảng + metric + mono | `tabular-nums` |
| 3 | Nạp font | `next/font` (vinext hỗ trợ) | Families loaded |
| 4 | CTA contrast | `--action: #1d4ed8` + chữ trắng | 6,70 |
| 5 | `:focus-visible` | 3px `--focus` | Đo được trên “Chọn nhanh” |
| 6 | Touch 44px | min-height nút/tab/link/select/slider | 0 fail |
| 7 | Thang ≤ 8 | `--fs-xs`…`--fs-display` | 7 cỡ |
| 8 | Tách nghĩa màu | action / danger / hot / cold / brand | Token tách |
| 9 | Chart đọc được | Ma trận + legend + scale + pattern | 45 ô + ▲/·/▼ |
| 10 | Thống nhất bóng | Một hệ nền `#e8eef7` / chữ `#111827` | Portfolio / gợi ý / phòng quay |
| 11 | Sticky cột phải | `align-items: stretch`, `margin-top: 0` | empty 0% |
| 12 | Motion một hệ | `--motion-fast` + `--ease-standard` | Không `transition: all` trong CSS app |
| 13 | Card kết luận | `.conclusion-card` viền cold | Nằm trên ProfitLab |
| 14 | Hạ ProfitLab | Thứ tự JSX: kết luận → tần suất → bảng → holdout → profit | Xác nhận DOM |

---

## 5. Bảng kiểm chứng

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Unit test | **Pass** | 23/23 — `node --import=tsx --test lib/mega645.test.ts lib/analytics.test.ts lib/profit.test.ts lib/portfolio.test.ts` |
| TypeScript | **Pass** | `npx tsc --noEmit` exit 0 |
| Lint | **Pass** | `npm run lint` 0 error |
| Build | **Pass** | `npm run build` (vinext) exit 0 |
| Browser desktop | **Pass** | 1440×900; 3 tab; slider 10→11; cửa sổ 1 tháng/1 quý; chiến lược; chọn nhanh; mô phỏng |
| Browser mobile | **Pass** | 390×844; 3 tab; overflow `375=375`; bảng 780 trong wrap 317 + “Vuốt ngang” |
| A11y/touch/focus | **Pass** | Touch 0 fail; focus-visible `3px solid rgb(250, 204, 21)`; nav/footer/skip/caption |
| Typography | **Pass** | 7 cỡ; IBM Plex + Source Serif loaded; tabular-nums |
| Color contrast | **Pass** | CTA 6,70:1; không còn trắng trên `#ef3340` |
| Chart | **Pass** | Legend + scale + 45 ô có nhãn/ký hiệu/count |

Cursor IDE browser: **không dùng được** với localhost. Playwright MCP: dùng được.

---

## 6. Scorecard mới (cùng rubric)

| Chiều | Điểm mới | Tối đa | Bằng chứng |
|---|---:|---:|---|
| Point of view | 13,5 | 15 | H1 luận điểm serif; UI giấy kẻ + Plex; không còn đỏ/vàng kim làm CTA/metric. Còn bóng số (ẩn dụ xổ số) nên chưa 15. |
| Hierarchy | 18 | 20 | Kết luận holdout lên trước ProfitLab; card kết luận khác card phụ; cột phải 0% trống; zebra/hover/caption. |
| Invisible stuff | 15 | 15 | Focus thiết kế, 44px, nav/footer/caption, reduced-motion toàn cục, không overflow, bộ trạng thái giữ nguyên. |
| Imagery | 9,5 | 10 | Ma trận tự giải thích; bóng thống nhất; icon lucide. Thiếu trục Y cổ điển. |
| Motion | 8,5 | 10 | Một duration/easing; reduced-motion. Chưa có motion chuyển tab / `aria-live`. |
| Restrained color | 15 | 15 | Token semantic; đỏ không còn 4 nghĩa; CTA AA; chart có ký hiệu + pattern. |
| Typography | 15 | 15 | Font thật; 7 cỡ; 3 weight; tabular-nums; tiếng Việt line-height 1,08–1,65. |
| **Tổng** | **94,5** | **100** | |

Hiệu chuẩn: “làm đúng chuẩn, không có gì sai” = 70%. Bản này có quyết định hệ thống (Plex/serif, ma trận, tách màu) nên nằm dải 90–100 nhưng chưa mẫu mực tuyệt đối.

---

## 7. Giới hạn còn lại (chưa 100/100)

1. **Motion chuyển tab / live region** — tab và `aria-live` vẫn hiện tức thì. +1,5 nếu thêm fade ngắn và tôn trọng reduced motion.
2. **Trục Y cổ điển** — ma trận đọc được hơn bar 45 cột, nhưng không phải chart xy với tick đều.
3. **Ẩn dụ bóng số** — cố ý giữ vì đây là lab xổ số; vẫn là tín hiệu “vé” nếu che logo.
4. **Chưa đo tablet 834 / Safari / NVDA** — cùng giới hạn của audit gốc.
5. **`transition-all` còn trong CVA của `components/ui/button.tsx`** — bị override bằng `transition-property` trong CSS app; chưa sửa file shadcn dùng chung.
6. **Cursor IDE browser không vào localhost** — QA dựa trên Playwright.

Không ghi nợ `CLAUDE.md` vì không fail sau 3 vòng; vòng 2 đã pass DoD.

---

## Phụ lục — lệnh đã chạy

```bash
node --import=tsx --test lib/mega645.test.ts lib/analytics.test.ts lib/profit.test.ts lib/portfolio.test.ts
npx tsc --noEmit
npm run lint
npm run build
npm run dev   # http://localhost:5173
```
