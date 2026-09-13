# Đánh giá mã nguồn AI Research Lab

Audit sản phẩm và kỹ thuật • Mega 6/45 • Ngày 13 tháng 9 năm 2026

## **Kết luận chính**

Dự án đang đi đúng hướng của một phòng nghiên cứu xác suất và dữ liệu xổ số. Dữ liệu không còn trống, cơ chế kiểm định đã tiến bộ rõ rệt. Tuy nhiên, chưa có bằng chứng về thuật toán tạo lợi nhuận hoặc dự đoán giải lớn tốt hơn chọn ngẫu nhiên. Không nên định vị phiên bản này là công cụ kiếm tiền từ vé số.

Phiên bản được kiểm tra là commit 058f3162c3fdfbc0883eab96e7be7ecd0b93dcbf. Đánh giá dựa trên mã nguồn, thực thi local và nguồn Internet công khai; không dùng các báo cáo tự chấm điểm trong repo làm bằng chứng đạt chuẩn. Không sửa, commit, push hoặc triển khai mã nguồn. [^1]

| Kiểm tra | Kết quả thực tế |
| :---- | :---- |
| Cài đặt sạch | npm run install:ci hoàn tất; 608 package được cài |
| Typecheck và unit/contract test | PASS; 141 business \+ 119 data \= 260 test; không fail |
| Lint | PASS |
| Dữ liệu local | PASS; 1.561 kỳ; hash khớp manifest; không thiếu ID |
| Nguồn trực tiếp | PASS; không có kỳ mới theo nguồn tại thời điểm chạy; 8/8 mẫu khớp |
| Production build | CHƯA ĐẠT XÁC MINH; dừng ở analyze client references, bị ngắt thủ công sau nhiều phút |
| Trình duyệt và triển khai | Chưa kiểm thử E2E; không xác nhận production-ready |

## **Quyết định đề xuất**

Giữ nền tảng hiện tại, sửa tính toàn vẹn thí nghiệm và luồng cập nhật trước. Chỉ thêm mô hình khi có mục tiêu kiểm định đăng ký trước, dữ liệu ngoài mẫu thật và đối chứng cùng ngân sách. Không mở rộng Power 6/55 bằng cách thay số 45 thành 55\.

# **Frontend và tính năng người dùng**

Frontend là React 19 và TypeScript, giao diện theo App Router, chạy qua vinext/Vite; Tailwind và Radix hỗ trợ UI. Không nên mô tả đây là ứng dụng Next.js tiêu chuẩn chỉ vì có dependency next. Điểm vào chính là app/page.tsx với ba tab Portfolio 4+, Nghiên cứu và Vé mô phỏng.

| Tính năng | Mô tả và vì sao cần | Trạng thái và vị trí |
| :---- | :---- | :---- |
| Portfolio 4+ | Sinh 1–30 vé ít giao nhau; thể hiện chi phí và xác suất tổ hợp. Cần để phân biệt tăng độ phủ với dự đoán. | Có UI và logic; components/portfolio-lab.tsx, lib/portfolio.ts |
| Thống kê theo cửa sổ | 30, 90, 365 ngày hoặc toàn bộ; tần suất 01–45. Cần để mô tả dữ liệu theo thời gian. | Có; app/page.tsx, lib/analytics.ts. Chưa phải bộ lọc tháng/quý lịch hoặc khoảng ngày tùy ý. |
| Backtest và kết luận | Hiển thị development, validation, test; p-value hiệu chỉnh và độ bất định. Cần chống kết luận chỉ từ tần suất. | Có; chưa phải bằng chứng prospective có kết quả. |
| Trạng thái dữ liệu | Số kỳ, nguồn, đồng bộ, lỗi, nút cập nhật và xóa cache. Cần biết đang nghiên cứu snapshot nào. | Có; components/data-status.tsx, hooks/use-draw-data.ts |
| Mô phỏng vé | Chọn sáu số khác nhau, quick pick, quay độc lập, đối chiếu giải. Cần minh họa luật và xác suất. | Có; TicketLab trong app/page.tsx |
| Thông tin tài chính | Xác suất và khoản thưởng cố định trong mô hình. Cần tách trúng giải khỏi lãi ròng. | Có; components/profit-lab.tsx, lib/profit.ts |

