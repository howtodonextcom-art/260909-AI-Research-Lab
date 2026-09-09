# Mega 6/45 Research Lab

Công cụ nghiên cứu xác suất, kiểm thử chiến lược lịch sử và thiết kế danh mục vé cho xổ số Mega 6/45. Ứng dụng được xây dựng để trả lời một câu hỏi thực tế: một cách chọn số có tạo ra lợi thế ổn định so với chọn ngẫu nhiên hay chỉ là nhiễu trong dữ liệu quá khứ?

> **Lưu ý quan trọng:** Mega 6/45 Research Lab không dự đoán được kết quả quay số và không bảo đảm lợi nhuận. Nếu quy trình quay là ngẫu nhiên và công bằng, mọi bộ 6 số hợp lệ đều có cùng xác suất trúng Jackpot. Hãy coi đây là công cụ học tập, mô phỏng và quản trị ngân sách — không phải lời khuyên tài chính hay sản phẩm chính thức của Vietlott.

## Bản chạy trực tuyến

[Mở Mega 6/45 Research Lab](https://mega645-lab.angularsolution2025.chatgpt.site)

Trang hiện được đặt ở chế độ riêng tư và có thể yêu cầu đăng nhập bằng tài khoản đã được cấp quyền.

## Tính năng chính

- **Phân tích lịch sử:** lọc kết quả theo 30 ngày, 90 ngày, 365 ngày hoặc toàn bộ dữ liệu; xem tần suất, độ lệch so với kỳ vọng và khoảng cách từ lần xuất hiện gần nhất.
- **Backtest walk-forward:** tại mỗi kỳ, chiến lược chỉ được dùng các kỳ trước đó. Bốn phương án được so sánh gồm ngẫu nhiên, số nóng, số lạnh và phân bố cân bằng.
- **Kiểm tra độ bền:** hiển thị lợi thế so với ngẫu nhiên, z-score và kết quả trên hai nửa thời gian. Pipeline train–validation–test theo thời gian chọn ứng viên bằng validation rồi kiểm tra lại trên test holdout.
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
npm run dev
```

Sau khi server khởi động, mở địa chỉ local được in trong terminal. Có thể truyền cổng riêng:

```bash
npm run dev -- --port 5173
```

## Kiểm thử

Chạy toàn bộ kiểm thử nghiệp vụ:

```bash
node --import=tsx --test \
  lib/mega645.test.ts \
  lib/analytics.test.ts \
  lib/profit.test.ts \
  lib/portfolio.test.ts
```

Kiểm tra kiểu, lint và build sản phẩm:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Các test bao phủ xác suất/tổ hợp, xác thực vé, phân tích dữ liệu, backtest, tính lợi nhuận và các bất biến của danh mục như số vé hợp lệ, không trùng vé và giao nhau tối đa một số.

## Cấu trúc dự án

```text
app/                      Trang và giao diện chính
components/               Các phòng lab và UI components
lib/mega645.ts            Luật chơi, kiểm tra vé, đánh giá kết quả
lib/analytics.ts          Thống kê và backtest walk-forward
lib/profit.ts             Xác suất tổ hợp và mô hình lợi nhuận
lib/portfolio.ts          Bộ tạo danh mục vé có kiểm soát chồng lặp
lib/*.test.ts             Kiểm thử nghiệp vụ
public/data/               Snapshot dữ liệu và thông tin nguồn
scripts/                   Script cài đặt, chạy và build
```

## Nguyên tắc diễn giải kết quả

1. Tần suất quá khứ không làm một số “đến lượt” xuất hiện ở kỳ tiếp theo.
2. Kết quả backtest tốt có thể do chọn chiến lược sau khi đã xem dữ liệu, thử nhiều giả thuyết hoặc gặp may.
3. Một tín hiệu đáng kiểm tra tiếp cần tồn tại trên dữ liệu chưa dùng để thiết kế chiến lược và sau điều chỉnh kiểm định nhiều lần.
4. Jackpot có thể thay đổi giá trị kỳ vọng theo từng kỳ, nhưng thuế, giải chia sẻ, xác suất không có người trúng và chi phí vốn vẫn phải được tính riêng.
5. Chỉ sử dụng ngân sách giải trí có thể mất hoàn toàn; không vay tiền, gấp thếp hoặc dùng kết quả mô phỏng như cam kết lợi nhuận.

## Phạm vi và giấy phép

Dự án này độc lập, không liên kết và không được Vietlott bảo trợ. Thông tin luật chơi hoặc cơ cấu giải có thể thay đổi; hãy đối chiếu nguồn chính thức trước khi ra quyết định mua vé.

Repo hiện chưa khai báo giấy phép cho mã nguồn dự án. Giấy phép MIT nêu ở phần dữ liệu chỉ áp dụng cho nguồn dữ liệu upstream tương ứng.
