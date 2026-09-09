# Kiểm toán thiết kế có chấm điểm — Mega 6/45 Research Lab

| | |
|---|---|
| **Thời điểm** | 2026-09-10 02:25 (+07) |
| **Repository** | `howtodonextcom-art/260909-AI-Research-Lab` |
| **Branch / HEAD** | `main` @ `3e6ea3f` (kèm thay đổi chưa commit từ phiên pipeline dữ liệu) |
| **Phạm vi** | 3 tab: Portfolio 4+, Nghiên cứu, Vé mô phỏng |
| **Khổ màn hình đã kiểm** | 1440px, 390px |
| **Phương pháp** | Quan sát trực tiếp trên `localhost:5173` + đo bằng script trong trình duyệt |
| **TỔNG ĐIỂM** | **50,5 / 100** |

Một sản phẩm có **quan điểm thiết kế xuất sắc đặt trên một nền tảng thị giác chưa được hệ thống hoá**. Phần "nói gì" mạnh hơn hẳn phần "nói như thế nào": lập trường trung thực đáng nể (10/15) và bộ trạng thái đầy đủ (3/3), nhưng typography gần như không có hệ thống (4/15) và màu sắc mất kỷ luật ngữ nghĩa (6/15).

### Thang hiệu chuẩn đã áp dụng

| Mức | Ý nghĩa |
|---|---|
| 0–39% | Thiếu hẳn, hoặc có nhưng gây hại |
| 40–59% | Output mặc định của framework; chưa có quyết định thiết kế nào |
| 60–74% | Có quyết định rõ ràng nhưng thiếu nhất quán |
| 75–89% | Hệ thống mạch lạc, chủ đích, ít lỗ hổng |
| 90–100% | Xuất sắc, đủ làm ví dụ mẫu |

Quy tắc chống lạm phát: **"làm đúng chuẩn, không có gì sai" = 70%**, không phải 85%.

---

## 1. Bảng tổng hợp

| Chiều | Điểm | Tối đa | Hoàn thành | Nhận xét một dòng |
|---|---:|---:|---:|---|
| Point of view | 10 | 15 | 67% | Lập trường hiếm và đúng, nhưng ngôn ngữ thị giác lại là ngôn ngữ của app cá cược |
| Hierarchy | 10 | 20 | 50% | Mở đầu mạnh, phần giữa phẳng lì; 77% cột phải bỏ trống |
| Invisible stuff | 8,5 | 15 | 57% | Bộ trạng thái hoàn hảo, nhưng vùng chạm và focus thất bại |
| Imagery | 6 | 10 | 60% | Icon tốt; biểu đồ không có trục, không có chú giải |
| Motion | 6 | 10 | 60% | Có chủ đích nhưng hai hệ easing cùng tồn tại |
| Restrained color | 6 | 15 | 40% | Màu đỏ mang **4 nghĩa** khác nhau trên cùng một màn hình |
| Typography | 4 | 15 | 27% | 20 cỡ chữ, không có thang; font Inter **không hề được nạp** |
| **Tổng** | **50,5** | **100** | **50,5%** | |

---

## 2. Bảng số liệu đo được

| Chỉ số | Giá trị đo | Đánh giá |
|---|---|---|
| Số cỡ chữ (desktop) | **20** — từ 8,32px đến 57,6px | 7 cỡ nằm giữa 10,08–11,52px |
| Tỷ lệ bước thang | 1,014 · 1,015 · 1,024 · 1,029 · 1,030 · 1,032… | Mắt không phân biệt được dưới 1,05 |
| Font weight | 7 giá trị (400/500/600/700/**750**/800/900) | 750 là giá trị lạc loài |
| Font Inter thật sự nạp | **KHÔNG** — `document.fonts` rỗng, probe canvas trùng fallback | Thiết kế cho Inter, người dùng thấy system-ui |
| `font-variant-numeric` | `normal` ở **mọi** vùng số liệu | Không có tabular-nums |
| Màu chữ khác nhau | 15 | Token chỉ có 7 |
| Màu nền khác nhau | 17 | |
| Màu ngoài token | `#7085a3` `#4f7fc7` `#60718a` `#26354a` `#bac6d6` `#65e6ad` `#53647a` `#dce5f0` `#243650` | Biểu đồ không dùng token nào |
| Border-radius khác nhau | 10 (3, 6, 8, 12, 13, 14, 16, 20, 50%, 999px) | 12/13/14 không phân biệt được |
| Cấu hình motion | 5 (`0.15s ease`, `0.15s cubic-bezier(.4,0,.2,1)`, `0.18s ease`, + `transition:all` × 8) | Hai hệ easing song song |
| `prefers-reduced-motion` | Chỉ bảo vệ `.spin` | 5 nhóm transition còn lại không được bảo vệ |
| Vùng chạm < 44px @390 | **15 / 16** | Nhỏ nhất: link trong bảng cao 18px |
| Focus indicator | 48/53 có — nhưng 45 là **outline mặc định của trình duyệt** | Không có quy tắc `:focus-visible` nào trong `globals.css` |
| Heading order | h1 → h2×6, không nhảy bậc | Đạt |
| Cột phải bỏ trống | **2.026px / 2.628px = 77%** | `sticky` không có đường chạy vì cột chỉ cao 751px |
| Tràn ngang cấp trang | Không | Bảng tự cuộn trong `overflow-x:auto` |

