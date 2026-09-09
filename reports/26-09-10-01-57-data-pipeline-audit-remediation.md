# Data Pipeline & Audit Remediation — Mega 6/45 Research Lab

| | |
|---|---|
| **Thời điểm** | 2026-09-10 01:57 (+07) · 2026-09-09T18:57Z |
| **Repository** | `howtodonextcom-art/260909-AI-Research-Lab` |
| **Branch / HEAD lúc bắt đầu** | `main` @ `3e6ea3f` |
| **Trạng thái** | **DONE** |
| **Commit** | Chưa commit — thay đổi nằm ở working tree |

## Phạm vi phiên làm việc

1. Sửa 4 finding P1/P2 từ đợt kiểm toán codebase trước đó.
2. Xây pipeline lấy toàn bộ dữ liệu kết quả Mega 6/45 về local, hỗ trợ cập nhật tăng dần.
3. Thêm nút **Cập nhật dữ liệu** và cơ chế tự kiểm tra dữ liệu mới trên giao diện.
4. Bảo đảm ứng dụng vẫn dùng được bằng dữ liệu hợp lệ gần nhất khi mất mạng.

---

## 1. Kết quả

| Hạng mục | Giá trị |
|---|---|
| Tổng số kỳ trước cập nhật | 1.362 |
| Tổng số kỳ sau cập nhật | 1.362 (nguồn chưa có kỳ mới) |
| Ngày kỳ mới nhất | 06/09/2026 (#01559) |
| Nguồn dữ liệu | `vietvudanh/vietlott-data` (MIT) qua `raw.githubusercontent.com` |
| Cập nhật gần nhất | 2026-09-09T18:31:31Z (CLI) · 01:46:25 10/9 (browser, IndexedDB) |
| SHA-256 dataset | `6410e30d0c4224fb2f319a765ec38429f8e476d8217765edfe2cba3ac7b23c38` |

---

## 2. Audit findings đã sửa

| Finding | Trước | Sau | Test chứng minh |
|---|---|---|---|
| Executable permission | `100644` cả 3 file `.sh` | `100755`, xác minh bằng `git ls-files -s` | Clean install `rm -rf node_modules && npm run install:ci` → exit 0 |
| Holdout leakage | `strongest` = xếp hạng ROI trên **toàn bộ** lịch sử (gồm cả test) rồi hiển thị làm "Ứng viên mạnh nhất" | `selectCandidate()` chỉ đọc validation, yêu cầu edge > 0 **và** adjusted p ≤ alpha; không đạt → "Chưa có ứng viên đủ bằng chứng" | `thay đổi toàn bộ tập test không làm đổi ứng viên được chọn` · `ứng viên chỉ đến từ validation và phải vượt ngưỡng alpha` |
| Dead `VERIFIED` state | Kiểu khai báo 3 trạng thái, `VERIFIED` không bao giờ gán được → ô UI vĩnh viễn `0/3` | Bỏ hẳn tri-state; thay bằng `gates {significant, stableAcrossHalves, outperformsRandomPayout, passedCount}` — đo thật | `kết quả backtest báo cáo cổng sàng lọc thay vì verdict không thể đạt` |
| Phase naming | `TRAIN` (nhưng không huấn luyện gì) | `DEVELOPMENT`, nhãn "Test (retrospective)", thêm `PROTOCOL_VERSION` và ghi rõ đây là chia hồi cứu | `pipeline development-validation-test chia theo thời gian…` |

### Hai lỗi phát sinh ngoài danh sách, phát hiện trong lúc làm

**`tsx` chưa được khai báo.** `tsx@4.22.1` có trong `node_modules` và lockfile nhưng không có trong `package.json` — lệnh test ghi trong README phụ thuộc vào một package transitive tình cờ có mặt. Đã thêm vào `devDependencies`; lockfile chỉ đổi 1 dòng.

**CORS preflight.** Xem mục 5.

---

## 3. Data pipeline

| Thành phần | Triển khai |
|---|---|
| Adapter | `VietlottDataAdapter` — allowlist host, timeout 20s, cap 32 MB đọc theo stream, 3 lần thử với backoff, ngưỡng tối thiểu 100 bản ghi để bắt upstream đổi schema |
| Canonical schema | Giữ nguyên shape upstream (`date/id/result/process_time`); provenance nằm ở manifest. Validate: id không rỗng, ngày **tồn tại trên lịch**, đúng 6 số nguyên phân biệt 1–45, sort tăng dần |
| Incremental update | ETag/`If-None-Match` phía CLI → 304. Sync lần 2 cho `added=0`, hash không đổi |
| Conflict handling | Cùng mã kỳ khác kết quả → **không bao giờ ghi đè**, exit code ≠ 0, liệt kê chi tiết |
| Atomic persistence | Ghi file tạm → `rename`; dataset trước, manifest sau; xoá file tạm cả khi lỗi |
| Manifest | Mọi trường tính từ dữ liệu; tách `lastAttemptedSync` / `lastSuccessfulSync` |
| Browser cache | IndexedDB, mọi thao tác degrade thành no-op thay vì throw; đọc ra vẫn re-validate từng bản ghi |
| Manual update | Nút "Cập nhật dữ liệu" + `aria-live`, chống double-click, có loading/success/error state |
| Auto update | TTL 12h khai báo một chỗ (`DATA_REFRESH_TTL_MS`), không chặn render, single-flight, `AbortController` |

### Quyết định kiến trúc: không xây API proxy

Nguồn trả `Access-Control-Allow-Origin: *` nên browser gọi trực tiếp được. Yêu cầu ban đầu chỉ đòi proxy khi CORS chặn. Hệ quả của việc bỏ proxy:

- không có endpoint nào nhận URL từ client → **không có bề mặt SSRF phía máy chủ**;
- không đụng tới filesystem của Cloudflare Worker;
- ít hạ tầng hơn cho cùng một kết quả.

---

## 4. File thay đổi

| File | Thay đổi | Lý do |
|---|---|---|
| `scripts/*.sh` (3) | mode → `100755` | B1 |
| `lib/analytics.ts` | Bỏ `verdict` tri-state → `gates`; thêm `selectCandidate`, `PROTOCOL_VERSION`, `SELECTION_RULE`; `TRAIN`→`DEVELOPMENT` | B2, B3, B4 |
| `lib/analytics.test.ts` | +4 test regression | Khoá B2/B3/B4 |
| `app/page.tsx` | Dùng `useDrawData`; bỏ xếp hạng ROI; bảng toàn lịch sử dán nhãn "thống kê mô tả"; sidebar theo candidate | B2, B3 |
| `app/globals.css` | Style panel dữ liệu, tôn trọng `prefers-reduced-motion` | UI mới |
| `lib/data/**` (12 file) | Toàn bộ pipeline | Mục 6–9 của prompt |
| `lib/data/*.test.ts` (5 file) | 60 test | Mục 14 |
| `scripts/data-*.ts` (4 file) | CLI sync/check/status/verify-live | Mục 9 |
| `hooks/use-draw-data.ts`, `components/data-status.tsx` | Nạp dữ liệu + UI cập nhật | Mục 11, 12 |
| `public/data/power645.manifest.json` | Manifest sinh tự động | Mục 10 |
| `test/fixtures/*.jsonl` (4) | valid/duplicate/conflict/invalid | Mục 14 |
| `package.json` | +7 script, khai báo `tsx` | Mục 17 |
| `README.md` | Pipeline, lệnh, giới hạn, khôi phục, nguyên tắc prospective | Mục 17 |
| `.gitignore` | Bỏ qua artifact browser automation | Vệ sinh |

`public/data/power645.jsonl` **không đổi một byte nào** — serializer canonical tái tạo đúng bằng upstream (`git diff` trống).

---

## 5. Kiểm chứng

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Data unit tests | **PASS** | 60/60 — `npm run data:test` |
| Data integration tests | **PASS** | Trong 60 trên: empty→full, added=0, added=1, conflict, lỗi mạng, timeout, 304, schema đổi, snapshot hỏng, atomic không để lại `.tmp` |
| Existing business tests | **PASS** | 23/23 (19 gốc + 4 mới), không test cũ nào bị bỏ |
| TypeScript | **PASS** | `npx tsc --noEmit` sạch |
| Lint | **PASS** | 0 error, 0 warning |
| Production build | **PASS** | `npm run build` exit 0, sau clean install |
| Clean install | **PASS** | `rm -rf node_modules && npm run install:ci` → 675 packages, exit 0 |
| Runtime | **PASS** | Playwright: panel hiện 1.362 kỳ / #01559; bấm nút → "Dữ liệu đã là phiên bản mới nhất"; **0 console error** |
| Offline fallback | **PASS (quan sát thật)** | Khi request lỗi, UI báo "Ứng dụng đang sử dụng bộ dữ liệu hợp lệ gần nhất", dữ liệu 1.362 kỳ nguyên vẹn |
| Browser cache round-trip | **PASS** | Tải lại trang → "Đang đọc từ: bộ nhớ trên thiết bị", timestamp `01:46:25` khác manifest file `01:31:31` |
| Live source verification | **PASS** | `npm run data:verify-live`: 1.362 kỳ hợp lệ, 0 từ chối, 0 xung đột, 0 kỳ mới, exit 0 |
| Git diff check | **PASS** | Không lỗi whitespace (chỉ warning CRLF của Windows) |

### Lỗi runtime mà test không bắt nổi

Lần bấm nút "Cập nhật dữ liệu" đầu tiên thất bại với 6 lỗi CORS:

```
Access to fetch at 'https://raw.githubusercontent.com/.../power645.jsonl'
from origin 'http://localhost:5173' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
It does not have HTTP ok status.
```

**Nguyên nhân:** header `If-None-Match` làm request trở thành non-simple → browser gửi preflight `OPTIONS` trước → `raw.githubusercontent.com` trả non-2xx cho `OPTIONS` (dù `GET` thì CORS hoàn toàn mở).

**Vì sao không phát hiện sớm hơn:** `curl` không thực hiện preflight nên khảo sát nguồn ban đầu báo CORS ổn; test dùng mock `fetch` cũng không mô phỏng preflight. Chỉ chạy thật trên trình duyệt mới lộ ra.

**Cách sửa:** tách hai adapter — CLI giữ request có điều kiện (nhận 304), browser dùng GET đơn giản không header (`avoidPreflight`). Đánh đổi: browser tải lại ~150 KB mỗi lần kiểm tra thay vì nhận 304. Đã thêm regression test khoá đúng hành vi này:

> `adapter cho browser KHÔNG gửi header gây CORS preflight`

---

## 6. Giới hạn còn lại

**Nguồn dữ liệu.** Đây là mirror cộng đồng, **chưa đối chiếu độc lập với vietlott.vn**. Chưa tìm được API công khai chính thức của Vietlott; không bypass anti-bot nên không scrape HTML. Hiện chỉ có 1 nguồn, chưa có fallback.

**Cập nhật.** Phía browser không dùng được ETag nên mỗi lần kiểm tra tải lại ~150 KB. Đường incremental "thêm kỳ mới" đã chứng minh bằng integration test nhưng **chưa quan sát được trên nguồn thật** vì upstream chưa có kỳ mới kể từ 06/09.

**Runtime.** Không có D1/R2 (`.openai/hosting.json` là `null`), Worker không có filesystem ghi → dữ liệu cập nhật **chỉ nằm trên từng thiết bị**. Muốn dùng chung phải chạy `npm run data:sync` rồi commit snapshot mới.

**Thống kê.** Vẫn **không chiến lược nào có lợi thế**. Ứng viên hiện là `null`, UI hiển thị "Chưa có ứng viên đủ bằng chứng" — đúng như kỳ vọng với một trò chơi quay công bằng. `PROTOCOL_VERSION` (`2026-09-10.1`) vừa được khoá nên **số kỳ prospective hiện bằng 0**; chưa có bằng chứng độc lập nào tồn tại.

**Chưa kiểm chứng.** Repo không có framework component test nên logic được tách thành hàm thuần (`shouldAutoRefresh`, `pickBestSnapshot`) và test ở đó — **không** test render React. Đường IndexedDB được xác minh bằng runtime thật, không bằng unit test.

### Sự cố trong phiên làm việc

Khi chạy clean install, `rm -rf node_modules` vấp file bị dev server đang chạy (PID 20768) khoá, làm hỏng dở `node_modules`. Đã dừng dev server đó, cài lại sạch từ lockfile, và khởi động lại dev server. Trạng thái cuối: bình thường tại `localhost:5173`.

---

## 7. Khuyến nghị tiếp theo

1. **Đối chiếu nguồn với Vietlott chính thức một lần.** Hiện toàn bộ kết luận dựa trên một mirror cộng đồng chưa được kiểm chứng độc lập. Lấy mẫu ~50 kỳ ngẫu nhiên so với trang chính thức là đủ nâng độ tin cậy của cả dự án.

2. **Để protocol chạy prospective thật.** Không sửa gì trong 3–6 tháng; mỗi kỳ mới ghi kết quả vào một sổ prospective riêng. Đây là thứ duy nhất có thể biến "chưa có bằng chứng" thành bằng chứng thật, và nó đòi hỏi *không làm gì* — không phải thêm thuật toán.

3. **Thêm nguồn fallback thứ hai**, với quy tắc: hai nguồn bất đồng thì báo xung đột chứ không tự trộn. Hiện nếu upstream ngừng cập nhật, ứng dụng không có cách nào biết.

---

## Phụ lục — lệnh vận hành

```bash
npm run install:ci          # cài dependency
npm run data:sync           # tải và gộp dữ liệu mới (-- --force để bỏ qua ETag)
npm run data:check          # kiểm tra toàn vẹn snapshot + manifest, offline
npm run data:status         # in trạng thái dữ liệu hiện tại
npm run data:verify-live    # so sánh local với nguồn, chỉ đọc
npm test                    # toàn bộ test (offline, tất định)
npx tsc --noEmit && npm run lint && npm run build
```

Khôi phục khi cập nhật lỗi:

```bash
npm run data:check
git checkout -- public/data
npm run data:sync -- --force
```
