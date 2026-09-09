import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateFrequency,
  createStrategyPick,
  filterByWindow,
  parseDraws,
  runTemporalBacktestReport,
  runWalkForwardBacktest,
  type DrawRecord,
} from "./analytics.ts";
import { validateNumbers } from "./mega645.ts";

const draws: DrawRecord[] = Array.from({ length: 120 }, (_, index) => ({
  date: new Date(Date.UTC(2025, 0, index + 1)).toISOString().slice(0, 10),
  id: String(index + 1).padStart(5, "0"),
  result: Array.from({ length: 6 }, (__, offset) => ((index + offset) % 45) + 1).sort((a, b) => a - b),
}));

test("parseDraws sắp xếp dữ liệu theo ngày", () => {
  const parsed = parseDraws('{"date":"2025-01-02","id":"2","result":[1,2,3,4,5,6]}\n{"date":"2025-01-01","id":"1","result":[7,8,9,10,11,12]}');
  assert.equal(parsed[0].id, "1");
});

test("parseDraws từ chối bản ghi sai hoặc trùng kỳ", () => {
  assert.throws(() => parseDraws('{"date":"2025-01-01","id":"1","result":[1,1,2,3,4,5]}'));
  assert.throws(() => parseDraws('{"date":"2025-01-01","id":"1","result":[1,2,3,4,5,6]}\n{"date":"2025-01-02","id":"1","result":[7,8,9,10,11,12]}'));
});

test("lọc đúng cửa sổ 30 ngày tính từ kỳ mới nhất", () => {
  assert.equal(filterByWindow(draws, "30D").length, 30);
  assert.equal(filterByWindow(draws, "ALL").length, 120);
});

test("tần suất luôn bảo toàn tổng số bóng", () => {
  const rows = calculateFrequency(draws);
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), draws.length * 6);
});

test("mọi chiến lược đều sinh một vé hợp lệ", () => {
  for (const strategy of ["RANDOM", "HOT", "COLD", "BALANCED"] as const) {
    assert.equal(validateNumbers(createStrategyPick(draws.slice(0, 90), strategy, 42)), true);
  }
});

test("walk-forward không nhìn trước và tạo đủ kết quả", () => {
  const results = runWalkForwardBacktest(draws, 90);
  assert.equal(results.length, 4);
  assert.equal(results[0].trials, 30);
  assert.ok(results.every((result) => Number.isFinite(result.roi)));
  assert.deepEqual(results, runWalkForwardBacktest(draws, 90));
});

test("pipeline train-validation-test chia theo thời gian và hiệu chỉnh nhiều chiến lược", () => {
  const report = runTemporalBacktestReport(draws, 90);
  assert.deepEqual(report.phases.map((phase) => phase.id), ["TRAIN", "VALIDATION", "TEST"]);
  assert.deepEqual(report.phases.map((phase) => phase.trials), [15, 7, 8]);
  assert.equal(report.results.length, 12);
  assert.equal(report.reliability.length, 3);
  assert.ok(report.results.every((result) => result.trials > 0));
  assert.ok(report.results.every((result) => result.pValueVsRandom >= 0 && result.pValueVsRandom <= 1));
  assert.ok(report.results.filter((result) => result.strategy !== "RANDOM").every((result) => result.adjustedPValue !== null && result.adjustedPValue >= 0 && result.adjustedPValue <= 1));
});

test("validation không thay đổi khi sửa kỳ holdout tương lai", () => {
  const baseline = runTemporalBacktestReport(draws, 90);
  const changedFuture = draws.map((draw) => ({ ...draw, result: [...draw.result] }));
  changedFuture[changedFuture.length - 1] = {
    ...changedFuture.at(-1)!,
    result: [40, 41, 42, 43, 44, 45],
  };
  const changed = runTemporalBacktestReport(changedFuture, 90);
  const baselineValidation = baseline.results.filter((result) => result.phase === "VALIDATION");
  const changedValidation = changed.results.filter((result) => result.phase === "VALIDATION");
  assert.deepEqual(changedValidation, baselineValidation);
});