## **Cần bổ sung ở giao diện**

Đưa Data Explorer có tìm mã kỳ, khoảng ngày và tải dữ liệu lên ưu tiên cao. Thêm trang thí nghiệm để xem protocol, dataset hash, commit và dự đoán đã khóa. Hiển thị nhãn RETROSPECTIVE, PROSPECTIVE PENDING và PROSPECTIVE SCORED tách biệt. Báo kết quả sao chép vé thành công hoặc thất bại; hiện lỗi clipboard bị bỏ qua.

Có kiểm tra skip-link và cấu trúc tab, nhưng app/page.a11y.test.ts đọc chuỗi mã nguồn bằng regex, không chứng minh được tương tác bàn phím, focus, tương phản màu hoặc hiển thị mobile. Cần kiểm thử trình duyệt thật.

# **Backend và dữ liệu**

Backend hiện mỏng: POST /api/data/refresh gọi adapter nguồn chính thức và runSync. CLI Node ghi snapshot local; trình duyệt nhận kết quả rồi lưu IndexedDB theo thiết bị. Cache nguồn dùng Cache API hoặc Map trong isolate, không phải kho dữ liệu người dùng dùng chung.

| Khả năng | Giá trị | Bằng chứng |
| :---- | :---- | :---- |
| Thu thập nguồn chính | HTML và AjaxPro từ Vietlott, lịch sử và phần mới; cần dữ liệu thật. | lib/data/sources/vietlott-official.ts |
| Chuẩn hóa và kiểm tra | Kiểm tra bản ghi, thứ tự, trùng, xung đột và ID thiếu; chặn snapshot lỗi. | schema.ts, merge.ts, continuity.ts, sync.ts |
| Lưu bền local | JSONL canonical, manifest SHA-256, file tạm rồi rename; hỗ trợ phục hồi và tái lập. | lib/data/persistence.ts và public/data |
| Nút và tự cập nhật | Tải snapshot trước, kiểm tra TTL 12 giờ khi mount; single-flight trong client. | hooks/use-draw-data.ts, lib/data/refresh.ts |
| Giảm tải upstream | Cache kết quả fetchAll/fetchSince 12 giờ. | official-fetch-cache.ts; chưa gộp request đang chạy |
| Kiểm chứng | data:check, data:status, data:verify-live; nguồn phụ để đối chiếu. | scripts/data-\*.ts và 119 data test |

## **Phạm vi dữ liệu được xác minh**

Snapshot có \#00001 ngày 20/07/2016 đến \#01561 ngày 11/09/2026. SHA-256 bắt đầu 8e26f348a8b241865. data:verify-live chạy ngày 13/09/2026 đối chiếu các kỳ 00001, 00270, 00639, 00677, 00781, 01241, 01404 và 01561: không sai khác hoặc lỗi tải. Đây là kiểm tra mẫu, không phải đối chiếu độc lập toàn bộ 1.561 kỳ.

## **Tự cập nhật chưa phải dịch vụ định kỳ**

Hook kiểm tra khi trang mount; không có timer trong hook hoặc scheduler server được triển khai trong repo đã kiểm tra. Đóng ứng dụng sẽ không có tác vụ định kỳ chạy nhờ hook này. Cập nhật ở thiết bị A không tự cập nhật snapshot đóng gói hoặc IndexedDB ở thiết bị B. Người dùng cần một scheduler local thực sự nếu muốn dữ liệu tự về máy ngay cả khi không mở trang.

# **Thuật toán và giá trị nghiên cứu**

Các lane hiện tại khác nhau về mục đích. Không nên dùng tên AI Research Lab để gom tất cả thành một mô hình dự đoán đã huấn luyện.

