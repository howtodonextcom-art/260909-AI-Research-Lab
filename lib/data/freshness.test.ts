import assert from "node:assert/strict";
import test from "node:test";
import { DATA_REFRESH_TTL_MS } from "./refresh";
import { FRESHNESS_STALE_AFTER_MS, assessFreshness } from "./freshness";

const NOW = Date.parse("2026-09-13T12:00:00.000Z");

test("assessFreshness: thiếu lastSuccessfulSync → Unknown", () => {
  const result = assessFreshness(null, NOW);
  assert.equal(result.label, "Unknown");
  assert.equal(result.ageMs, null);
  assert.match(result.detailVi, /không khẳng định/i);
});

test("assessFreshness: timestamp hỏng → Unknown", () => {
  assert.equal(assessFreshness("not-a-date", NOW).label, "Unknown");
});

test("assessFreshness: trong TTL → Fresh", () => {
  const sync = new Date(NOW - DATA_REFRESH_TTL_MS + 60_000).toISOString();
  const result = assessFreshness(sync, NOW);
  assert.equal(result.label, "Fresh");
  assert.ok(result.ageMs !== null && result.ageMs < DATA_REFRESH_TTL_MS);
});

test("assessFreshness: quá TTL nhưng ≤ 7 ngày → Delayed", () => {
  const sync = new Date(NOW - DATA_REFRESH_TTL_MS - 60_000).toISOString();
  assert.equal(assessFreshness(sync, NOW).label, "Delayed");
});

test("assessFreshness: cũ hơn 7 ngày → Stale", () => {
  const sync = new Date(NOW - FRESHNESS_STALE_AFTER_MS - 1).toISOString();
  const result = assessFreshness(sync, NOW);
  assert.equal(result.label, "Stale");
  assert.match(result.detailVi, /không được đọc như dữ liệu hiện hành/i);
});

test("ngưỡng Stale lớn hơn Fresh TTL (không chồng nhãn)", () => {
  assert.ok(FRESHNESS_STALE_AFTER_MS > DATA_REFRESH_TTL_MS);
});
