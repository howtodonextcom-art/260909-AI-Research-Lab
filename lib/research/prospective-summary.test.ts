import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProspectiveSummary,
  deriveChainHealth,
  parseProspectiveSummary,
  type ProspectiveChainHealth,
  type ProspectiveSummary,
} from "./prospective-summary";
import type { ProspectiveChainResult, ProspectiveEntry } from "./prospective";

const NO_CHAIN: ProspectiveChainHealth = { chainedCount: 0, legacyCount: 0, verified: true, violationCount: 0 };

/** Mirrors today's real prospective-scorecard.jsonl state: 4 legacy entries, 0 chained, verification PASS. */
const FOUR_LEGACY_CHAIN: ProspectiveChainHealth = { chainedCount: 0, legacyCount: 4, verified: true, violationCount: 0 };

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
  const summary = buildProspectiveSummary([], NO_CHAIN, () => new Date("2026-09-13T00:00:00.000Z"));
  assert.equal(summary.totalFrozen, 0);
  assert.equal(summary.pendingCount, 0);
  assert.equal(summary.scoredCount, 0);
  assert.deepEqual(summary.entries, []);
  assert.deepEqual(summary.chainHealth, NO_CHAIN);
});

test("entry có result=null được gắn PENDING", () => {
  const summary = buildProspectiveSummary([entry()], NO_CHAIN);
  assert.equal(summary.entries[0]?.status, "PENDING");
  assert.equal(summary.pendingCount, 1);
  assert.equal(summary.scoredCount, 0);
});

test("entry có result thật được gắn SCORED, giữ nguyên matches/tier", () => {
  const summary = buildProspectiveSummary(
    [entry({ result: [2, 11, 14, 15, 21, 30], matches: 6, tier: "JACKPOT" })],
    NO_CHAIN,
  );
  assert.equal(summary.entries[0]?.status, "SCORED");
  assert.equal(summary.entries[0]?.matches, 6);
  assert.equal(summary.entries[0]?.tier, "JACKPOT");
  assert.equal(summary.scoredCount, 1);
  assert.equal(summary.pendingCount, 0);
});

test("sắp xếp mới đóng băng trước", () => {
  const summary = buildProspectiveSummary(
    [
      entry({ strategyId: "HOT", frozenAt: "2026-09-01T00:00:00.000Z" }),
      entry({ strategyId: "COLD", frozenAt: "2026-09-12T00:00:00.000Z" }),
    ],
    NO_CHAIN,
  );
  assert.equal(summary.entries[0]?.strategyId, "COLD");
  assert.equal(summary.entries[1]?.strategyId, "HOT");
});

test("parseProspectiveSummary chấp nhận output hợp lệ của buildProspectiveSummary (round-trip qua JSON)", () => {
  const built = buildProspectiveSummary([entry(), entry({ strategyId: "HOT" })], FOUR_LEGACY_CHAIN);
  const roundTripped = parseProspectiveSummary(JSON.parse(JSON.stringify(built)));
  assert.deepEqual(roundTripped, built);
});

test("parseProspectiveSummary trả về null cho input hỏng (fail-closed, không throw)", () => {
  assert.equal(parseProspectiveSummary(null), null);
  assert.equal(parseProspectiveSummary({}), null);
  assert.equal(
    parseProspectiveSummary({ generatedAt: "x", totalFrozen: -1, pendingCount: 0, scoredCount: 0, entries: [], chainHealth: NO_CHAIN }),
    null,
  );
  assert.equal(
    parseProspectiveSummary({
      generatedAt: "x",
      totalFrozen: 1,
      pendingCount: 1,
      scoredCount: 0,
      entries: [{ drawId: "01562", strategyId: "NOT_A_STRATEGY", frozenAt: "x", status: "PENDING", matches: null, tier: null }],
      chainHealth: NO_CHAIN,
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
    chainHealth: NO_CHAIN,
  };
  assert.equal(parseProspectiveSummary(bad), null);
});

test("parseProspectiveSummary trả null khi thiếu chainHealth hoặc chainHealth sai kiểu (GAP-04)", () => {
  const base = { generatedAt: "x", totalFrozen: 0, pendingCount: 0, scoredCount: 0, entries: [] };
  assert.equal(parseProspectiveSummary(base), null);
  assert.equal(parseProspectiveSummary({ ...base, chainHealth: null }), null);
  assert.equal(parseProspectiveSummary({ ...base, chainHealth: { chainedCount: 0, legacyCount: 0, verified: "yes", violationCount: 0 } }), null);
  assert.equal(parseProspectiveSummary({ ...base, chainHealth: { chainedCount: -1, legacyCount: 0, verified: true, violationCount: 0 } }), null);
});

test("deriveChainHealth ánh xạ đúng verifyProspectiveChain -> ProspectiveChainHealth (không tính toán lại, chỉ map)", () => {
  const chainResultOk: ProspectiveChainResult = { ok: true, violations: [], chainedCount: 2, legacyCount: 4 };
  assert.deepEqual(deriveChainHealth(chainResultOk), { chainedCount: 2, legacyCount: 4, verified: true, violationCount: 0 });

  const chainResultBad: ProspectiveChainResult = { ok: false, violations: ["dòng 3: hỏng"], chainedCount: 1, legacyCount: 4 };
  assert.deepEqual(deriveChainHealth(chainResultBad), { chainedCount: 1, legacyCount: 4, verified: false, violationCount: 1 });
});

test("deriveChainHealth phản ánh trung thực trạng thái thật hiện tại: 0 chained, 4 legacy, verified (không được làm tròn cho 'gọn' hơn)", () => {
  const realState: ProspectiveChainResult = { ok: true, violations: [], chainedCount: 0, legacyCount: 4 };
  const health = deriveChainHealth(realState);
  assert.equal(health.chainedCount, 0);
  assert.equal(health.legacyCount, 4);
  assert.equal(health.verified, true);
});

const _typeCheck: ProspectiveSummary | null = parseProspectiveSummary(undefined);
void _typeCheck;