| Lane | Thực chất và trạng thái |
| :---- | :---- |
| HOT COLD BALANCED RANDOM | Heuristic và đối chứng trong lib/analytics.ts; walk-forward dùng lịch sử trước kỳ mục tiêu. |
| Mô hình null | Hypergeometric chính xác; Monte Carlo có seed cho chẩn đoán độ ngẫu nhiên. Có implementation và test. |
| Kiểm định | Holm, alpha-spending và sai số HAC; validation chọn ứng viên, test hồi cứu kiểm tra lại. |
| Registry và protocol | Có hash cấu hình, metadata thí nghiệm, artifact có gitCommit; kiểm tra hợp lệ chưa đầy đủ. |
| Prospective scorecard | Có CLI freeze và append-result; bốn dự đoán kỳ 01562 đang pending, chưa có kết quả trong snapshot. |
| Bao và portfolio MC | Có CLI tổ hợp và so sánh cùng ngân sách dưới mô hình quay công bằng; không phải backtest lịch sử. |
| Ranking score | Stub lấy trung bình feature; calibration gate chưa nối vào UI. Không phải mô hình AI dự đoán hoàn chỉnh. |

## **Backtest chạy lại ở commit đang audit**

| Chiến lược | p hiệu chỉnh validation | p hiệu chỉnh test | Kết luận |
| :---- | :---- | :---- | :---- |
| HOT | 1,0000 | 1,0000 | NO\_EDGE |
| COLD | 1,0000 | 1,0000 | NO\_EDGE |
| BALANCED | 0,2816 | 0,9812 | NO\_EDGE |

Cửa sổ 90 kỳ, alpha 0,05, familySize 3, lookCount 1\. Có 735 kỳ development, 368 validation và 368 test hồi cứu. candidate \= null. Kết quả này không chứng minh mọi thuật toán tương lai đều thất bại, nhưng không cho phép tuyên bố ba chiến lược hiện tại có lợi thế.

Portfolio có pairwise intersection ≤ 1 làm các sự kiện trùng từ bốn số trở lên không giao nhau: xác suất hợp được cộng chính xác trong điều kiện đó. Một vé vẫn có xác suất jackpot 1/8.145.060 dưới mô hình quay công bằng. Tăng số vé tăng chi phí; độ phủ không đồng nghĩa lợi nhuận. HAC cũng không tự biến dữ liệu đã nhìn thấy thành ngoài mẫu thật.

# **Các vấn đề ưu tiên cao**

## **P0 cho tuyên bố khoa học và P1 kỹ thuật  Khóa prospective chưa đủ**

freezeProspectivePrediction chỉ xét ID với mốc prospectiveStartDrawId rồi nhận protocolHash do caller truyền. Tái hiện bằng lock original-protocol, hash changed-protocol, kỳ 01562 và thời gian 01/01/2030 vẫn trả ok:true. CLI có chặn kỳ đã tồn tại trong dataset local, nhưng không so sánh hash đang chạy với hash đã khóa và không xác nhận kỳ chưa quay khi dataset bị cũ.

Tác động: kết quả có thể bị gắn nhãn prospective sau khi đã biết kết quả ở bên ngoài local, hoặc sau đổi protocol. Chưa có bằng chứng ai đã làm vậy; đây là lỗ hổng bảo đảm. Sửa: bắt buộc hash trùng lock, xác nhận cutoff và độ mới, lưu commit/code hash, tách sự kiện đăng ký và chấm điểm, ghi thời điểm có chứng thực độc lập. Test phải từ chối hash lệch, dữ liệu cũ, đăng ký sau hạn và ghi đè.

## **P1  Registry nhận bản ghi không hợp lệ**

parseExperimentRegistry("{}") trả \[{}\] thay vì báo lỗi. Hàm chỉ kiểm tra một số field tùy chọn, rồi ép kiểu ExperimentRecord; các field bắt buộc chưa được validate đầy đủ. Record lỗi có thể bị bỏ khỏi phép đếm family/hypothesis hoặc làm sai metadata. Sửa schema runtime cho toàn bộ record, enum, timestamp, số nguyên không âm, ID trùng và chuyển trạng thái hợp lệ. Không xóa lịch sử lỗi âm thầm.

## **P1  API cập nhật chưa có ranh giới vận hành rõ**

