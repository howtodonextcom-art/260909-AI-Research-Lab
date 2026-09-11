import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDraw } from "../schema";
import {
  OfficialFetchError,
  OfficialParseError,
  discoverHistoryKey,
  extractBallNumbers,
  parseAjaxEnvelope,
  parseDetailHtml,
  parseHistoryHtml,
  parseVietnameseDate,
} from "./vietlott-official";

/** Row shape verified against a live fetch of the official history table on 2026-09-12. */
function historyRow(date: string, id: string, balls: number[]): string {
  const spans = balls.map((n, i) => `<span class="bong_tron ${i === balls.length - 1 ? "no-margin-right " : ""}">${n}</span>`).join("");
  return `<tr><td>${date}</td><td><a href="/vi/trung-thuong/ket-qua-trung-thuong/645?id=${id}&nocatche=1" target="_self">${id}</a></td><td><div class="day_so_ket_qua_v2" style="padding-top:15px">${spans}</div></td></tr>`;
}

function historyPage(rowsHtml: string): string {
  return `<div class="doso_output_nd table-responsive"><table class="table table-hover"><thead><tr><th>Ngày</th><th>Kỳ</th><th>Bộ số</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
}

test("trang lịch sử hợp lệ: parse đúng nhiều dòng và giữ nguyên id", () => {
  const html = historyPage(
    historyRow("11/09/2026", "01561", [14, 18, 20, 21, 26, 27]) + historyRow("09/09/2026", "01560", [12, 17, 20, 21, 36, 43]),
  );
  const outcome = parseHistoryHtml(html, false);
  assert.equal(outcome.state, "PARSE_SUCCESS");
  assert.ok(outcome.state === "PARSE_SUCCESS");
  assert.equal(outcome.rows.length, 2);
  assert.deepEqual(outcome.rows[0], { id: "01561", date: "2026-09-11", result: [14, 18, 20, 21, 26, 27] });
  assert.deepEqual(outcome.rows[1], { id: "01560", date: "2026-09-09", result: [12, 17, 20, 21, 36, 43] });
});

test("trang lịch sử khung bảng đã đổi giao diện (thiếu doso_output_nd/tbody) → PARSE_STRUCTURE_CHANGED", () => {
  const html = `<div class="some-new-wrapper"><ul><li>11/09/2026 #01561</li></ul></div>`;
  assert.throws(() => parseHistoryHtml(html, false), OfficialParseError);
  assert.throws(() => parseHistoryHtml(html, true), OfficialParseError);
});

test("trang lịch sử có khung hợp lệ nhưng 0 dòng, CHƯA chạm mốc lịch sử → PARSE_STRUCTURE_CHANGED (không suy diễn EOF)", () => {
  const html = historyPage("");
  assert.throws(() => parseHistoryHtml(html, false), OfficialParseError);
});

test("trang lịch sử có khung hợp lệ nhưng 0 dòng, ĐÃ chạm mốc lịch sử → PARSE_EMPTY_VALID_PAGE hợp lệ", () => {
  const html = historyPage("");
  const outcome = parseHistoryHtml(html, true);
  assert.equal(outcome.state, "PARSE_EMPTY_VALID_PAGE");
});

test("dòng lịch sử méo mó (thiếu bóng) vẫn được parser trích xuất thô, và bị normalizeDraw từ chối chứ không phải parser nuốt lỗi", () => {
  const html = historyPage(historyRow("11/09/2026", "01561", [14, 18, 20]));
  const outcome = parseHistoryHtml(html, false);
  assert.ok(outcome.state === "PARSE_SUCCESS");
  const result = normalizeDraw(outcome.rows[0]);
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.match(result.reason, /3 phần tử/);
});

test("dòng lịch sử có số ngoài khoảng 1–45 bị normalizeDraw từ chối", () => {
  const html = historyPage(historyRow("11/09/2026", "01561", [14, 18, 20, 21, 26, 99]));
  const outcome = parseHistoryHtml(html, false);
  assert.ok(outcome.state === "PARSE_SUCCESS");
  const result = normalizeDraw(outcome.rows[0]);
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.match(result.reason, /ngoài khoảng/);
});

test("dòng lịch sử có số trùng nhau trong cùng kỳ bị normalizeDraw từ chối", () => {
  const html = historyPage(historyRow("11/09/2026", "01561", [14, 14, 20, 21, 26, 27]));
  const outcome = parseHistoryHtml(html, false);
  assert.ok(outcome.state === "PARSE_SUCCESS");
  const result = normalizeDraw(outcome.rows[0]);
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.match(result.reason, /trùng nhau/);
});

