import assert from "node:assert/strict";
import test from "node:test";
import { compareIdSets, runCrossCheck, selectDeterministicSampleIds } from "./cross-check";
import type { DrawRecord } from "./types";

function draws(n: number): DrawRecord[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i + 1).padStart(5, "0"),
    date: `2020-01-${String((i % 28) + 1).padStart(2, "0")}`,
    result: [1, 2, 3, 4, 5, (i % 39) + 7],
  }));
}

test("selectDeterministicSampleIds luôn gồm id đầu, cuối, giữa", () => {
  const ids = selectDeterministicSampleIds(draws(50), 5, 645);
  assert.ok(ids.includes("00001"));
  assert.ok(ids.includes("00050"));
  assert.ok(ids.includes("00026")); // Math.floor(50/2) = index 25 = 0-indexed 26th draw
});

test("selectDeterministicSampleIds tái lập được với cùng seed", () => {
  const data = draws(200);
  const a = selectDeterministicSampleIds(data, 8, 42);
  const b = selectDeterministicSampleIds(data, 8, 42);
  assert.deepEqual(a, b);
});

test("selectDeterministicSampleIds cho kết quả khác nhau với seed khác nhau", () => {
  const data = draws(200);
  const a = selectDeterministicSampleIds(data, 8, 1);
  const b = selectDeterministicSampleIds(data, 8, 2);
  assert.notDeepEqual(a, b);
});

test("selectDeterministicSampleIds với dataset rỗng trả về mảng rỗng", () => {
  assert.deepEqual(selectDeterministicSampleIds([], 5, 645), []);
});

test("runCrossCheck: mọi nguồn khớp nhau → PASS", async () => {
  const local = draws(10);
  const report = await runCrossCheck({
    localRecords: local,
    mirrorRecords: local,
    extraSampleSize: 3,
    seed: 645,
    fetchDetail: async (id) => local.find((r) => r.id === id)!,
  });
  assert.equal(report.status, "PASS");
  assert.equal(report.failureCount, 0);
  assert.equal(report.fetchErrorCount, 0);
});

test("runCrossCheck: trang chi tiết khác local → FAIL với lý do rõ ràng", async () => {
  const local = draws(10);
  const report = await runCrossCheck({
    localRecords: local,
    mirrorRecords: local,
    fetchDetail: async (id) => {
      const record = local.find((r) => r.id === id)!;
      if (id === local[0].id) return { ...record, result: [9, 10, 11, 12, 13, 14] };
      return record;
    },
  });
  assert.equal(report.status, "FAIL");
  assert.ok(report.failureCount >= 1);
  const failing = report.results.find((r) => r.id === local[0].id)!;
  assert.match(failing.mismatches.join(" | "), /≠ trang chi tiết/);
});

test("runCrossCheck: mirror khác local → FAIL", async () => {
  const local = draws(10);
  const mirror = local.map((r) => (r.id === local[0].id ? { ...r, date: "1999-01-01" } : r));
  const report = await runCrossCheck({
    localRecords: local,
    mirrorRecords: mirror,
    fetchDetail: async (id) => local.find((r) => r.id === id)!,
  });
  assert.equal(report.status, "FAIL");
  const failing = report.results.find((r) => r.id === local[0].id)!;
  assert.match(failing.mismatches.join(" | "), /≠ mirror/);
});

test("runCrossCheck: lỗi lấy trang chi tiết (offline) → PARTIAL, không phải FAIL", async () => {
  const local = draws(10);
  const report = await runCrossCheck({
    localRecords: local,
    mirrorRecords: local,
    fetchDetail: async () => {
      throw new Error("network unreachable");
    },
  });
  assert.equal(report.status, "PARTIAL");
  assert.equal(report.failureCount, 0);
  assert.ok(report.fetchErrorCount > 0);
});

test("runCrossCheck: mirror không khả dụng (null) không tự sinh mismatch", async () => {
  const local = draws(10);
  const report = await runCrossCheck({
    localRecords: local,
    mirrorRecords: null,
    fetchDetail: async (id) => local.find((r) => r.id === id)!,
  });
  assert.equal(report.status, "PASS");
});

test("runCrossCheck: dataset rỗng → EMPTY", async () => {
  const report = await runCrossCheck({ localRecords: [], mirrorRecords: [], fetchDetail: async () => ({}) });
  assert.equal(report.status, "EMPTY");
});

test("compareIdSets: official vs mirror — chỉ local / chỉ mirror / chung", () => {
  const local = draws(5);
  const mirror = [...local.slice(0, 4), { id: "00099", date: "2020-02-01", result: [1, 2, 3, 4, 5, 6] }];
  const compare = compareIdSets(local, mirror);
  assert.equal(compare.compared, true);
  assert.deepEqual(compare.onlyLocal, ["00005"]);
  assert.deepEqual(compare.onlyMirror, ["00099"]);
  assert.equal(compare.sharedCount, 4);
});

test("compareIdSets: mirror null thì không đối chiếu tập id", () => {
  const compare = compareIdSets(draws(3), null);
  assert.equal(compare.compared, false);
  assert.deepEqual(compare.onlyLocal, []);
  assert.deepEqual(compare.onlyMirror, []);
});

test("runCrossCheck gắn idSet vào báo cáo", async () => {
  const local = draws(10);
  const report = await runCrossCheck({
    localRecords: local,
    mirrorRecords: local,
    extraSampleSize: 1,
    fetchDetail: async (id) => local.find((r) => r.id === id)!,
  });
  assert.equal(report.idSet.compared, true);
  assert.equal(report.idSet.sharedCount, 10);
});