app/api/data/refresh/route.ts parse JSON rồi ép kiểu; route không tự giới hạn body, xác thực schema toàn request, rate-limit hoặc chặn force cho caller công khai. handleDataRefresh nhận snapshot từ client; force bỏ cache nguồn. Có validate dữ liệu bên trong sync, nhưng đây không thay thế kiểm soát tài nguyên ở biên HTTP. Cần xác minh cấu hình bảo vệ ở tầng deploy trước khi công khai API.

Sửa: schema strict, giới hạn byte và số record, trả 400/413/429 có cấu trúc, giới hạn force/backfill ở tác vụ quản trị, cursor đơn giản thay vì gửi cả dataset. Không có bằng chứng client hiện ghi đè được snapshot dùng chung của người khác: endpoint này không lưu shared user snapshot.

## **P1  Allowlist chưa kiểm tra đường chuyển hướng**

lib/data/http.ts kiểm tra URL ban đầu nhưng fetch dùng redirect:"follow". Vì vậy không thể khẳng định mọi đích mạng đều nằm trong allowlist. Đây là thiếu phòng vệ, chưa phải bằng chứng SSRF khai thác được. Sửa redirect manual, giới hạn hop, kiểm tra lại mỗi Location và cấm port/credential ngoài chính sách; test redirect sang host khác.

# **Độ tin cậy vận hành và trải nghiệm**

## **P1  Cache offline không cứu được lỗi tải snapshot**

loadDataset gọi await fetchBundled trước khi readCache. Khi mạng lỗi, hàm throw trước khi đọc IndexedDB. Tái hiện với fetch mock báo offline cho kết quả offline-load: offline. Nếu mục tiêu là local-first, cần đọc cache độc lập và dùng snapshot đã kiểm tra khi bundled fetch thất bại; thêm test cache tốt \+ offline, cache hỏng và cả hai nguồn hỏng.

## **P1  Cache nguồn không gộp các cache miss đồng thời**

Hai lời gọi fetchAll đồng thời qua cùng cache wrapper tạo hai upstream call trong thử nghiệm mock. Đây khác single-flight ở client: nhiều client/isolate vẫn có thể cùng tải lịch sử. Cần khóa request đang chạy theo key và giới hạn backfill; cache TTL 12 giờ cũng cần phù hợp lịch kỳ quay để tránh che kỳ mới đến sau cache miss đầu tiên.

## **P1  Chưa đạt release gate**

npm run build trong portable profile đứng ở bước analyze client references rồi bị ngắt thủ công. Không có thông báo compile failure cụ thể, nên chưa quy nguyên nhân cho code; cũng không ghi PASS. Cần tái hiện trên Node hỗ trợ, ghi thời gian từng bước, timeout và log CI. Không có thư mục .github trong checkout này; chưa có workflow CI trong repo được xác minh.

260 test chủ yếu là unit và contract; kiểm thử regex source không thay thế browser E2E. Cần kiểm tra ba tab, mobile, keyboard, nút update, timeout, offline reload, IndexedDB upgrade, double-click, clipboard và error boundary. Chưa có bằng chứng tải thực tế, bộ nhớ hoặc thời gian tính trên điện thoại.

## **P2  Thuật ngữ và API dễ bị dùng sai**

Comment đầu lib/data/refresh.ts vẫn nói fetch trực tiếp không có proxy trong khi code POST về server. ranking-score.ts có câu điều kiện “fails to be beaten” gây đảo nghĩa; nên viết lại tiêu chuẩn một cách kiểm thử được. Không nâng stub thành tính năng AI đã done. calculatePortfolioOdds chỉ nhận ticketCount nên không kiểm tra tiền điều kiện pairwise ≤ 1; nên nhận portfolio đã validate hoặc dùng kiểu dữ liệu bảo đảm điều kiện.

Bao n từ 6 đến 45 là mô hình full-cover tổ hợp trong code, không tự chứng minh mọi pool size đó là sản phẩm bao thương mại được bán. README nên tách mô hình toán học khỏi lựa chọn vé thực tế. Tên file power645.jsonl là tên kế thừa; sản phẩm hiện tại là Mega 6/45, không phải Power 6/55.

# **So sánh năm repository**

