import assert from "node:assert/strict";
import test from "node:test";
import { evaluateTicket, type PrizeTier } from "../mega645";
import type { StrategyId } from "../analytics";
import {
  appendProspectiveResult,
  freezeProspectivePrediction,
  hasFrozenEntry,
  parseProspectiveScorecard,
  type ProspectiveEntry,
} from "./prospective";
import type { ProtocolLock } from "./protocol";

const LOCK: ProtocolLock = {
  protocolVersion: "test-1",
  protocolHash: "hash-test",
  protocolLockedAt: "2026-09-12T00:00:00.000Z",
  protocolDatasetHash: "dataset-test",
  prospectiveStartDrawId: "01562",
};

const baseInput = {
  strategyId: "HOT" as const,
  prediction: [6, 16, 22, 31, 36, 44],
  protocolHash: LOCK.protocolHash,
  datasetHashAtFreeze: LOCK.protocolDatasetHash,
  lock: LOCK,
  now: () => new Date("2026-09-13T00:00:00.000Z"),
};

test("freezeProspectivePrediction từ chối protocolHash lệch lock", () => {
  const result = freezeProspectivePrediction({
    ...baseInput,
    drawId: "01562",
    protocolHash: "changed-protocol",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /protocolHash/);
});

test("freezeProspectivePrediction từ chối khi knownDrawIds đã chứa kỳ mục tiêu", () => {
  const result = freezeProspectivePrediction({
    ...baseInput,
    drawId: "01562",
    knownDrawIds: ["01562"],
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /dataset đã biết/);
});

test("freezeProspectivePrediction từ chối kỳ cũ hơn mốc khóa (RETROSPECTIVE rõ ràng)", () => {
  const result = freezeProspectivePrediction({ ...baseInput, drawId: "01560" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /RETROSPECTIVE/);
    assert.match(result.reason, /01560/);
  }
});

test("freezeProspectivePrediction từ chối kỳ liền trước mốc khóa (vẫn RETROSPECTIVE)", () => {
  const result = freezeProspectivePrediction({ ...baseInput, drawId: "01561" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /RETROSPECTIVE/);
  }
});

test("freezeProspectivePrediction thành công đúng tại mốc khóa (PROSPECTIVE thật)", () => {
  const result = freezeProspectivePrediction({ ...baseInput, drawId: "01562" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.entry.drawId, "01562");
    assert.equal(result.entry.strategyId, "HOT");
    assert.deepEqual(result.entry.prediction, [6, 16, 22, 31, 36, 44]);
    assert.equal(result.entry.result, null);
    assert.equal(result.entry.matches, null);
    assert.equal(result.entry.tier, null);
    assert.equal(result.entry.frozenAt, "2026-09-13T00:00:00.000Z");
  }
});

test("freezeProspectivePrediction thành công cho kỳ xa hơn nữa trong tương lai", () => {
  const result = freezeProspectivePrediction({ ...baseInput, drawId: "01599" });
  assert.equal(result.ok, true);
});

test("freezeProspectivePrediction từ chối vé không hợp lệ ngay cả khi kỳ là PROSPECTIVE", () => {
  const result = freezeProspectivePrediction({ ...baseInput, drawId: "01562", prediction: [1, 2, 3, 4, 5, 5] });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /không hợp lệ/);
});

test("freezeProspectivePrediction từ chối khi chưa có mốc khóa (prospectiveStartDrawId null → mọi thứ RETROSPECTIVE)", () => {
  const unlocked: ProtocolLock = { ...LOCK, prospectiveStartDrawId: null };
  const result = freezeProspectivePrediction({ ...baseInput, drawId: "99999", lock: unlocked });
  assert.equal(result.ok, false);
});

test("appendProspectiveResult: happy path điền result/matches/tier cho đúng kỳ, giữ nguyên kỳ khác", () => {
  const frozen = freezeProspectivePrediction({ ...baseInput, drawId: "01562" });
  assert.equal(frozen.ok, true);
  if (!frozen.ok) return;
  const other = freezeProspectivePrediction({ ...baseInput, drawId: "01563", strategyId: "COLD", prediction: [1, 5, 18, 25, 34, 40] });
  assert.equal(other.ok, true);
  if (!other.ok) return;

  const entries: ProspectiveEntry[] = [frozen.entry, other.entry];
  const updated = appendProspectiveResult(entries, { drawId: "01562", result: [14, 18, 20, 21, 26, 27] });

  const scored = updated.find((e) => e.drawId === "01562");
  assert.ok(scored);
  assert.deepEqual(scored?.result, [14, 18, 20, 21, 26, 27]);
  assert.equal(scored?.matches, 0);
  assert.equal(scored?.tier, "NONE");

  // The other draw's entry must be untouched.
  const untouched = updated.find((e) => e.drawId === "01563");
  assert.deepEqual(untouched, other.entry);
});

test("appendProspectiveResult không ghi đè kết quả đã có (append-only)", () => {
  const frozen = freezeProspectivePrediction({ ...baseInput, drawId: "01562" });
  assert.equal(frozen.ok, true);
  if (!frozen.ok) return;
  const scoredOnce = appendProspectiveResult([frozen.entry], { drawId: "01562", result: [14, 18, 20, 21, 26, 27] });
  const scoredTwice = appendProspectiveResult(scoredOnce, { drawId: "01562", result: [1, 2, 3, 4, 5, 6] });
  assert.deepEqual(scoredTwice, scoredOnce);
});

test("appendProspectiveResult trên scorecard rỗng là no-op hợp lệ, không lỗi", () => {
  const updated = appendProspectiveResult([], { drawId: "01562", result: [14, 18, 20, 21, 26, 27] });
  assert.deepEqual(updated, []);
});

test("hasFrozenEntry nhận diện đúng theo (drawId, strategyId)", () => {
  const frozen = freezeProspectivePrediction({ ...baseInput, drawId: "01562" });
  assert.equal(frozen.ok, true);
  if (!frozen.ok) return;
  assert.equal(hasFrozenEntry([frozen.entry], "01562", "HOT"), true);
  assert.equal(hasFrozenEntry([frozen.entry], "01562", "COLD"), false);
  assert.equal(hasFrozenEntry([frozen.entry], "01563", "HOT"), false);
  assert.equal(hasFrozenEntry([], "01562", "HOT"), false);
});

test("parseProspectiveScorecard: chuỗi rỗng là scorecard hợp lệ (chưa có kỳ prospective thật nào)", () => {
  const result = parseProspectiveScorecard("");
  assert.deepEqual(result, { entries: [], issues: [] });
});

test("parseProspectiveScorecard: chuỗi chỉ toàn khoảng trắng cũng hợp lệ, rỗng", () => {
  const result = parseProspectiveScorecard("\n  \n\t\n");
  assert.deepEqual(result, { entries: [], issues: [] });
});

test("parseProspectiveScorecard: round-trip một dòng hợp lệ", () => {
  const frozen = freezeProspectivePrediction({ ...baseInput, drawId: "01562" });
  assert.equal(frozen.ok, true);
  if (!frozen.ok) return;
  const line = JSON.stringify(frozen.entry);
  const result = parseProspectiveScorecard(line);
  assert.equal(result.issues.length, 0);
  assert.deepEqual(result.entries, [frozen.entry]);
});

test("parseProspectiveScorecard: nhiều dòng, một dòng JSON hỏng bị báo lỗi rõ ràng, không rơi rớt âm thầm", () => {
  const frozen = freezeProspectivePrediction({ ...baseInput, drawId: "01562" });
  assert.equal(frozen.ok, true);
  if (!frozen.ok) return;
  const good = JSON.stringify(frozen.entry);
  const text = `${good}\nnot json at all\n${good}`;
  const result = parseProspectiveScorecard(text);
  assert.equal(result.entries.length, 2);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].line, 2);
  assert.match(result.issues[0].reason, /JSON không hợp lệ/);
});

