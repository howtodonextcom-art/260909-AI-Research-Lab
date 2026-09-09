import assert from "node:assert/strict";
import test from "node:test";
import { compareDraws, isRealCalendarDate, normalizeDraw, recordsConflict, sortDraws } from "./schema";

test("chấp nhận bản ghi hợp lệ và giữ nguyên process_time", () => {
  const outcome = normalizeDraw({
    date: "2017-10-25",
    id: "00198",
    result: [12, 17, 23, 25, 34, 38],
    process_time: "2023-01-30 14:08:46.805928",
  });
  assert.equal(outcome.ok, true);
  assert.ok(outcome.ok);
  assert.deepEqual(outcome.record.result, [12, 17, 23, 25, 34, 38]);
  assert.equal(outcome.record.process_time, "2023-01-30 14:08:46.805928");
});

test("canonical hoá bằng cách sắp xếp result tăng dần", () => {
  const outcome = normalizeDraw({ date: "2017-10-25", id: "00198", result: [38, 12, 34, 17, 25, 23] });
  assert.ok(outcome.ok);
  assert.deepEqual(outcome.record.result, [12, 17, 23, 25, 34, 38]);
});

test("từ chối ngày không tồn tại trên lịch", () => {
  const outcome = normalizeDraw({ date: "2026-02-30", id: "00201", result: [1, 2, 3, 4, 5, 6] });
  assert.equal(outcome.ok, false);
  assert.ok(!outcome.ok && outcome.reason.includes("không tồn tại trên lịch"));
});

test("từ chối sai định dạng ngày", () => {
  const outcome = normalizeDraw({ date: "07-11-2017", id: "00205", result: [1, 2, 3, 4, 5, 6] });
  assert.equal(outcome.ok, false);
  assert.ok(!outcome.ok && outcome.reason.includes("YYYY-MM-DD"));
});

test("từ chối khi thiếu số", () => {
  const outcome = normalizeDraw({ date: "2017-11-01", id: "00202", result: [1, 2, 3, 4, 5] });
  assert.equal(outcome.ok, false);
  assert.ok(!outcome.ok && outcome.reason.includes("cần đúng 6"));
});

test("từ chối số ngoài khoảng 1–45", () => {
  for (const bad of [[1, 2, 3, 4, 5, 46], [0, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, -1]]) {
    const outcome = normalizeDraw({ date: "2017-11-03", id: "00203", result: bad });
    assert.equal(outcome.ok, false, `phải từ chối ${JSON.stringify(bad)}`);
    assert.ok(!outcome.ok && outcome.reason.includes("ngoài khoảng"));
  }
});

test("từ chối số trùng nhau trong cùng một kỳ", () => {
  const outcome = normalizeDraw({ date: "2017-11-05", id: "00204", result: [1, 2, 3, 4, 5, 5] });
  assert.equal(outcome.ok, false);
  assert.ok(!outcome.ok && outcome.reason.includes("trùng nhau"));
});

test("từ chối giá trị không phải số nguyên", () => {
  for (const bad of [[1, 2, 3, 4, 5, "6"], [1, 2, 3, 4, 5, 6.5], [1, 2, 3, 4, 5, null]]) {
    const outcome = normalizeDraw({ date: "2017-11-09", id: "00206", result: bad });
    assert.equal(outcome.ok, false, `phải từ chối ${JSON.stringify(bad)}`);
  }
});

test("từ chối id rỗng hoặc thiếu", () => {
  for (const id of ["", "   ", undefined, null, 42]) {
    const outcome = normalizeDraw({ date: "2017-11-07", id, result: [1, 2, 3, 4, 5, 6] });
    assert.equal(outcome.ok, false, `phải từ chối id ${JSON.stringify(id)}`);
  }
});

test("từ chối bản ghi không phải object", () => {
  for (const raw of [null, undefined, 42, "chuỗi", [1, 2, 3]]) {
    const outcome = normalizeDraw(raw);
    assert.equal(outcome.ok, false, `phải từ chối ${JSON.stringify(raw)}`);
  }
});

test("isRealCalendarDate phân biệt được năm nhuận", () => {
  assert.equal(isRealCalendarDate("2024-02-29"), true);
  assert.equal(isRealCalendarDate("2026-02-29"), false);
  assert.equal(isRealCalendarDate("2026-13-01"), false);
  assert.equal(isRealCalendarDate("2026-00-10"), false);
});

test("sắp xếp canonical theo ngày rồi tới mã kỳ", () => {
  const records = sortDraws([
    { date: "2017-10-27", id: "00199", result: [1, 2, 3, 4, 5, 6] },
    { date: "2017-10-25", id: "00198", result: [1, 2, 3, 4, 5, 6] },
    { date: "2017-10-25", id: "00197", result: [1, 2, 3, 4, 5, 6] },
  ]);
  assert.deepEqual(records.map((r) => r.id), ["00197", "00198", "00199"]);
  assert.equal(compareDraws(records[0], records[0]), 0);
});

test("phát hiện xung đột khi cùng mã kỳ nhưng khác kết quả hoặc khác ngày", () => {
  const base = { date: "2017-10-25", id: "00198", result: [1, 2, 3, 4, 5, 6] };
  assert.equal(recordsConflict(base, { ...base }), false);
  assert.equal(recordsConflict(base, { ...base, result: [1, 2, 3, 4, 5, 7] }), true);
  assert.equal(recordsConflict(base, { ...base, date: "2017-10-26" }), true);
});