Chỉ vietlott-data là đối chiếu trực tiếp về dữ liệu Vietlott; bốn repo còn lại là chuẩn tham chiếu hạ tầng hoặc phương pháp, không phải đối thủ dự đoán vé số. So sánh từ tài liệu và trang repo chính thức, không tuyên bố đã chạy test hoặc audit toàn bộ các repo này. [^2]

| Repository | Điểm mạnh liên quan | Giới hạn và điều nên học |
| :---- | :---- | :---- |
| vietvudanh/vietlott-data | Pipeline Python, CLI backfill, nhiều sản phẩm, dữ liệu JSONL và thống kê. | Snapshot Mega trên README nguồn bắt đầu \#00198; không thay thế lịch sử đầy đủ của Lab. Học adapter và lịch chạy, vẫn kiểm tra nguồn. |
| mlflow/mlflow | Tracking tham số, metric, version mã và artifact; UI so sánh run. | Không cung cấp lợi thế xổ số hay chống peeking tự động. Học experiment detail và traceability trước khi thêm server lớn. |
| treeverse/dvc | Version dữ liệu và quản lý thí nghiệm; liên kết data với code. | Không phải crawler Vietlott. Với dataset nhỏ, Git+manifest có thể đủ; áp dụng khi snapshot/artifact lớn hơn. |
| scikit-learn/scikit-learn | Công cụ ML và TimeSeriesSplit cho thứ tự thời gian. | Không có luật giải Vietlott; chia temporal không tạo virgin holdout. Học split và pipeline chống leakage. |
| statsmodels/statsmodels | Ước lượng, suy luận, kiểm định thống kê và hiệu chỉnh nhiều kiểm định. | Không là UI xổ số hoặc kho thí nghiệm. Dùng làm oracle độc lập để đối chiếu HAC và p-value tự viết. |

## **Điểm mạnh tương đối của Lab**

Mã TypeScript nối khá nhất quán từ luật vé đến UI, có snapshot Mega từ kỳ đầu và kiểm tra dữ liệu rõ ràng. Bộ test có replay-freeze và negative controls; giao diện nói thẳng thống kê không phải dự đoán. Đây là nền tảng phù hợp để nghiên cứu có thể bác bỏ giả thuyết của chính mình.

## **Điểm yếu tương đối**

Phạm vi một sản phẩm; registry và trải nghiệm điều tra thí nghiệm còn đơn giản; chưa có CI trong repo được kiểm tra, chưa xác nhận build/E2E. Không nên thêm cả MLflow và DVC chỉ để tăng danh sách công nghệ. Ưu tiên contract dữ liệu và thí nghiệm trước, rồi chọn công cụ theo quy mô thực tế.

# **So sánh năm web app và công cụ web**

Đây là so sánh chức năng công khai, không đánh giá được backend riêng, tỷ lệ thắng, độ an toàn hoặc tính đúng của thuật toán đóng. Các tuyên bố AI của nhà cung cấp được coi là mô tả sản phẩm, không là bằng chứng hiệu quả. [^3]

| Sản phẩm | Mạnh ở đâu | Giới hạn và đề xuất cho Lab |
| :---- | :---- | :---- |
| Lotterycodex | Giải thích xác suất, tổ hợp, wheeling và giới hạn của phương pháp. | Thiên về toán học và công cụ; không thay pipeline Vietlott. Học giải thích điều kiện bảo đảm và chi phí. |
| dCode Covering Design | Generator và cover checker; hệ rút gọn, export kết quả. | Mã nguồn không công khai; một số cover tối ưu, một số không. Học checker độc lập và ghi rõ guarantee có điều kiện. |
| Lottery Post | Tra cứu, chart, phân tích bộ số, wheel và cộng đồng. | Nhiều công cụ dành Pick 3/4, không tương đương Mega. Học drill-down, lưu bộ lọc và tra cứu lịch sử. |
| LottoExpert | Tài khoản, kết quả, số xếp hạng, lưu dự đoán và review sau kỳ theo mô tả công khai. | Không xác minh edge của AI hoặc backend. Học luồng prediction → result; không sao chép ngôn ngữ hứa hẹn. |
| Vietlott Data website | Tổng quan nhiều sản phẩm, tần suất, ngày vắng mặt, tài liệu CLI. | Trang hiển thị snapshot có thể chậm hơn repo; không coi nhãn daily là bằng chứng đang cập nhật. Học khả năng khám phá dữ liệu. |

