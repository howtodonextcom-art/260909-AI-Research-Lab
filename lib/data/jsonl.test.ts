import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parseDrawsJsonl, parseJsonlRows, serializeDrawsJsonl } from "./jsonl";
import { sha256Hex } from "./hash";

const fixtures = path.join(fileURLToPath(new URL("../../", import.meta.url)), "test/fixtures");
const readFixture = (name: string) => readFileSync(path.join(fixtures, name), "utf8");

test("đọc được fixture hợp lệ", () => {
  const parsed = parseDrawsJsonl(readFixture("draws-valid.jsonl"));
  assert.equal(parsed.records.length, 3);
  assert.equal(parsed.issues.length, 0);
  assert.equal(parsed.records[0].id, "00198");
  assert.equal(parsed.records.at(-1)!.id, "00200");
});

test("báo cáo từng bản ghi lỗi thay vì bỏ qua im lặng", () => {
  const parsed = parseDrawsJsonl(readFixture("draws-invalid.jsonl"));
  assert.equal(parsed.records.length, 1, "chỉ bản ghi đầu tiên hợp lệ");
  assert.equal(parsed.issues.length, 7, "bảy bản ghi lỗi đều phải được báo cáo");
  for (const issue of parsed.issues) assert.ok(issue.reason.length > 0);
});

test("dòng JSON hỏng được báo cáo kèm số dòng", () => {
  const { rows, issues } = parseJsonlRows('{"a":1}\nkhông-phải-json\n{"b":2}\n');
  assert.equal(rows.length, 2);
  assert.equal(issues.length, 1);
  assert.ok(issues[0].reason.includes("dòng 2"));
});

test("bỏ qua dòng trống mà không coi là lỗi", () => {
  const parsed = parseDrawsJsonl(`\n${readFixture("draws-valid.jsonl")}\n\n`);
  assert.equal(parsed.records.length, 3);
  assert.equal(parsed.issues.length, 0);
});

test("serialize là canonical và round-trip không đổi", () => {
  const parsed = parseDrawsJsonl(readFixture("draws-valid.jsonl"));
  const once = serializeDrawsJsonl(parsed.records);
  const twice = serializeDrawsJsonl(parseDrawsJsonl(once).records);
  assert.equal(once, twice);
  assert.ok(once.endsWith("\n"));
});

test("thứ tự đầu vào không ảnh hưởng bytes đầu ra hay hash", async () => {
  const parsed = parseDrawsJsonl(readFixture("draws-valid.jsonl"));
  const forward = serializeDrawsJsonl(parsed.records);
  const reversed = serializeDrawsJsonl([...parsed.records].reverse());
  assert.equal(forward, reversed);
  assert.equal(await sha256Hex(forward), await sha256Hex(reversed));
});

test("hash thay đổi khi dữ liệu thay đổi", async () => {
  const parsed = parseDrawsJsonl(readFixture("draws-valid.jsonl"));
  const original = await sha256Hex(serializeDrawsJsonl(parsed.records));
  const mutated = await sha256Hex(
    serializeDrawsJsonl([...parsed.records, { date: "2017-11-01", id: "00201", result: [2, 4, 6, 8, 10, 12] }]),
  );
  assert.notEqual(original, mutated);
});

test("snapshot bundled thật đã ở dạng canonical", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const text = readFileSync(path.join(root, "public/data/power645.jsonl"), "utf8");
  const parsed = parseDrawsJsonl(text);
  assert.equal(parsed.issues.length, 0, "snapshot kèm theo không được chứa bản ghi lỗi");
  assert.equal(serializeDrawsJsonl(parsed.records), text, "snapshot phải bằng đúng dạng canonical");
});
