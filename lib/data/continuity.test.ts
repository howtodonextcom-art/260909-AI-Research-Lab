import assert from "node:assert/strict";
import test from "node:test";
import { analyzeContinuity } from "./continuity";
import type { DrawRecord } from "./types";

function draw(id: string, date: string): DrawRecord {
  return { id, date, result: [1, 2, 3, 4, 5, 6] };
}

test("dataset rỗng: continuous = true, không có gì để báo", () => {
  const report = analyzeContinuity([]);
  assert.deepEqual(report, {
    firstId: null,
    latestId: null,
    recordCount: 0,
    expectedCount: null,
    missingIds: [],
    duplicateIds: [],
    continuous: true,
  });
});

test("dataset liền mạch từ 00001 đến latest: continuous = true, missingIds rỗng", () => {
  const records = [draw("00001", "2016-07-20"), draw("00002", "2016-07-22"), draw("00003", "2016-07-24")];
  const report = analyzeContinuity(records);
  assert.equal(report.firstId, "00001");
  assert.equal(report.latestId, "00003");
  assert.equal(report.recordCount, 3);
  assert.equal(report.expectedCount, 3);
  assert.deepEqual(report.missingIds, []);
  assert.deepEqual(report.duplicateIds, []);
  assert.equal(report.continuous, true);
});

test("thiếu một kỳ ở giữa: missingIds báo đúng id thiếu, continuous = false", () => {
  const records = [draw("00001", "2016-07-20"), draw("00003", "2016-07-24"), draw("00004", "2016-07-26")];
  const report = analyzeContinuity(records);
  assert.deepEqual(report.missingIds, ["00002"]);
  assert.equal(report.expectedCount, 4);
  assert.equal(report.recordCount, 3);
  assert.equal(report.continuous, false);
});

test("nhiều kỳ liên tiếp bị thiếu đều được liệt kê", () => {
  const records = [draw("00001", "2016-07-20"), draw("00005", "2016-08-01")];
  const report = analyzeContinuity(records);
  assert.deepEqual(report.missingIds, ["00002", "00003", "00004"]);
});

test("id trùng lặp được phát hiện qua duplicateIds, không tính là thiếu", () => {
  const records = [draw("00001", "2016-07-20"), draw("00002", "2016-07-22"), draw("00002", "2016-07-22")];
  const report = analyzeContinuity(records);
  assert.deepEqual(report.duplicateIds, ["00002"]);
  assert.deepEqual(report.missingIds, []);
  assert.equal(report.continuous, false);
});

test("firstId/latestId không phụ thuộc thứ tự đầu vào", () => {
  const records = [draw("00003", "2016-07-24"), draw("00001", "2016-07-20"), draw("00002", "2016-07-22")];
  const report = analyzeContinuity(records);
  assert.equal(report.firstId, "00001");
  assert.equal(report.latestId, "00003");
});