## **Khoảng trống sản phẩm nên tập trung**

Lab có cơ hội khác biệt bằng nghiên cứu Mega minh bạch: lịch sử đầy đủ, nguồn kiểm chứng, thí nghiệm khóa trước, kết quả cả thắng lẫn thua và giải thích bất định. Điều này hữu ích hơn việc thêm bảng “số mạnh nhất” không có kiểm định ngoài mẫu.

Hai nhóm covering tham chiếu chính là dCode và Lotterycodex, bổ sung Lottery Post Wheels. Hai nhóm thống kê trực tiếp là Lottery Post và Vietlott Data. MLflow và scikit-learn/DVC là tham chiếu cho vòng đời thí nghiệm và kiểm định, không có dữ liệu chứng minh chúng chọn được vé sinh lời.

# **Lộ trình sửa và tiêu chí hoàn tất**

| Ưu tiên | Công việc và người phụ trách | Điều kiện nghiệm thu |
| :---- | :---- | :---- |
| P0 trước tuyên bố edge | Research: giữ trạng thái chưa chứng minh; sửa prospective gate và protocol binding. | Hash lệch, sau hạn hoặc data cũ đều bị từ chối; lịch sử đăng ký có bằng chứng thời điểm. |
| P1 đợt 1 | Backend: schema API/registry, giới hạn body, rate limit, redirect policy, single-flight. | Test invalid/oversize/force/redirect/concurrency đạt; không ghi sai snapshot; có log lỗi. |
| P1 đợt 1 | Data: scheduler local, retry, checkpoint, snapshot version và audit log. | Tắt UI vẫn cập nhật; chạy lại idempotent; upstream lỗi giữ bản tốt; báo missed draw. |
| P1 đợt 2 | Frontend và QA: offline fallback, Data Explorer, E2E; điều tra build. | Build sạch kết thúc; browser test desktop/mobile và offline đạt; không chỉ regex source. |
| P2 đợt 3 | Research: trang registry/scorecard, artifact immutable theo sự kiện, code hash, oracle thống kê. | Mọi metric truy về data/protocol/commit; tái chạy cho cùng kết quả trong sai số định trước. |
| P2 sau nền tảng | Product: export/import dữ liệu, lọc ngày/quý, MC interval, trạng thái clipboard. | Export có metadata; round-trip giữ hash; hiển thị precision và hạn chế mô phỏng. |
| P3 có điều kiện | Power 6/55 và mô hình mới. | Schema riêng số đặc biệt và jackpot, luật theo phiên bản, bộ test riêng; không copy cấu hình 6/45. |

## **Giữ sửa thêm và chưa làm**

Giữ: core tổ hợp, schema dữ liệu, kiểm tra gap/conflict, null model, negative controls và thông điệp trung thực. Sửa: các ranh giới tin cậy, cache, pipeline build và tài liệu lỗi thời. Thêm: scheduler thực, khám phá dữ liệu, lịch sử thí nghiệm có thể truy vết và E2E. Chưa làm: hệ thống mua vé tự động, gấp thếp, dự báo lợi nhuận chắc chắn hoặc mở rộng ML không có protocol.

## **Định nghĩa done**

Một tính năng chỉ done khi có hành vi người dùng được xác định, lỗi và dữ liệu biên được xử lý, test chạy được trong CI, kiểm thử tích hợp phù hợp và tài liệu khớp code. Một thuật toán chỉ có bằng chứng edge khi vượt đối chứng cùng ngân sách trên dữ liệu ngoài mẫu thật theo tiêu chuẩn khóa trước; unit test xanh không đáp ứng điều kiện đó.

# **Nguồn và cách tái lập**

Các liên kết mã nguồn bên dưới cố định commit để tránh nội dung audit thay đổi khi main tiếp tục được cập nhật. Nguồn web được xem ngày 13/09/2026; không dùng số sao GitHub hoặc quảng cáo làm thước đo hiệu quả. Các phát hiện security là review code và thử nghiệm mock, không phải pentest dịch vụ đang chạy.