### Tương phản WCAG — 2 điểm trượt

| Đối tượng | Tỷ lệ | Cần | Kết quả |
|---|---:|---:|---|
| Nút chính (trắng trên `--red` #ef3340) | **4,02** | 4,5 | **TRƯỢT** — ảnh hưởng *mọi* nút CTA |
| Nhãn trục biểu đồ (8,32px) | **3,64** | 4,5 | **TRƯỢT** |
| Body text `--muted` #91a2ba | 6,97 | 4,5 | Đạt |
| Ô dữ liệu bảng | 17,31 | 4,5 | Đạt |
| Tiêu đề cột bảng | 6,97 | 4,5 | Đạt |
| Ball gợi ý (đen trên vàng) | 10,61 | 4,5 | Đạt |
| `data-status` giá trị | 16,16 | 4,5 | Đạt |
| ROI âm (đỏ trong bảng) | 7,97 | 4,5 | Đạt |
| Cột biểu đồ vs nền card | 4,48–4,81 | 3,0 | Đạt |

---

## 3. Chi tiết từng chiều

### 3.1. Typography — 4/15 (27%)

| Tiêu chí | Điểm |
|---|---|
| Thang chữ nhất quán | 1/5 |
| Độ dài dòng, line-height, letter-spacing | 2/4 |
| Tabular-nums cho bảng số | 0/3 |
| Chiến lược nạp font | 1/3 |

- **Thang chữ.** `[ĐO]` 20 cỡ, trong đó 10,08 / 10,4 / 10,56 / 10,88 / 11,04 / 11,2 / 11,52px — bảy cỡ trong dải rộng 1,4px. Đây không phải thang, đây là tích tụ các giá trị rem rời rạc (0,63rem, 0,65rem, 0,66rem, 0,68rem…). Khoảng trống 21,6px → 57,6px (2,67×) khiến h1 đứng một mình còn mọi thứ khác dồn thành một khối.
- **Đo lường dòng.** `[QUAN SÁT]` h1 với `letter-spacing:-0.055em; line-height:0.98` (`app/globals.css:64-70`) là chỗ tinh chỉnh tốt nhất trong toàn bộ CSS. Nhưng `.method-note` 11,04px trải hết chiều rộng card = dòng quá dài cho chữ quá nhỏ. Dấu thanh tiếng Việt ở 8,32–10,4px với line-height chặt có nguy cơ bị cắt.
- **Tabular-nums.** `[ĐO]` Không có ở đâu. Trong một app mà toàn bộ mục đích là so sánh cột số thập phân (0.801 / 0.796 / 0.732 / 0.805), chữ số không thẳng hàng dọc.
- **Font loading.** `[ĐO]` Không `@font-face`, không `next/font`. `app/layout.tsx` chỉ import CSS. Probe canvas: Inter không khác fallback → **Inter không được nạp**. Toàn bộ letter-spacing tinh chỉnh cho Inter đang áp lên một font khác.

### 3.2. Restrained color — 6/15 (40%)

| Tiêu chí | Điểm |
|---|---|
| Kỷ luật bảng màu | 2/4 |
| Nghĩa nhất quán | 1/5 |
| Tương phản WCAG AA | 2/4 |
| Không phụ thuộc duy nhất vào màu | 1/2 |

- **Kỷ luật.** Token set 7 biến (`--ink --panel --panel-soft --line --muted --red --gold`) là gọn và tốt, nhưng bị vượt mặt thường xuyên — 9 màu hard-code nằm ngoài hệ.
- **Nghĩa nhất quán — thất bại sắc nét nhất.** `[FACT-CODE]` Màu đỏ `--red` mang **bốn nghĩa cùng lúc** trên một màn hình:
  1. Dấu hiệu thương hiệu (`.brand-mark`)
  2. Hành động chính (`.primary-action`, `.draw-action`)
  3. "Số nóng" trong biểu đồ (`app/globals.css:254`)
  4. Giá trị âm trong bảng (`.negative`: −86,8%)

  Người dùng nhìn một màn hình có cột đỏ, nút đỏ, và −88,7% đỏ — ba thứ không liên quan gì nhau.
- **Không chỉ dựa vào màu.** `[QUAN SÁT]` Biểu đồ phân biệt nóng/lạnh/thường **chỉ bằng màu**, không chú giải, không pattern, không nhãn. Người mù màu không đọc được.

### 3.3. Hierarchy — 10/20 (50%)

| Tiêu chí | Điểm |
|---|---|
| Trật tự đọc 3 giây đầu | 3/6 |
| Tương phản kích thước/đậm nhạt | 2/5 |
| Khoảng trắng nhóm đúng | 3/5 |
| Bảng dữ liệu có neo thị giác | 2/4 |

- **Trật tự đọc.** H1 57,6px "Thống kê không phải dự đoán." không thể nhầm được — rất mạnh. Nhưng sau đó mọi card đều dùng chung `.analysis-card` (cùng viền, cùng radius 20px, cùng gradient), nên không card nào ra hiệu "đây là kết luận quan trọng nhất". **Đảo ngược ưu tiên:** khối ProfitLab với tiêu đề "10.000đ → 30.000đ → 20.000đ lãi" nằm gần đầu trang, còn phát hiện cốt lõi (không chiến lược nào thắng ngẫu nhiên) nằm trong bảng ở vị trí cuộn ~1.400px.
- **Khoảng trắng.** Nhịp card đều và tốt. Nhưng `[ĐO]` cột phải bỏ trống 2.026px — `position:sticky` vô tác dụng vì `.research-side` chỉ cao 751px, hết đường chạy là card biến mất khỏi khung nhìn.
- **Bảng dữ liệu.** Không zebra, không hover row, không tabular-nums. `[ĐO]` Ở 390px, bảng rộng 780–860px trong khung 317px — có `overflow-x:auto` nên cuộn được, nhưng **không có tín hiệu thị giác** báo cho người dùng biết là cuộn được.

### 3.4. Point of view — 10/15 (67%)

| Tiêu chí | Điểm |
|---|---|
| Lập trường rõ ràng | 5/5 |
| Lập trường đúng với sản phẩm | 3/6 |
| Nhận ra khi che logo | 2/4 |

- **Lập trường.** Điểm tuyệt đối duy nhất trong bài. H1 là "Thống kê không phải dự đoán." và "Tăng độ phủ, không đoán số." Sidebar tự nói "Chưa có ứng viên đủ bằng chứng" và "Không có gì để khuyến nghị". Một sản phẩm dám phản biện chính lý do tồn tại của nó là điều hiếm.
- **Đúng với sản phẩm.** `[NHẬN ĐỊNH]` Có mâu thuẫn thật. Ngôn ngữ thị giác — navy đậm + đỏ + vàng kim, bóng số phát sáng, `box-shadow: 0 24px 70px`, gradient card — **là ngôn ngữ của app cá cược**. Hình thức nói "sòng bạc", chữ nói "đừng đánh bạc". Cụ thể: quả bóng gợi ý màu vàng kim là vật thể bão hoà nhất, tương phản cao nhất trong sidebar, dù chú thích ngay dưới nói nó không phải khuyến nghị.
- **Riêng biệt.** Đỏ/navy/vàng + bóng tròn là diện mạo của *danh mục*, không phải của *sản phẩm này*. Thứ thật sự riêng biệt chỉ có cách xử lý h1.

### 3.5. Invisible stuff — 8,5/15 (57%)

| Tiêu chí | Điểm |
|---|---|
| Focus state nhìn thấy được | 2/4 |
| Đủ bộ trạng thái | 3/3 |
| Vùng chạm ≥ 44px | 0/2 |
| Ngữ nghĩa screen reader | 2/3 |
| prefers-reduced-motion / color-scheme | 1/2 |
| Không layout shift | 0,5/1 |

- **Focus.** `[ĐO]` 48/53 có chỉ báo, nhưng 45 trong số đó là outline mặc định `1px auto` của trình duyệt, không phải trạng thái được thiết kế. Ba nút CTA chính — "Chọn nhanh", "Xóa vé", "Mô phỏng kỳ quay" — **không có chỉ báo nào**. `[FACT-CODE]` Không có quy tắc `:focus-visible` nào trong `globals.css` ngoài một dòng cho select item (`app/globals.css:298`).
- **Bộ trạng thái — 3/3.** Đầy đủ và làm tốt: loading, empty ("Chưa có kỳ quay" với viền đứt nét), error kèm nút thử lại, success, disabled.
- **Vùng chạm.** `[ĐO]` 15/16 dưới 44px ở khổ 390px. Link chiến lược trong bảng cao 18px; link "Cơ cấu giải Vietlott" cao 21px; nút chuyển cửa sổ 32px; tab 38px; nút chính 36px.
- **Ngữ nghĩa.** Đạt: `lang="vi"`, `<main>`, `<header>`, heading không nhảy bậc, 16/16 SVG `aria-hidden`, `aria-live` + `role="status"`, `aria-pressed` trên bóng số. Thiếu: không `<nav>`, không `<footer>`, không `<caption>` cho 2 bảng.
- **prefers-*.** `prefers-reduced-motion` chỉ bảo vệ `.spin` (`app/globals.css:327`) — 45 transition chiều cao của cột biểu đồ và toàn bộ transform của bóng số không được bảo vệ. `color-scheme: dark` cứng, không hỗ trợ light — chấp nhận được như một cam kết có chủ đích.

### 3.6. Imagery — 6/10 (60%)

| Tiêu chí | Điểm |
|---|---|
| Biểu đồ tự giải thích được | 1/4 |
| Quả bóng số | 2/3 |
| Icon | 3/3 |

- **Biểu đồ.** `[QUAN SÁT]` Không trục Y, không lưới, không nhãn giá trị, **không chú giải cho ba màu**. Người xem thấy được cột nào cao hơn cột nào, nhưng không đọc được giá trị nào và không biết đỏ/xanh nghĩa là gì.
- **Bóng số.** Ẩn dụ đúng, dễ đọc. Nhưng có **ba cách thể hiện khác nhau** cho cùng một khái niệm: `.ball` (nền tối, chữ sáng), bóng trong Portfolio (nền trắng, chữ tối), `.suggestion-balls` (vàng kim).
- **Icon.** lucide nhất quán, chọn có nghĩa (CircleDollarSign cho vốn, ShieldCheck cho chống overfit, Dices cho ngẫu nhiên), toàn bộ `aria-hidden`.

### 3.7. Motion — 6/10 (60%)

| Tiêu chí | Điểm |
|---|---|
| Phục vụ việc hiểu | 3/4 |
| Thời lượng và easing nhất quán | 1/3 |
| Có mặt đúng chỗ cần | 2/3 |

- **Phục vụ hiểu.** Cột biểu đồ transition `height 180ms` khi đổi cửa sổ thời gian là chỗ dùng motion đúng nhất — nó cho thấy dữ liệu đang thay đổi. Hover bóng `translateY(-2px)` phản hồi tốt.
- **Nhất quán.** `[ĐO]` 5 cấu hình, hai hệ easing (`ease` viết tay vs `cubic-bezier(.4,0,.2,1)` của Tailwind), và `transition: all` trên 8 phần tử.
- **Đúng chỗ.** Có ở async và thay đổi dữ liệu. Thiếu ở chuyển tab và ở thông báo `aria-live` (hiện ra đột ngột).

---

## 4. Năm vấn đề nghiêm trọng nhất

Xếp theo (điểm mất được × mức dễ sửa).

### 4.1. 🔴 `.method-note` vỡ bố cục — regression do phiên làm việc trước gây ra

`[ĐO]` `.method-note` là `display:flex; flex-wrap:nowrap` (`app/globals.css:275`). Ở phiên trước, việc thêm `<strong>` và `<code>` vào bên trong đã biến các đoạn text thành **các cột flex riêng biệt**. Đo được: note 1 có 2 text node rời + một `<strong>` rộng **31px**; note 2 có 4 text node rời + `<strong>` 21px + `<code>` 30px.

Kết quả hiển thị thực tế:

```
Bảng này tính trên toàn bộ lịch sử, bao │ thống │ và không được dùng để chọn chiến
gồm cả phần dùng làm test, nên chỉ là   │ kê mô │ lược. Đối chứng là trung bình 32
                                        │ tả    │ vé random/kỳ...
```

Cột giữa rộng 31px, xuống dòng gần như từng chữ. Sửa: thêm `flex-wrap: wrap` vào `.method-note`, hoặc bọc phần chữ trong một `<span>` duy nhất.

### 4.2. 🔴 Không có tabular-nums
0/3 điểm, sửa mất 2 dòng CSS. Tỷ lệ điểm trên công sức cao nhất toàn bài.

### 4.3. 🟠 Font Inter không được nạp
Toàn bộ hệ typography được thiết kế cho một font mà phần lớn người dùng không có.

### 4.4. 🟠 Màu đỏ mang 4 nghĩa
Vấn đề ngữ nghĩa nặng nhất, và là thứ khiến app "trông như" chính cái mà nội dung của nó đang phản đối.

### 4.5. 🟠 Biểu đồ không trục, không chú giải
Thành phần trực quan trung tâm của một app phân tích lại không đọc được giá trị.

---

## 5. Điều đang làm tốt

- **Lập trường trung thực, thể hiện bằng chữ trên màn hình.** "Thống kê không phải dự đoán." làm h1. "Chưa có ứng viên đủ bằng chứng" thay vì bịa ra một khuyến nghị. Đây là thứ khó nhất trong danh sách và app làm tốt nhất.
- **Bộ trạng thái đầy đủ 3/3.** Empty state của phòng quay (viền đứt nét, icon xúc xắc, câu giải thích nguồn ngẫu nhiên) là chi tiết được chăm.
- **Tương phản chữ mạnh.** 13/15 cặp đạt AA, phần lớn ở mức 6,3–17,3 — vượt xa ngưỡng.
- **Ngữ nghĩa HTML sạch.** Heading không nhảy bậc, 16/16 icon `aria-hidden`, `aria-live` đặt đúng chỗ.
- **Xử lý h1.** 57,6px, `letter-spacing:-0.055em`, `line-height:0.98` — chỗ duy nhất trong CSS cho thấy có người thật sự tinh chỉnh bằng mắt.

---

## 6. Lộ trình lên 85/100

| # | Việc | Điểm | Công sức |
|---|---|---:|---|
| 1 | Sửa `.method-note` (`flex-wrap:wrap`) | +1,5 | 2 phút |
| 2 | `font-variant-numeric: tabular-nums` cho bảng + metric | +3 | 5 phút |
| 3 | Nạp Inter qua `next/font` | +2 | 10 phút |
| 4 | Nút chính: đổi `--red` thành `#d92633` hoặc chữ đen → đạt 4,5:1 | +1 | 5 phút |
| 5 | Quy tắc `:focus-visible` toàn cục dùng `--gold` | +2 | 15 phút |
| 6 | Vùng chạm ≥44px ở mobile | +2 | 30 phút |
| 7 | Rút 20 cỡ chữ → thang 7 bậc tỷ lệ 1,25 | +5 | 1–2 giờ |
| 8 | Tách nghĩa màu: đỏ chỉ dành cho hành động; nóng/lạnh dùng cặp màu riêng + chú giải | +5 | 1–2 giờ |
| 9 | Biểu đồ: trục Y, đường lưới, chú giải, nhãn giá trị khi hover | +3 | 1 giờ |
| 10 | Thống nhất bóng số về một cách thể hiện | +1 | 30 phút |
| 11 | Cột phải: cho `.research-side` stretch để sticky có đường chạy | +2 | 15 phút |
| 12 | Một hệ easing + bỏ `transition:all` + mở rộng `prefers-reduced-motion` | +2 | 30 phút |
| 13 | Phân cấp card: card kết luận khác card phụ trợ về nền/viền | +3 | 1 giờ |
| 14 | Hạ ProfitLab xuống dưới, đưa kết luận backtest lên trên | +2 | 30 phút |
| | **Tổng** | **+34,5 → 85** | |

**Bốn việc đầu mất khoảng 22 phút và đem về +7,5 điểm** — nên làm trước bất cứ thứ gì khác.

---

## 7. Giới hạn của bản kiểm toán này

- Chỉ kiểm hai khổ màn hình (1440px, 390px); khổ tablet 834px chưa được soi kỹ.
- Chỉ kiểm trên Chromium. Chưa kiểm Safari/Firefox — nơi `backdrop-filter` và outline mặc định hành xử khác.
- Chưa test với screen reader thật (NVDA/VoiceOver); phần ngữ nghĩa dựa trên kiểm tra DOM, không phải trải nghiệm nghe thật.
- Chưa đánh giá hiệu năng render (CLS, LCP) bằng số đo Lighthouse.
- Điểm cho "Point of view" mang tính chuyên môn chủ quan hơn các chiều khác, dù đã cố neo vào bằng chứng cụ thể.
