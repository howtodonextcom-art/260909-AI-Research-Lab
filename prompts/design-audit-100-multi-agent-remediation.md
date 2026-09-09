# Master Prompt — Multi-Agent Design Audit Remediation

Bạn là AI Coding Orchestrator cấp cao, có quyền tự chủ tối đa trong repo hiện tại. Nhiệm vụ: nâng cấp thiết kế Mega 6/45 Research Lab từ báo cáo `reports/26-09-10-2-29-design-audit-scorecard.md` lên điểm cao nhất có thể, mục tiêu 100/100, bằng quy trình đa tác nhân: lên ý tưởng -> kiểm chứng ý tưởng -> A/B Testing -> chọn phương án mạnh nhất -> code -> test bằng browser MCP -> audit lại.

Không hỏi human trừ khi:

- thiếu credential bắt buộc;
- thao tác sẽ phá hủy dữ liệu;
- cần thanh toán/billing/deploy production;
- bị chặn bởi quyền truy cập ngoài repo.

Không được đoán mò qua codebase. Mọi kết luận phải dựa trên:

- đọc source thật;
- chạy app thật;
- đo computed styles/DOM/browser thật qua MCP;
- test/build/lint/typecheck thật;
- báo cáo audit thật.

## 0. Quyền thực thi và giới hạn

- Được tự động cài dependency theo lockfile.
- Được sửa code, CSS, component, README/report.
- Được chạy local dev server.
- Được dùng MCP/browser để mở app, kiểm tra desktop/mobile, đo DOM/computed styles.
- Được chạy test, lint, typecheck, build nhiều lần.
- Không commit/push/deploy trừ khi user yêu cầu riêng.
- Không được khai báo DONE nếu chưa chứng minh bằng test + browser QA.
- Tối đa 3 vòng remediation đầy đủ. Nếu sau 3 vòng vẫn fail, phải ghi nợ kỹ thuật vào `CLAUDE.md`.

## 1. Bắt buộc dùng tối thiểu 5 sub-agents

Hãy tạo và điều phối ít nhất 5 sub-agents độc lập. Nếu môi trường có multi-agent tool, phải dùng tool đó. Nếu không có tool, phải mô phỏng rõ ràng bằng 5 vai trò riêng biệt, mỗi vai trò có phân tích, đề xuất và tiêu chí kiểm chứng riêng.

### Sub-agent A — Audit Evidence Analyst

Nhiệm vụ:

- Đọc `reports/26-09-10-2-29-design-audit-scorecard.md`.
- Trích toàn bộ lỗi, điểm mất, tiêu chí đo và quick wins.
- Chuyển audit thành checklist nghiệm thu có thể đo được.
- Không đề xuất giải pháp trước khi mapping đủ lỗi.

Deliverable:

- Bảng lỗi -> tiêu chí pass/fail -> cách đo.

### Sub-agent B — Design Systems Architect

Nhiệm vụ:

- Đề xuất hệ typography, spacing, radius, color token, elevation, motion token.
- Tách nghĩa màu: brand/action/risk/success/hot/cold/neutral.
- Đảm bảo sản phẩm trông như "analytical research lab", không giống casino/cá cược.
- Đưa ra ít nhất 2 phương án thiết kế hệ thống.

Deliverable:

- Design option A/B/C, ưu/nhược, rủi ro, dự đoán điểm.

### Sub-agent C — Accessibility & Invisible QA Specialist

Nhiệm vụ:

- Kiểm tra focus-visible, touch targets, reduced motion, table captions, screen reader semantics.
- Đề xuất remediation cho mobile 390px, desktop 1440px, tablet nếu khả thi.
- Định nghĩa script/browser measurements để xác nhận.

Deliverable:

- A11y checklist + measurement plan.

### Sub-agent D — Data Visualization Specialist

Nhiệm vụ:

- Thiết kế lại frequency chart để đọc được: legend, grid/tick, hot/cold/neutral, labels/tooltip/title.
- Không phụ thuộc duy nhất vào màu.
- Không làm nặng render hoặc phá responsive.

Deliverable:

- Chart proposal A/B, tiêu chí chọn, cách đo.

### Sub-agent E — Frontend Implementation Engineer

Nhiệm vụ:

- Đọc source thật: `app/page.tsx`, `app/globals.css`, `app/layout.tsx`, `components/*`, UI components liên quan.
- Triển khai phương án được chọn.
- Giữ logic thống kê/backtest nguyên vẹn trừ khi cần sửa UI data contract.
- Không hard-code số liệu để qua test.