test("parseProspectiveScorecard: từ chối bản ghi thiếu trường bắt buộc, không âm thầm chấp nhận", () => {
  const result = parseProspectiveScorecard(JSON.stringify({ drawId: "01562" }));
  assert.equal(result.entries.length, 0);
  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0].reason, /frozenAt/);
});

test("parseProspectiveScorecard: từ chối strategyId không hợp lệ", () => {
  const frozen = freezeProspectivePrediction({ ...baseInput, drawId: "01562" });
  assert.equal(frozen.ok, true);
  if (!frozen.ok) return;
  const bad = { ...frozen.entry, strategyId: "MOON_PHASE" };
  const result = parseProspectiveScorecard(JSON.stringify(bad));
  assert.equal(result.entries.length, 0);
  assert.match(result.issues[0].reason, /strategyId/);
});

// --- End-to-end mocked-#01562 scenario (§B3 P1: "End-to-end prospective
// append when fixture draw #01562 mocked"). This fixture is TEST-ONLY: the
// result below is a synthetic/fake draw, never written to the real
// `reports/prospective-scorecard.jsonl` or the real dataset. ---

test("Kịch bản đầy đủ #01562 (mocked): đóng băng 4 dự đoán, append kết quả giả lập, tính đúng matches/tier qua evaluateTicket, KHÔNG đụng tới kỳ khác, và idempotent khi gọi lại", () => {
  const lock: ProtocolLock = {
    protocolVersion: "test-e2e-1",
    protocolHash: "hash-e2e",
    protocolLockedAt: "2026-09-12T00:00:00.000Z",
    protocolDatasetHash: "dataset-e2e",
    prospectiveStartDrawId: "01562",
  };
  const freezeAt = () => new Date("2026-09-13T00:00:00.000Z");

  const predictionsByStrategy: Record<StrategyId, number[]> = {
    RANDOM: [1, 2, 3, 4, 5, 6],
    HOT: [3, 9, 18, 27, 33, 45],
    COLD: [3, 9, 18, 20, 25, 30],
    BALANCED: [3, 9, 40, 42, 43, 44],
  };

  // Freeze 1-4 predictions for the same mocked future draw #01562, one per strategy.
  const frozenEntries: ProspectiveEntry[] = [];
  for (const strategyId of Object.keys(predictionsByStrategy) as StrategyId[]) {
    const result = freezeProspectivePrediction({
      drawId: "01562",
      strategyId,
      prediction: predictionsByStrategy[strategyId],
      protocolHash: lock.protocolHash,
      datasetHashAtFreeze: lock.protocolDatasetHash,
      lock,
      now: freezeAt,
    });
    assert.equal(result.ok, true, `freeze thất bại cho ${strategyId}`);
    if (result.ok) frozenEntries.push(result.entry);
  }
  assert.equal(frozenEntries.length, 4);

  // A different, still-pending drawId (#01563) frozen alongside — must remain
  // completely untouched by anything that resolves #01562.
  const pendingOther = freezeProspectivePrediction({
    drawId: "01563",
    strategyId: "RANDOM",
    prediction: [10, 11, 12, 13, 14, 15],
    protocolHash: lock.protocolHash,
    datasetHashAtFreeze: lock.protocolDatasetHash,
    lock,
    now: freezeAt,
  });
  assert.equal(pendingOther.ok, true);
  if (!pendingOther.ok) return;

  const scorecard: ProspectiveEntry[] = [...frozenEntries, pendingOther.entry];

  // Synthetic/fake "real" draw #01562 — mock-only fixture, never a real Vietlott result.
  const mockedRealResult = [3, 9, 18, 27, 33, 41];
  const updated = appendProspectiveResult(scorecard, { drawId: "01562", result: mockedRealResult });

  // Every #01562 entry now carries result/matches/tier that agree exactly
  // with an independent evaluateTicket call — no double bookkeeping.
  for (const strategyId of Object.keys(predictionsByStrategy) as StrategyId[]) {
    const entry = updated.find((e) => e.drawId === "01562" && e.strategyId === strategyId);
    assert.ok(entry, `thiếu entry cho ${strategyId}`);
    const expected = evaluateTicket(predictionsByStrategy[strategyId], mockedRealResult);
    assert.deepEqual(entry!.result, mockedRealResult);
    assert.equal(entry!.matches, expected.matches);
    assert.equal(entry!.tier, expected.tier as PrizeTier);
  }

  // HOT was crafted to hit 5/6 (FIRST), COLD 3/6 (THIRD), BALANCED 2/6 (NONE), RANDOM 1/6 (NONE) — sanity-check the fixture itself.
  assert.equal(updated.find((e) => e.strategyId === "HOT")!.matches, 5);
  assert.equal(updated.find((e) => e.strategyId === "HOT")!.tier, "FIRST");
  assert.equal(updated.find((e) => e.strategyId === "COLD")!.matches, 3);
  assert.equal(updated.find((e) => e.strategyId === "COLD")!.tier, "THIRD");
  assert.equal(updated.find((e) => e.strategyId === "BALANCED")!.matches, 2);
  assert.equal(updated.find((e) => e.strategyId === "BALANCED")!.tier, "NONE");
  assert.equal(updated.find((e) => e.strategyId === "RANDOM" && e.drawId === "01562")!.matches, 1);

  // The still-pending #01563 entry must be byte-for-byte untouched — not scored, not peeked at.
  const untouchedOther = updated.find((e) => e.drawId === "01563");
  assert.deepEqual(untouchedOther, pendingOther.entry);
  assert.equal(untouchedOther!.result, null);
  assert.equal(untouchedOther!.matches, null);
  assert.equal(untouchedOther!.tier, null);

  // Idempotency: re-appending the SAME draw id — even with a different
  // (wrong) result — must not re-score or throw. Already-scored entries are
  // append-only and never recomputed.
  const reappended = appendProspectiveResult(updated, { drawId: "01562", result: [1, 2, 3, 4, 5, 6] });
  assert.deepEqual(reappended, updated);

  // Re-appending the identical original result again is likewise a safe no-op.
  const reappendedSame = appendProspectiveResult(updated, { drawId: "01562", result: mockedRealResult });
  assert.deepEqual(reappendedSame, updated);
});

test("parseProspectiveScorecard: từ chối khi result có nhưng matches/tier lại null (không nhất quán)", () => {
  const frozen = freezeProspectivePrediction({ ...baseInput, drawId: "01562" });
  assert.equal(frozen.ok, true);
  if (!frozen.ok) return;
  const inconsistent = { ...frozen.entry, result: [14, 18, 20, 21, 26, 27] };
  const result = parseProspectiveScorecard(JSON.stringify(inconsistent));
  assert.equal(result.entries.length, 0);
  assert.match(result.issues[0].reason, /result và matches\/tier/);
});
