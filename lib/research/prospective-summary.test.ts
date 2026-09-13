import assert from "node:assert/strict";
import test from "node:test";
import { buildProspectiveSummary, parseProspectiveSummary, type ProspectiveSummary } from "./prospective-summary";
import type { ProspectiveEntry } from "./prospective";

function entry(overrides: Partial<ProspectiveEntry> = {}): ProspectiveEntry {
  return {
    drawId: "01562",
    frozenAt: "2026-09-12T18:24:14.959Z",
    protocolHash: "abc",
    datasetHashAtFreeze: "def",
    strategyId: "RANDOM",
    prediction: [2, 11, 14, 15, 21, 30],
    result: null,
    matches: null,
    tier: null,
    ...overrides,
  };
}

test("mảng rỗng là trạng thái bình thường (chưa có kỳ prospective nào), không phải lỗi", () => {
  const summary = buildProspectiveSummary([], () => new Date("2026-09-13T00:00:00.000Z"));
  assert.equal(summary.totalFrozen, 0);
  assert.equal(summary.pendingCount, 0);
  assert.equal(summary.scoredCount, 0);
  assert.deepEqual(summary.entries, []);
});

test("entry có result=null được gắn PENDING", () => {
  const summary = buildProspectiveSummary([entry()]);
  assert.equal(summary.entries[0]?.status, "PENDING");
  assert.equal(summary.pendingCount, 1);
  assert.equal(summary.scoredCount, 0);
});

test("entry có result thật được gắn SCORED, giữ nguyên matches/tier", () => {
  const summary = buildProspectiveSummary([
    entry({ result: [2, 11, 14, 15, 21, 30], matches: 6, tier: "JACKPOT" }),
  ]);
  assert.equal(summary.entries[0]?.status, "SCORED");
  assert.equal(summary.entries[0]?.matches, 6);
  assert.equal(summary.entries[0]?.tier, "JACKPOT");
  assert.equal(summary.scoredCount, 1);
  assert.equal(summary.pendingCount, 0);
});

test("sắp xếp mới đóng băng trước", () => {
  const summary = buildProspectiveSummary([
    entry({ strategyId: "HOT", frozenAt: "2026-09-01T00:00:00.000Z" }),
    entry({ strategyId: "COLD", frozenAt: "2026-09-12T00:00:00.000Z" }),
  ]);
  assert.equal(summary.entries[0]?.strategyId, "COLD");
  assert.equal(summary.entries[1]?.strategyId, "HOT");
});

test("parseProspectiveSummary chấp nhận output hợp lệ của buildProspectiveSummary (round-trip qua JSON)", () => {
  const built = buildProspectiveSummary([entry(), entry({ strategyId: "HOT" })]);
  const roundTripped = parseProspectiveSummary(JSON.parse(JSON.stringify(built)));
  assert.deepEqual(roundTripped, built);
});

test("parseProspectiveSummary trả về null cho input hỏng (fail-closed, không throw)", () => {
  assert.equal(parseProspectiveSummary(null), null);
  assert.equal(parseProspectiveSummary({}), null);
  assert.equal(parseProspectiveSummary({ generatedAt: "x", totalFrozen: -1, pendingCount: 0, scoredCount: 0, entries: [] }), null);
  assert.equal(
    parseProspectiveSummary({
      generatedAt: "x",
      totalFrozen: 1,
      pendingCount: 1,
      scoredCount: 0,
      entries: [{ drawId: "01562", strategyId: "NOT_A_STRATEGY", frozenAt: "x", status: "PENDING", matches: null, tier: null }],
    }),
    null,
  );
});

test("parseProspectiveSummary từ chối status không hợp lệ", () => {
  const bad: unknown = {
    generatedAt: "2026-09-13T00:00:00.000Z",
    totalFrozen: 1,
    pendingCount: 1,
    scoredCount: 0,
    entries: [{ drawId: "01562", strategyId: "RANDOM", frozenAt: "x", status: "MAYBE", matches: null, tier: null }],
  };
  assert.equal(parseProspectiveSummary(bad), null);
});

const _typeCheck: ProspectiveSummary | null = parseProspectiveSummary(undefined);
void _typeCheck;
