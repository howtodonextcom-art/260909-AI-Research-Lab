import assert from "node:assert/strict";
import test from "node:test";
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

test("parseProspectiveScorecard: từ chối khi result có nhưng matches/tier lại null (không nhất quán)", () => {
  const frozen = freezeProspectivePrediction({ ...baseInput, drawId: "01562" });
  assert.equal(frozen.ok, true);
  if (!frozen.ok) return;
  const inconsistent = { ...frozen.entry, result: [14, 18, 20, 21, 26, 27] };
  const result = parseProspectiveScorecard(JSON.stringify(inconsistent));
  assert.equal(result.entries.length, 0);
  assert.match(result.issues[0].reason, /result và matches\/tier/);
});
