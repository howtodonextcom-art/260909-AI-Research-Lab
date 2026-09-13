# CLAUDE.md — Quy tắc bắt buộc cho dự án này

## README.md phải luôn khớp với mã nguồn hiện tại

**Bắt buộc:** bất kỳ thay đổi nào ảnh hưởng đến tính năng — thêm tính năng mới, sửa/thay đổi hành vi tính năng hiện có, hoặc xoá bỏ tính năng — đều phải cập nhật lại `README.md` tương ứng trong cùng lần thay đổi đó. Không hoãn việc này sang một lần commit sau.

Cụ thể, một thay đổi thuộc diện phải cập nhật README nếu nó:
- thêm/xoá một script npm trong `package.json`,
- thêm/xoá/đổi hành vi một module trong `lib/research/`, `lib/data/`, hoặc `lib/`,
- thêm/xoá/đổi một component hiển thị trên UI (`components/*.tsx`) hoặc một tab/panel trong `app/page.tsx`,
- đổi kiến trúc dữ liệu/provenance (protocol, registry, artifact, prospective ledger),
- đổi số lượng hoặc cấu trúc bộ test (bộ đối chứng âm, test suite chính),
- đổi trạng thái khoa học của dự án (grade, verdict, PENDING/SCORED),
- đổi CI workflow (`.github/workflows/ci.yml`).

Việc cập nhật KHÔNG được:
- copy nguyên văn nội dung cũ nếu chưa xác minh lại bằng mã nguồn/lệnh thật,
- thêm ngôn ngữ tiếp thị hoặc phóng đại không có bằng chứng,
- xoá hoặc làm mờ các cảnh báo/giới hạn khoa học đã có,
- để README ghi một tính năng không còn tồn tại trong mã nguồn, hoặc thiếu một tính năng đã thực sự tồn tại và có ý nghĩa với người dùng cuối/nhà nghiên cứu.

Trước khi coi một thay đổi tính năng là "xong", tự hỏi: *README.md đọc xong còn đúng với những gì mã nguồn vừa sửa không?* Nếu không, sửa README trước khi báo cáo hoàn thành, không chờ người dùng nhắc.

Đây là quy tắc đứng (standing rule), áp dụng cho mọi phiên làm việc trên repo này, không cần người dùng nhắc lại mỗi lần.
