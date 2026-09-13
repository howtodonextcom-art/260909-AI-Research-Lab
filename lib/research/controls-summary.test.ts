import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { DrawRecord } from "../analytics";
import { parseDrawsJsonl } from "../data/jsonl";
import { createRng, drawFairTicket } from "./rng";
import { runControlsSummary, type ControlId } from "./controls-summary";

const EXPECTED_IDS: ControlId[] = ["A", "B", "C", "E", "F"];

function syntheticDraws(n: number, seed: number): DrawRecord[] {
  const rng = createRng(seed);
  return Array.from({ length: n }, (_, i) => ({
    date: `20${String(10 + Math.floor(i / 300)).padStart(2, "0")}-${String((Math.floor(i / 25) % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    id: String(i + 1).padStart(5, "0"),
    result: drawFairTicket(rng),
  }));
}

test("runControlsSummary: trả về đúng 5 mục A/B/C/E/F theo thứ tự, mỗi mục có status + keyNumber + note", () => {
  const summary = runControlsSummary(syntheticDraws(300, 7), () => new Date("2026-09-13T00:00:00.000Z"));
  assert.equal(summary.items.length, 5);
  assert.deepEqual(summary.items.map((item) => item.id), EXPECTED_IDS);
  for (const item of summary.items) {
    assert.ok(["PASS", "ĐÁNG CHÚ Ý", "KHÔNG ĐỦ DỮ LIỆU"].includes(item.status));
    assert.equal(typeof item.keyNumber, "number");
    assert.ok(Number.isFinite(item.keyNumber));
    assert.ok(item.title.length > 0);
    assert.ok(item.note.length > 0);
  }
  assert.equal(summary.generatedAt, "2026-09-13T00:00:00.000Z");
});

test("runControlsSummary: dataset quá ngắn (≤ lookback) → B/C/E/F báo KHÔNG ĐỦ DỮ LIỆU, không throw, không giả mạo PASS", () => {
  const summary = runControlsSummary(syntheticDraws(50, 1));
  assert.equal(summary.drawCount, 0);
  const byId = Object.fromEntries(summary.items.map((item) => [item.id, item]));
  assert.equal(byId.A.status, byId.A.status); // A vẫn chạy (không phụ thuộc draws)
  assert.notEqual(byId.A.status, "KHÔNG ĐỦ DỮ LIỆU");
  for (const id of ["B", "C", "E", "F"] as ControlId[]) {
    assert.equal(byId[id].status, "KHÔNG ĐỦ DỮ LIỆU");
  }
});

test("runControlsSummary: dataset rỗng là an toàn, không throw", () => {
  assert.doesNotThrow(() => runControlsSummary([]));
});

test("runControlsSummary: Control F phải luôn PASS (control ngược — battery phải phát hiện được rò rỉ cố ý)", () => {
  const summary = runControlsSummary(syntheticDraws(300, 3));
  const f = summary.items.find((item) => item.id === "F");
  assert.ok(f);
  assert.equal(f!.status, "PASS", "Control F không phát hiện được rò rỉ cố ý — bug nghiêm trọng trong battery");
});

test("runControlsSummary: chạy trên dataset thật (public/data/power645.jsonl) không throw và trả về summary hợp lệ", async () => {
  const root = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
  const text = await readFile(join(root, "public/data/power645.jsonl"), "utf8");
  const { records, issues } = parseDrawsJsonl(text);
  assert.equal(issues.length, 0, "snapshot thật phải parse sạch, không lỗi");
  assert.ok(records.length > 90, "snapshot thật phải đủ dài để chạy B/C/E/F");

  const summary = runControlsSummary(records);
  assert.equal(summary.items.length, 5);
  assert.equal(summary.drawCount, records.length);
  // Descriptive summary only — never asserts every control is PASS here,
  // because that would turn a read-only display module into a silent gate.
  // We only assert the shape is well-formed and F (the designed-to-fail
  // control) still correctly detects its deliberate leak on real data.
  const f = summary.items.find((item) => item.id === "F");
  assert.equal(f?.status, "PASS");
});
