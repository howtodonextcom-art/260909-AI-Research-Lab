import assert from "node:assert/strict";
import test from "node:test";
import type { DrawRecord } from "../analytics";
import { assertNoFutureLeakage, computeNumberFeatures } from "./features";

function draw(id: string, date: string, result: number[]): DrawRecord {
  return { id, date, result };
}

const SAFE_HISTORY: DrawRecord[] = [
  draw("00001", "2026-01-01", [1, 2, 3, 4, 5, 6]),
  draw("00002", "2026-01-03", [7, 8, 9, 10, 11, 12]),
  draw("00003", "2026-01-05", [1, 8, 13, 14, 15, 16]),
];

test("computeNumberFeatures: historySize khớp đúng độ dài history truyền vào, không lớn hơn", () => {
  const result = computeNumberFeatures(SAFE_HISTORY);
  assert.equal(result.historySize, 3);
  assert.equal(result.features.length, 45);
});

test("computeNumberFeatures: count/gap tính đúng từ calculateFrequency, không đọc gì ngoài history", () => {
  const result = computeNumberFeatures(SAFE_HISTORY);
  const number1 = result.features.find((f) => f.number === 1)!;
  // 1 appears in draws 00001 (index 0) and 00003 (index 2, the most recent) -> gap 0.
  assert.equal(number1.count, 2);
  assert.equal(number1.gap, 0);
  const number20 = result.features.find((f) => f.number === 20)!;
  assert.equal(number20.count, 0);
  assert.equal(number20.gap, 3); // never seen -> draws.length
});

test("computeNumberFeatures: history rỗng trả về đặc trưng hợp lệ, không throw", () => {
  const result = computeNumberFeatures([]);
  assert.equal(result.historySize, 0);
  assert.equal(result.features.length, 45);
  for (const feature of result.features) {
    assert.equal(feature.count, 0);
    assert.equal(feature.expected, 0);
  }
});

test("assertNoFutureLeakage: KHÔNG throw khi mọi kỳ trong history đều trước targetDate", () => {
  assert.doesNotThrow(() => assertNoFutureLeakage(SAFE_HISTORY, "2026-01-06"));
});

test("assertNoFutureLeakage: KHÔNG throw khi targetDate đúng bằng ngày kỳ liền sau history (biên hợp lệ)", () => {
  assert.doesNotThrow(() => assertNoFutureLeakage(SAFE_HISTORY, "2026-01-06"));
});

test("assertNoFutureLeakage: PHẢI throw khi history chứa một kỳ có date >= targetDate (rò rỉ tương lai)", () => {
  const leaky: DrawRecord[] = [...SAFE_HISTORY, draw("00004", "2026-01-07", [20, 21, 22, 23, 24, 25])];
  assert.throws(
    () => assertNoFutureLeakage(leaky, "2026-01-07"),
    /Rò rỉ dữ liệu tương lai/,
  );
});

test("assertNoFutureLeakage: PHẢI throw khi kỳ rò rỉ có date bằng đúng targetDate (biên >=, không phải >)", () => {
  const leaky: DrawRecord[] = [...SAFE_HISTORY, draw("00004", "2026-01-05", [20, 21, 22, 23, 24, 25])];
  // targetDate equal to an existing history date is itself already a leak: the
  // convention is drawDate < target, so history must never contain target's date.
  assert.throws(() => assertNoFutureLeakage(leaky, "2026-01-05"));
});

test("assertNoFutureLeakage: thông báo lỗi nêu rõ kỳ vi phạm để dễ debug", () => {
  const leaky: DrawRecord[] = [...SAFE_HISTORY, draw("00099", "2026-02-01", [30, 31, 32, 33, 34, 35])];
  try {
    assertNoFutureLeakage(leaky, "2026-01-10");
    assert.fail("phải throw");
  } catch (error) {
    assert.match((error as Error).message, /00099/);
    assert.match((error as Error).message, /2026-02-01/);
  }
});

test("Kịch bản end-to-end phải-fail: history rò rỉ một kỳ >= target -> assertNoFutureLeakage throw TRƯỚC khi tính feature", () => {
  const target = "2026-01-06";
  const leakedHistory: DrawRecord[] = [...SAFE_HISTORY, draw("00004", "2026-01-06", [17, 18, 19, 20, 21, 22])];
  assert.throws(() => {
    assertNoFutureLeakage(leakedHistory, target);
    // Never reached when the tripwire works — computeNumberFeatures must not
    // be allowed to silently run on leaked history.
    computeNumberFeatures(leakedHistory);
  });
});