Deliverable:

- Patch code tối thiểu nhưng đủ hoàn chỉnh.

### Sub-agent F — Browser QA & Scoring Judge

Nhiệm vụ:

- Mở app qua MCP browser.
- Kiểm tra 3 tab: Portfolio 4+, Nghiên cứu, Vé mô phỏng.
- Đo desktop 1440px và mobile 390px.
- Chạy script đo:
  - số font sizes;
  - font loaded;
  - contrast;
  - touch target;
  - focus-visible;
  - tabular nums;
  - horizontal overflow;
  - reduced motion;
  - chart legend/axis;
  - method-note regression.
- Tự chấm lại theo rubric cũ.

Deliverable:

- Scorecard mới và bằng chứng đo.

## 2. Quy trình bắt buộc

### Phase 1 — Baseline thật

1. Đọc audit report hiện tại.
2. Đọc source liên quan.
3. Chạy:

```bash
npm run install:ci
node --import=tsx --test lib/mega645.test.ts lib/analytics.test.ts lib/profit.test.ts lib/portfolio.test.ts
npx tsc --noEmit
npm run lint
npm run build
```

4. Start local dev server.
5. Mở app bằng MCP browser.
6. Đo lại baseline tối thiểu ở desktop 1440px và mobile 390px.
7. Không code trước khi có baseline.

### Phase 2 — Lên ý tưởng

Mỗi sub-agent B/C/D phải đưa ra ít nhất 2 phương án.

Mỗi phương án phải có:

- Mục tiêu điểm cải thiện;
- rủi ro;
- file dự kiến sửa;
- cách kiểm chứng bằng browser;
- tác động tới point of view sản phẩm.

Không được chọn phương án chỉ vì dễ code.

### Phase 3 — Kiểm chứng ý tưởng

Trước khi code chính thức:

- So sánh các phương án bằng ma trận:
  - Typography score impact
  - Color score impact
  - Hierarchy score impact
  - A11y score impact
  - Motion score impact
  - Implementation risk
  - Maintainability
  - Casino-risk reduction
- Dùng evidence từ code/browser baseline.
- Chọn 2 phương án mạnh nhất để A/B.

### Phase 4 — A/B Testing

Thực hiện A/B ở mức an toàn, không phá app:

- Có thể tạo prototype CSS variant tạm, feature flag local, branch-in-memory hoặc patch tuần tự.
- Mỗi variant phải được kiểm qua browser MCP.
- Đo cùng một bộ tiêu chí ở desktop/mobile.
- Ghi rõ vì sao chọn variant thắng.
- Sau khi chọn, dọn variant thua, không để code chết.

Tiêu chí thắng:

- Điểm audit dự kiến cao nhất;
- ít rủi ro regression;
- dễ bảo trì;
- ít giống casino nhất;
- không làm giảm usability.

### Phase 5 — Code chính thức

Bắt buộc xử lý các lỗi trong audit:

#### Typography

- Load font thật bằng cơ chế phù hợp, ưu tiên `next/font` nếu stack hỗ trợ.
- Giảm số font-size xuống thang có hệ thống, mục tiêu <= 8 cỡ chính.
- Loại bỏ weight lạc loài `750`.
- Dùng `font-variant-numeric: tabular-nums` cho bảng, metrics, odds, ROI, money, date/id.
- Bảo đảm tiếng Việt dễ đọc, không line-height quá chặt.

#### Color

- Tạo token màu semantic rõ ràng.
- `--red` không còn mang 4 nghĩa.
- CTA đạt contrast AA.
- Negative/risk/action/hot/cold không nhập nhằng.
- Chart không chỉ dựa vào màu.

#### Hierarchy

- Đưa kết luận nghiên cứu/backtest/holdout lên nổi bật hơn phần profit.
- Tạo card kết luận chính khác card phụ.
- Sửa cột phải/sticky để không bỏ trống 77%.
- Bảng có zebra/hover/focus/selected hoặc neo thị giác tương đương.
- Mobile table có dấu hiệu cuộn ngang.

#### Invisible / A11y

- Sửa `.method-note` regression.
- Touch target mobile chính >= 44px.
- Thiết kế `:focus-visible` rõ và nhất quán.
- Thêm caption/accessible description cho bảng.
- Giữ heading order tốt.
- Mở rộng `prefers-reduced-motion`.
- Không horizontal overflow cấp page.

#### Imagery / Chart

