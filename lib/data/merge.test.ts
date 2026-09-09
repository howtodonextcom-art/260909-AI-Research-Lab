import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { mergeDraws, validateDataset } from "./merge";
import { parseDrawsJsonl } from "./jsonl";
import type { DrawRecord } from "./types";

const fixtures = path.join(fileURLToPath(new URL("../../", import.meta.url)), "test/fixtures");
const load = (name: string) => parseDrawsJsonl(readFileSync(path.join(fixtures, name), "utf8")).records;

const draw = (id: string, date: string, result: number[]): DrawRecord => ({ id, date, result });

test("dataset rỗng nhận toàn bộ bản ghi mới", () => {
  const incoming = load("draws-valid.jsonl");
  const merged = mergeDraws([], incoming);
  assert.equal(merged.added, 3);
  assert.equal(merged.records.length, 3);
  assert.equal(merged.conflicts.length, 0);
});

test("gộp lại chính nó không tạo bản ghi mới", () => {
  const existing = load("draws-valid.jsonl");
  const merged = mergeDraws(existing, existing);
  assert.equal(merged.added, 0);
  assert.equal(merged.unchanged, 3);
  assert.equal(merged.records.length, 3);
});

test("bản ghi trùng hệt nhau bị khử trùng lặp", () => {
  const existing = load("draws-valid.jsonl");
  const merged = mergeDraws(existing, load("draws-duplicate.jsonl"));
  assert.equal(merged.added, 0);
  assert.equal(merged.duplicates, 1, "dòng lặp thứ hai trong batch được đếm là duplicate");
  assert.equal(merged.records.length, 3);
});

test("xung đột cùng mã kỳ khác kết quả KHÔNG ghi đè dữ liệu cũ", () => {
  const existing = load("draws-valid.jsonl");
  const merged = mergeDraws(existing, load("draws-conflict.jsonl"));

  assert.equal(merged.conflicts.length, 1);
  assert.equal(merged.conflicts[0].id, "00198");
  assert.deepEqual(merged.conflicts[0].existing.result, [12, 17, 23, 25, 34, 38]);
  assert.deepEqual(merged.conflicts[0].incoming.result, [1, 2, 3, 4, 5, 6]);

  const kept = merged.records.find((record) => record.id === "00198")!;
  assert.deepEqual(kept.result, [12, 17, 23, 25, 34, 38], "giá trị cũ phải được giữ nguyên");
});

test("cập nhật tăng dần chỉ thêm đúng kỳ mới", () => {
  const existing = load("draws-valid.jsonl");
  const incoming = [...existing, draw("00201", "2017-11-01", [2, 4, 6, 8, 10, 12])];
  const merged = mergeDraws(existing, incoming);
  assert.equal(merged.added, 1);
  assert.equal(merged.unchanged, 3);
  assert.equal(merged.records.length, 4);
  assert.equal(merged.records.at(-1)!.id, "00201");
});

test("gộp không bao giờ làm mất dữ liệu cũ", () => {
  const existing = load("draws-valid.jsonl");
  const merged = mergeDraws(existing, [draw("00999", "2026-01-01", [1, 2, 3, 4, 5, 6])]);
  for (const record of existing) {
    assert.ok(merged.records.some((r) => r.id === record.id), `mất kỳ ${record.id}`);
  }
});

test("kết quả gộp luôn được sắp xếp canonical", () => {
  const merged = mergeDraws(
    [draw("00200", "2017-10-29", [1, 2, 3, 4, 5, 6])],
    [draw("00198", "2017-10-25", [1, 2, 3, 4, 5, 7])],
  );
  assert.deepEqual(merged.records.map((r) => r.id), ["00198", "00200"]);
});

test("validateDataset bắt được mã kỳ trùng", () => {
  const result = validateDataset([
    draw("00198", "2017-10-25", [1, 2, 3, 4, 5, 6]),
    draw("00198", "2017-10-27", [1, 2, 3, 4, 5, 7]),
  ]);
  assert.equal(result.valid, false);
  assert.ok(result.issues[0].reason.includes("nhiều lần"));
});

test("validateDataset bắt được thứ tự sai", () => {
  const result = validateDataset([
    draw("00200", "2017-10-29", [1, 2, 3, 4, 5, 6]),
    draw("00198", "2017-10-25", [1, 2, 3, 4, 5, 7]),
  ]);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.reason.includes("canonical")));
});

test("validateDataset từ chối dataset lùi về quá khứ", () => {
  const records = load("draws-valid.jsonl");
  const ok = validateDataset(records, "2017-10-29");
  assert.equal(ok.valid, true);

  const regressed = validateDataset(records, "2026-09-06");
  assert.equal(regressed.valid, false);
  assert.ok(regressed.issues.some((issue) => issue.reason.includes("cũ hơn snapshot")));
});

test("dataset rỗng vẫn hợp lệ về mặt cấu trúc", () => {
  assert.equal(validateDataset([]).valid, true);
});