test("ngày không tồn tại trên lịch (30 tháng 2) đi qua parser rồi bị normalizeDraw từ chối", () => {
  const html = historyPage(historyRow("30/02/2026", "01561", [14, 18, 20, 21, 26, 27]));
  const outcome = parseHistoryHtml(html, false);
  assert.ok(outcome.state === "PARSE_SUCCESS");
  const result = normalizeDraw(outcome.rows[0]);
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.match(result.reason, /không tồn tại trên lịch/);
});

test("parseVietnameseDate chuyển đúng định dạng và từ chối định dạng sai", () => {
  assert.equal(parseVietnameseDate("20/07/2016"), "2016-07-20");
  assert.throws(() => parseVietnameseDate("2016-07-20"), OfficialParseError);
});

test("extractBallNumbers đọc đúng số lượng span thực tế, kể cả sai số lượng", () => {
  assert.deepEqual(extractBallNumbers('<span class="bong_tron ">2</span><span class="bong_tron ">17</span>'), [2, 17]);
  assert.deepEqual(extractBallNumbers("không có span nào"), []);
});

test("trang chi tiết hợp lệ (đối chiếu #00001 thật, 2016-07-20)", () => {
  const html =
    '<h1>Kỳ quay thưởng <b>#00001</b> ngày <b>20/07/2016</b></h1>' +
    '<div class="day_so_ket_qua_v2" style="padding-top:15px"><span class="bong_tron ">2</span><span class="bong_tron ">17</span><span class="bong_tron ">33</span><span class="bong_tron ">37</span><span class="bong_tron ">38</span><span class="bong_tron no-margin-right ">45</span></div>';
  const raw = parseDetailHtml(html);
  assert.deepEqual(raw, { id: "00001", date: "2016-07-20", result: [2, 17, 33, 37, 38, 45] });
});

test("trang chi tiết thiếu tiêu đề kỳ quay → OfficialParseError", () => {
  assert.throws(() => parseDetailHtml("<div>không có gì liên quan</div>"), OfficialParseError);
});

test("trang chi tiết thiếu khối kết quả → OfficialParseError", () => {
  const html = '<h1>Kỳ quay thưởng <b>#00001</b> ngày <b>20/07/2016</b></h1>';
  assert.throws(() => parseDetailHtml(html), OfficialParseError);
});

test("discoverHistoryKey đọc đúng key AjaxPro từ trang landing", () => {
  const html = "Game645CompareWebPart.ServerSideDrawResult(RenderInfo, 'e3a051eb', ...)";
  assert.equal(discoverHistoryKey(html), "e3a051eb");
});

test("discoverHistoryKey từ chối khi không tìm thấy key", () => {
  assert.throws(() => discoverHistoryKey("<html>đổi giao diện hoàn toàn</html>"), OfficialParseError);
});

test("parseAjaxEnvelope đọc đúng HtmlContent khi phản hồi hợp lệ", () => {
  const text = JSON.stringify({ value: { HtmlContent: "<div>ok</div>", Error: false } });
  assert.equal(parseAjaxEnvelope(text), "<div>ok</div>");
});

test("parseAjaxEnvelope từ chối JSON hỏng", () => {
  assert.throws(() => parseAjaxEnvelope("{not json"), OfficialFetchError);
});

test("parseAjaxEnvelope từ chối phản hồi thiếu value (partial response)", () => {
  assert.throws(() => parseAjaxEnvelope(JSON.stringify({})), OfficialFetchError);
});

test("parseAjaxEnvelope từ chối khi value.Error = true", () => {
  const text = JSON.stringify({ value: { Error: true, InfoMessage: "Phiên đã hết hạn" } });
  assert.throws(() => parseAjaxEnvelope(text), OfficialFetchError);
});

test("parseAjaxEnvelope từ chối khi thiếu HtmlContent", () => {
  const text = JSON.stringify({ value: { Error: false } });
  assert.throws(() => parseAjaxEnvelope(text), OfficialFetchError);
});

test("parseAjaxEnvelope từ chối khi top-level error được báo", () => {
  const text = JSON.stringify({ error: "boom" });
  assert.throws(() => parseAjaxEnvelope(text), OfficialFetchError);
});