- Frequency chart có legend, axis/ticks hoặc grid, nhãn/mốc đọc được.
- Hot/cold/neutral có ký hiệu hoặc label ngoài màu.
- Ball number system thống nhất hơn.

#### Motion

- Một hệ duration/easing.
- Không dùng `transition: all`.
- Reduced motion vô hiệu hóa motion không cần thiết.

## 3. Test và browser QA

Sau code, chạy:

```bash
node --import=tsx --test lib/mega645.test.ts lib/analytics.test.ts lib/profit.test.ts lib/portfolio.test.ts
npx tsc --noEmit
npm run lint
npm run build
```

Sau đó dùng MCP browser:

- Mở local app.
- Kiểm 1440px.
- Kiểm 390px.
- Kiểm đủ 3 tab.
- Tương tác:
  - đổi tab;
  - đổi window 30D/90D/365D/ALL;
  - chọn strategy;
  - chỉnh portfolio slider;
  - randomize portfolio;
  - chọn vé mô phỏng;
  - quick pick;
  - simulate draw;
  - keyboard tab focus.
- Đo bằng script trong browser, không chỉ nhìn bằng mắt.

## 4. Quy tắc 3 vòng remediation

Nếu bất kỳ hạng mục nào fail:

1. Phân tích nguyên nhân.
2. Sửa.
3. Chạy lại test/build/browser QA.

Tối đa 3 vòng.

Nếu sau vòng 3 vẫn fail:

- Không được ghi DONE.
- Tạo hoặc cập nhật `CLAUDE.md`.
- Ghi rõ:
  - ngày giờ;
  - mục tiêu fail;
  - bằng chứng fail;
  - lệnh đã chạy;
  - giả thuyết nguyên nhân;
  - việc còn nợ;
  - đề xuất bước tiếp theo.
- Final status phải là `PARTIAL` hoặc `FAILED`.

## 5. Báo cáo cuối bắt buộc

Tạo file mới trong `reports/`, ví dụ:

`reports/26-09-10-design-audit-remediation-100-target.md`

Nội dung gồm:

1. Trạng thái: `DONE`, `PARTIAL`, `FAILED`, hoặc `BLOCKED`
2. Sub-agents đã dùng và deliverable của từng agent
3. A/B options đã thử và phương án thắng
4. File đã sửa
5. Mapping lỗi audit cũ -> remediation
6. Bảng kiểm chứng:

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Unit test | Pass/Fail | số test |
| TypeScript | Pass/Fail | lệnh |
| Lint | Pass/Fail | lệnh |
| Build | Pass/Fail | lệnh |
| Browser desktop | Pass/Fail | viewport + flow |
| Browser mobile | Pass/Fail | viewport + flow |
| A11y/touch/focus | Pass/Fail | số đo |
| Typography | Pass/Fail | số font sizes + font loaded |
| Color contrast | Pass/Fail | tỷ lệ |
| Chart | Pass/Fail | legend/axis/labels |

7. Scorecard mới theo rubric cũ:

| Chiều | Điểm mới | Tối đa | Bằng chứng |
|---|---:|---:|---|
| Point of view | /15 | 15 | |
| Hierarchy | /20 | 20 | |
| Invisible stuff | /15 | 15 | |
| Imagery | /10 | 10 | |
| Motion | /10 | 10 | |
| Restrained color | /15 | 15 | |
| Typography | /15 | 15 | |

8. Giới hạn còn lại nếu chưa đạt 100/100.

## 6. Definition of Done

Chỉ được ghi `DONE` nếu tất cả điều kiện sau đúng:

- Unit tests pass.
- TypeScript pass.
- Lint pass.
- Build pass.
- Browser MCP kiểm đủ 3 tab ở desktop/mobile.
- `.method-note` không còn vỡ.
- Font thật sự loaded hoặc có quyết định font khác được chứng minh.
- Font-size scale có hệ thống, không còn 20 cỡ rời rạc.
- Tabular nums hoạt động.
- CTA contrast đạt AA.
- Focus-visible rõ.
- Touch target chính mobile đạt 44px.
- Màu semantic rõ, không còn đỏ mang 4 nghĩa.
- Chart có legend/trục/mốc đọc được.
- Motion thống nhất, reduced motion hoạt động.
- Không page-level horizontal overflow.
- Báo cáo remediation đã tạo.
- Không còn lỗi blocker trong phạm vi audit.

Nếu không đạt, phải ghi `PARTIAL` hoặc `FAILED`, không được tự nhận 100/100.
