# Mega 6/45 Research Lab

Công cụ nghiên cứu xác suất, kiểm thử chiến lược lịch sử và thiết kế danh mục vé cho xổ số Mega 6/45. Ứng dụng được xây dựng để trả lời một câu hỏi thực tế: một cách chọn số có tạo ra lợi thế ổn định so với chọn ngẫu nhiên hay chỉ là nhiễu trong dữ liệu quá khứ?

> **Lưu ý quan trọng:** Mega 6/45 Research Lab không dự đoán được kết quả quay số và không bảo đảm lợi nhuận. Nếu quy trình quay là ngẫu nhiên và công bằng, mọi bộ 6 số hợp lệ đều có cùng xác suất trúng Jackpot. Hãy coi đây là công cụ học tập, mô phỏng và quản trị ngân sách — không phải lời khuyên tài chính hay sản phẩm chính thức của Vietlott.

## Bản chạy trực tuyến

[Mở Mega 6/45 Research Lab](https://mega645-lab.angularsolution2025.chatgpt.site)

Trang hiện được đặt ở chế độ riêng tư và có thể yêu cầu đăng nhập bằng tài khoản đã được cấp quyền.

## Tính năng chính

- **Cập nhật dữ liệu:** đồng bộ tăng dần từ nguồn upstream bằng CLI hoặc bằng nút **Cập nhật dữ liệu** trên giao diện; dữ liệu hợp lệ cũ luôn được giữ khi mạng lỗi.
- **Phân tích lịch sử:** lọc kết quả theo 30 ngày, 90 ngày, 365 ngày hoặc toàn bộ dữ liệu; xem tần suất, độ lệch so với kỳ vọng và khoảng cách từ lần xuất hiện gần nhất.
- **Backtest walk-forward:** tại mỗi kỳ, chiến lược chỉ được dùng các kỳ trước đó. Bốn phương án được so sánh gồm ngẫu nhiên, số nóng, số lạnh và phân bố cân bằng.
- **Kiểm tra độ bền:** hiển thị lợi thế so với ngẫu nhiên, z-score và kết quả trên hai nửa thời gian. Pipeline development–validation–test theo thời gian chọn ứng viên **chỉ bằng validation** rồi kiểm tra lại trên tập test.
- **Hiệu chỉnh nhiều chiến lược:** p-value một phía so với đối chứng ngẫu nhiên được hiệu chỉnh Holm-Bonferroni cho ba chiến lược không ngẫu nhiên, kèm khoảng tin cậy 95% của edge.
- **Tính mục tiêu lợi nhuận:** ước lượng số tiền cần trúng, số vé và mức chi tối đa theo mục tiêu người dùng nhập.
- **Danh mục 1–30 vé:** tạo các vé có mức chồng lặp được kiểm soát nhằm tăng độ phủ tổ hợp thay vì lặp lại quá nhiều cặp số.
- **Mô phỏng và kiểm tra vé:** sinh bộ số có seed để tái lập kết quả, đối chiếu số trùng và mức giải theo bảng trả thưởng đang được mô hình hóa trong mã nguồn.

## Cơ sở toán học

Mega 6/45 chọn 6 số khác nhau từ 1 đến 45. Tổng số bộ số có thể có là:

$$
\binom{45}{6} = 8.145.060
$$

Với một vé cố định, xác suất trùng đúng $k$ số là:

$$
P(X=k)=\frac{\binom{6}{k}\binom{39}{6-k}}{\binom{45}{6}}
$$

Bộ tối ưu danh mục sử dụng một **mặt phẳng xạ ảnh hữu hạn cấp 5**. Cấu trúc này tạo 31 khối, mỗi khối gồm 6 điểm và hai khối bất kỳ giao nhau đúng một điểm. Ứng dụng ánh xạ có seed từ các điểm sang số Mega 6/45, sau đó lấy tối đa 30 vé. Nhờ vậy:

- mỗi cặp vé dùng chung không quá một số;
- các cặp số bên trong vé không bị lặp giữa các vé;
- xác suất có ít nhất 4, 5 hoặc 6 số trùng của danh mục được cộng tuyến tính trong phạm vi cấu trúc này.

Thiết kế trên cải thiện **độ phủ** so với việc mua nhiều vé gần giống nhau. Nó không làm thay đổi xác suất hay giá trị kỳ vọng của từng bộ số, không phát hiện “số chắc thắng” và không biến một trò chơi kỳ vọng âm thành khoản đầu tư có lợi nhuận đảm bảo.

## Dữ liệu

Snapshot đi kèm nằm tại `public/data/power645.jsonl`:

| Thuộc tính | Giá trị |
|---|---:|
| Sản phẩm | Mega 6/45 |
| Khoảng thời gian | 25/10/2017–06/09/2026 |
| Số kỳ quay | 1.362 |
| Định dạng | JSON Lines |

Dữ liệu được lấy từ repo [vietvudanh/vietlott-data](https://github.com/vietvudanh/vietlott-data) theo giấy phép MIT. Ứng dụng kiểm tra ngày, mã kỳ, miền giá trị, số lượng số và bản ghi trùng trước khi phân tích. Xem thêm tại `public/data/SOURCE.md`.

## Pipeline dữ liệu

### Nguồn

| Thuộc tính | Giá trị |
|---|---|
| Endpoint | `https://raw.githubusercontent.com/vietvudanh/vietlott-data/main/data/power645.jsonl` |
| Giấy phép | MIT |
| CORS | `Access-Control-Allow-Origin: *` — browser gọi trực tiếp được |
| Cache | Có `ETag`, hỗ trợ `If-None-Match` |
| Phân trang | Không; toàn bộ là một snapshot |

Vì nguồn cho phép CORS, ứng dụng **không cần API proxy**. Điều này cũng loại bỏ toàn bộ rủi ro SSRF phía máy chủ. Host được ràng buộc bằng allowlist trong `lib/data/http.ts`; mọi URL khác bị từ chối.

> **Ràng buộc chỉ xuất hiện trên trình duyệt:** gửi `If-None-Match` làm request trở thành non-simple, kích hoạt CORS preflight `OPTIONS` mà `raw.githubusercontent.com` không trả về 2xx. Vì vậy phía browser dùng GET đơn giản (tải lại ~150 KB), còn CLI vẫn dùng request có điều kiện để nhận 304. `curl` không bộc lộ khác biệt này vì curl không preflight.

### Schema

Shape bản ghi trên đĩa giữ nguyên như upstream để snapshot tương thích byte-level:

```jsonc
{"date":"2017-10-25","id":"00198","result":[12,17,23,25,34,38],"process_time":"..."}
```

Metadata cấp file (product, nguồn, giấy phép, thời điểm sync, hash) nằm trong `public/data/power645.manifest.json`, không lặp lại trên từng bản ghi.

Mọi bản ghi phải vượt qua: `id` không rỗng; `date` đúng `YYYY-MM-DD` **và tồn tại trên lịch**; đúng 6 số nguyên phân biệt trong 1–45. Bản ghi lỗi **không bao giờ bị bỏ qua im lặng** — chúng làm cả lần ghi bị hủy và được liệt kê trong báo cáo.

### Cập nhật tăng dần và tính idempotent

`data:sync` đọc snapshot hiện có, tải nguồn, chuẩn hoá, kiểm tra, gộp, rồi chỉ ghi khi mọi kiểm tra đều đạt. Ghi file theo kiểu atomic: ghi ra file tạm rồi `rename`; manifest được cập nhật sau cùng.

Chạy lần hai với cùng nguồn cho `added = 0`, `conflicts = 0` và `datasetSha256` không đổi.

### Xử lý xung đột

Nếu nguồn trả về kết quả khác cho một mã kỳ đã có, đó là **xung đột**, không phải bản cập nhật. Dữ liệu cũ được giữ nguyên, lần sync thất bại với exit code khác 0, và xung đột được liệt kê để người dùng tự quyết định. Ghi đè im lặng là cách một ngày lỗi của upstream viết lại lịch sử.

### Bộ nhớ đệm trình duyệt

Bản cập nhật từ giao diện được lưu vào **IndexedDB trên thiết bị đó**, không gửi lên máy chủ. Ứng dụng luôn kèm sẵn `public/data/power645.jsonl` làm nguồn dự phòng và chỉ dùng cache khi cache hợp lệ và phủ nhiều kỳ hơn.

Không dùng `localStorage` vì bộ dữ liệu ~150 KB và còn tăng theo mỗi kỳ.

### Tự động cập nhật

Khi mở tab Nghiên cứu, ứng dụng hiển thị dữ liệu sẵn có ngay lập tức, **không chặn giao diện để chờ mạng**. Sau đó nếu `lastSuccessfulSync` đã quá TTL thì mới gọi mạng ngầm.

TTL mặc định **12 giờ**, khai báo tại một chỗ duy nhất: `DATA_REFRESH_TTL_MS` trong `lib/data/refresh.ts`.

Chỉ một request được chạy tại một thời điểm; bấm nút nhiều lần không tạo nhiều request. Request có timeout, `AbortController`, giới hạn kích thước phản hồi và tối đa 3 lần thử với backoff.

### Giới hạn Cloudflare Worker

Worker **không có filesystem ghi được**, nên không có đường ghi dữ liệu phía máy chủ. Hosting hiện cũng chưa gắn D1/R2 (`.openai/hosting.json`). Vì vậy dữ liệu cập nhật chỉ tồn tại trên thiết bị người dùng. Muốn chia sẻ dữ liệu giữa các thiết bị thì phải chạy `npm run data:sync` rồi commit snapshot mới, hoặc bổ sung D1/R2.

### Khôi phục khi cập nhật lỗi

Sync thất bại không đụng tới snapshot. Nếu cần kiểm tra hoặc khôi phục:

```bash
npm run data:check          # kiểm tra toàn vẹn, offline
npm run data:status         # xem manifest hiện tại
git checkout -- public/data # trả về snapshot đã commit
npm run data:sync -- --force  # bỏ qua ETag, tải lại toàn bộ
```

## Công nghệ

- Next.js 16 và Vinext
- React 19, TypeScript 5
- Tailwind CSS 4
- Radix UI / shadcn components
- Cloudflare Workers qua Wrangler

## Cài đặt và chạy local

Yêu cầu: Node.js `>=22.13.0`, npm và Git.

```bash
git clone <duong-dan-repo>
cd mega645-lab
npm run install:ci
npm run data:sync   # tuỳ chọn: lấy các kỳ mới hơn snapshot kèm theo
npm run dev
```

Sau khi server khởi động, mở địa chỉ local được in trong terminal. Có thể truyền cổng riêng:

```bash
npm run dev -- --port 5173
```

## Lệnh dữ liệu

```bash
npm run data:sync           # tải và gộp dữ liệu mới (thêm -- --force để bỏ qua ETag)
npm run data:check          # kiểm tra toàn vẹn snapshot + manifest, không dùng mạng
npm run data:status         # in trạng thái dữ liệu hiện tại
npm run data:verify-live    # so sánh local với nguồn, chỉ đọc, không ghi
```

`data:verify-live` gọi mạng thật nên **không** nằm trong `npm test`; bộ test mặc định chạy offline và tất định.

## Kiểm thử

```bash
npm test                # toàn bộ: nghiệp vụ + pipeline dữ liệu
npm run test:business   # chỉ nghiệp vụ
npm run data:test       # chỉ pipeline dữ liệu
```

Kiểm tra kiểu, lint và build sản phẩm:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Test nghiệp vụ bao phủ xác suất/tổ hợp, xác thực vé, phân tích dữ liệu, backtest, tính lợi nhuận và các bất biến của danh mục. Test pipeline bao phủ chuẩn hoá, xác thực, khử trùng lặp, phát hiện xung đột, gộp tăng dần, tính ổn định của hash, ghi file atomic, lỗi mạng, 304, upstream đổi schema, TTL tự cập nhật và allowlist chống SSRF.

## Cấu trúc dự án

```text
app/                          Trang và giao diện chính
components/data-status.tsx    Panel trạng thái dữ liệu và nút cập nhật
components/                   Các phòng lab và UI components
hooks/use-draw-data.ts        Nạp dữ liệu, cache, tự cập nhật theo TTL
lib/mega645.ts                Luật chơi, kiểm tra vé, đánh giá kết quả
lib/analytics.ts              Thống kê, backtest walk-forward, chọn ứng viên
lib/profit.ts                 Xác suất tổ hợp và mô hình lợi nhuận
lib/portfolio.ts              Bộ tạo danh mục vé có kiểm soát chồng lặp
lib/data/types.ts             Hợp đồng dữ liệu canonical
lib/data/schema.ts            Chuẩn hoá và xác thực từng bản ghi
lib/data/jsonl.ts             Đọc/ghi JSONL dạng canonical
lib/data/merge.ts             Gộp, khử trùng lặp, phát hiện xung đột
lib/data/sync.ts              Điều phối sync (storage và clock được inject)
lib/data/persistence.ts       Ghi file atomic phía Node
lib/data/browser-cache.ts     Cache IndexedDB
lib/data/refresh.ts           Nạp và cập nhật phía trình duyệt, TTL
lib/data/http.ts              Allowlist, timeout, giới hạn kích thước, retry
lib/data/sources/             Adapter nguồn dữ liệu
lib/**/*.test.ts              Kiểm thử
public/data/                  Snapshot, manifest và thông tin nguồn
scripts/data-*.ts             CLI dữ liệu
scripts/                      Script cài đặt, chạy và build
test/fixtures/                Dữ liệu mẫu cho test
```

## Nguyên tắc diễn giải kết quả

1. Tần suất quá khứ không làm một số “đến lượt” xuất hiện ở kỳ tiếp theo.
2. Kết quả backtest tốt có thể do chọn chiến lược sau khi đã xem dữ liệu, thử nhiều giả thuyết hoặc gặp may.
3. Một tín hiệu đáng kiểm tra tiếp cần tồn tại trên dữ liệu chưa dùng để thiết kế chiến lược và sau điều chỉnh kiểm định nhiều lần.
4. Ba giai đoạn development/validation/test là **chia hồi cứu trên dữ liệu đã có sẵn**. Tập test là holdout theo nghĩa cơ học — nó không tham gia việc chọn ứng viên — nhưng không bảo đảm chưa từng có người nhìn thấy. Chỉ những kỳ quay phát sinh **sau khi** protocol được khoá (`PROTOCOL_VERSION` trong `lib/analytics.ts`) mới là bằng chứng prospective thật sự. Việc thêm dữ liệu mới không được dùng để chọn lại chiến lược rồi tuyên bố thành công.
5. Bảng “thống kê mô tả toàn bộ lịch sử” tính trên mọi kỳ, kể cả phần test, nên không bao giờ được dùng để chọn chiến lược hay sinh khuyến nghị.
4. Jackpot có thể thay đổi giá trị kỳ vọng theo từng kỳ, nhưng thuế, giải chia sẻ, xác suất không có người trúng và chi phí vốn vẫn phải được tính riêng.
5. Chỉ sử dụng ngân sách giải trí có thể mất hoàn toàn; không vay tiền, gấp thếp hoặc dùng kết quả mô phỏng như cam kết lợi nhuận.

## Phạm vi và giấy phép

Dự án này độc lập, không liên kết và không được Vietlott bảo trợ. Thông tin luật chơi hoặc cơ cấu giải có thể thay đổi; hãy đối chiếu nguồn chính thức trước khi ra quyết định mua vé.

Repo hiện chưa khai báo giấy phép cho mã nguồn dự án. Giấy phép MIT nêu ở phần dữ liệu chỉ áp dụng cho nguồn dữ liệu upstream tương ứng.