[Repo tại commit audit](https://github.com/howtodonextcom-art/260909-AI-Research-Lab/tree/058f3162c3fdfbc0883eab96e7be7ecd0b93dcbf/)

[Frontend và các tab](https://github.com/howtodonextcom-art/260909-AI-Research-Lab/blob/058f3162c3fdfbc0883eab96e7be7ecd0b93dcbf/app/page.tsx)

[API refresh](https://github.com/howtodonextcom-art/260909-AI-Research-Lab/blob/058f3162c3fdfbc0883eab96e7be7ecd0b93dcbf/app/api/data/refresh/route.ts)

[HTTP redirect policy](https://github.com/howtodonextcom-art/260909-AI-Research-Lab/blob/058f3162c3fdfbc0883eab96e7be7ecd0b93dcbf/lib/data/http.ts)

[Luồng load cache](https://github.com/howtodonextcom-art/260909-AI-Research-Lab/blob/058f3162c3fdfbc0883eab96e7be7ecd0b93dcbf/lib/data/refresh.ts)

[Cache upstream](https://github.com/howtodonextcom-art/260909-AI-Research-Lab/blob/058f3162c3fdfbc0883eab96e7be7ecd0b93dcbf/lib/data/official-fetch-cache.ts)

[Prospective gate](https://github.com/howtodonextcom-art/260909-AI-Research-Lab/blob/058f3162c3fdfbc0883eab96e7be7ecd0b93dcbf/lib/research/prospective.ts)

[CLI prospective](https://github.com/howtodonextcom-art/260909-AI-Research-Lab/blob/058f3162c3fdfbc0883eab96e7be7ecd0b93dcbf/scripts/research-prospective.ts)

[Registry schema](https://github.com/howtodonextcom-art/260909-AI-Research-Lab/blob/058f3162c3fdfbc0883eab96e7be7ecd0b93dcbf/lib/research/experiments.ts)

[Backtest và thống kê](https://github.com/howtodonextcom-art/260909-AI-Research-Lab/blob/058f3162c3fdfbc0883eab96e7be7ecd0b93dcbf/lib/analytics.ts)

[Ranking score stub](https://github.com/howtodonextcom-art/260909-AI-Research-Lab/blob/058f3162c3fdfbc0883eab96e7be7ecd0b93dcbf/lib/research/ranking-score.ts)

[Vietlott Data repository](https://github.com/vietvudanh/vietlott-data)

[MLflow tracking](https://mlflow.org/docs/latest/ml/tracking/)

[MLflow repository](https://github.com/mlflow/mlflow)

[DVC repository](https://github.com/treeverse/dvc)

[scikit learn TimeSeriesSplit](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html)

[scikit learn repository](https://github.com/scikit-learn/scikit-learn)

[statsmodels repository](https://github.com/statsmodels/statsmodels)

[Lotterycodex](https://lotterycodex.com/)

[dCode covering design](https://www.dcode.fr/covering-design-lottery)

[Lottery Post systems](https://www.lotterypost.com/systems)

[Lottery Post wheels](https://www.lotterypost.com/wheels)

[LottoExpert](https://lottoexpert.net/)

[Vietlott Data website](https://vietvudanh.github.io/vietlott-data/)

Lệnh tái lập trên checkout sạch: npm run install:ci; npm test; npm run lint; npm run data:check; npm run data:status:json; npm run data:verify-live. Chạy npm run build với timeout của môi trường CI và lưu log đầy đủ. Không chạy các CLI ghi dữ liệu hoặc research artifact trực tiếp lên worktree đang audit.

[^1]:  Mã nguồn cố định commit 058f316 và manifest được dẫn trong mục Nguồn và cách tái lập.

[^2]:  Nguồn chính thức của năm repository và tài liệu phương pháp được liên kết ở cuối báo cáo.

[^3]:  Đối chiếu các trang sản phẩm chính thức ngày 13/09/2026; xem các liên kết web ở cuối báo cáo.