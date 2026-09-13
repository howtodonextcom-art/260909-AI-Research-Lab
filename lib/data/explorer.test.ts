import assert from "node:assert/strict";
import test from "node:test";
import { DRAW_EXPLORER_RESULT_CAP, filterDraws } from "./explorer";
import type { DrawRecord } from "./types";

function draw(id: string, date: string): DrawRecord {
  return { id, date, result: [1, 2, 3, 4, 5, 6] };
}

const SAMPLE: DrawRecord[] = [
  draw("00001", "2016-07-20"),
  draw("00002", "2016-07-22"),
  draw("01560", "2026-09-09"),
  draw("01561", "2026-09-11"),
];

test("query rỗng trả về không có kết quả (lựa chọn thiết kế: tránh đổ toàn bộ lịch sử ra DOM)", () => {
  const result = filterDraws(SAMPLE, {});
  assert.deepEqual(result, { matches: [], totalMatches: 0 });
});

test("lọc theo tiền tố id: khớp chính xác", () => {
  const result = filterDraws(SAMPLE, { idQuery: "01561" });
  assert.equal(result.totalMatches, 1);
  assert.equal(result.matches[0]?.id, "01561");
});

test("lọc theo tiền tố id: khớp nhiều bản ghi", () => {
  const result = filterDraws(SAMPLE, { idQuery: "015" });
  assert.equal(result.totalMatches, 2);
  assert.deepEqual(result.matches.map((r) => r.id).sort(), ["01560", "01561"]);
});

test("lọc theo khoảng ngày (bao gồm hai đầu mút)", () => {
  const result = filterDraws(SAMPLE, { fromDate: "2016-07-21", toDate: "2016-07-23" });
  assert.equal(result.totalMatches, 1);
  assert.equal(result.matches[0]?.id, "00002");
});

test("kết hợp lọc id và khoảng ngày", () => {
  const result = filterDraws(SAMPLE, { idQuery: "0000", fromDate: "2016-01-01", toDate: "2016-12-31" });
  assert.equal(result.totalMatches, 2);
  assert.deepEqual(result.matches.map((r) => r.id).sort(), ["00001", "00002"]);
});

test("kết hợp lọc không khớp gì trả về mảng rỗng, không throw", () => {
  const result = filterDraws(SAMPLE, { idQuery: "00001", fromDate: "2026-01-01" });
  assert.deepEqual(result, { matches: [], totalMatches: 0 });
});

test("kết quả được sắp mới nhất trước", () => {
  const result = filterDraws(SAMPLE, { idQuery: "0" });
  assert.equal(result.matches[0]?.id, "01561");
  assert.equal(result.matches.at(-1)?.id, "00001");
});

test("giới hạn số dòng hiển thị ở DRAW_EXPLORER_RESULT_CAP, totalMatches vẫn phản ánh số thật", () => {
  const many: DrawRecord[] = Array.from({ length: DRAW_EXPLORER_RESULT_CAP + 25 }, (_, index) =>
    draw(String(index).padStart(5, "0"), "2020-01-01"),
  );
  const result = filterDraws(many, { fromDate: "2019-01-01" });
  assert.equal(result.totalMatches, DRAW_EXPLORER_RESULT_CAP + 25);
  assert.equal(result.matches.length, DRAW_EXPLORER_RESULT_CAP);
});
