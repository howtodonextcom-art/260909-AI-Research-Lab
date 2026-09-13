import assert from "node:assert/strict";
import test from "node:test";
import { parseBao18Summary } from "./bao18-summary";

function validRuleRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    rule: "RANDOM18",
    isBaseline: true,
    n: 1471,
    hit6Count: 4,
    hit6Rate: 0.0027,
    expectedNullHits: 3.35,
    rawPValue: 0.43,
    adjustedPValue: null,
    meanIntersection: 2.38,
    hit4PlusRate: 0.16,
    hit5PlusRate: 0.027,
    verdict: null,
    reasons: [],
    ...overrides,
  };
}

function validSummary(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    schemaVersion: 1,
    generatedAt: "2026-09-13T05:53:59.087Z",
    sourceReportFile: "26-09-13-12-53-bao18-walkforward-reverse-audit.json",
    datasetRecordCount: 1561,
    firstDrawId: "00001",
    latestDrawId: "01561",
    math: {
      totalCombinations: 8145060,
      bao18Tickets: 18564,
      ticketPrice: 10000,
      bao18CostPerDraw: 185640000,
      nullJackpotProbability: 0.00228,
    },
    protocolA: {
      evaluatedDraws: 1471,
      hit6Count: 1471,
      hit6Rate: 1,
      sourceVerdict: "INVALID_PEEK_ONLY",
    },
    protocolB: {
      evaluatedCount: 1471,
      rules: [validRuleRow()],
    },
    nullCalibration: {
      nullExpectedCount: 3.35,
      nullProbZeroHits: 0.035,
      nullPredictiveInterval95: [0, 7],
      underpowered: true,
    },
    finalVerdict: "NO_EDGE",
    scientificGrade: "C — NO DEMONSTRATED EDGE",
    ...overrides,
  };
}

test("parseBao18Summary chấp nhận một summary hợp lệ đầy đủ trường", () => {
  const parsed = parseBao18Summary(validSummary());
  assert.ok(parsed);
  assert.equal(parsed?.finalVerdict, "NO_EDGE");
  assert.equal(parsed?.protocolB.rules.length, 1);
  assert.equal(parsed?.protocolA?.sourceVerdict, "INVALID_PEEK_ONLY");
});

test("parseBao18Summary chấp nhận math/protocolA/nullCalibration = null (trạng thái thiếu dữ liệu trung thực)", () => {
  const parsed = parseBao18Summary(validSummary({ math: null, protocolA: null, nullCalibration: null }));
  assert.ok(parsed);
  assert.equal(parsed?.math, null);
  assert.equal(parsed?.protocolA, null);
  assert.equal(parsed?.nullCalibration, null);
});

test("parseBao18Summary trả null khi thiếu schemaVersion", () => {
  const raw = validSummary() as Record<string, unknown>;
  delete raw.schemaVersion;
  assert.equal(parseBao18Summary(raw), null);
});

test("parseBao18Summary chấp nhận protocolB.rules rỗng (shape hợp lệ, dù rỗng — validator không áp quy tắc nghiệp vụ)", () => {
  const parsed = parseBao18Summary(validSummary({ protocolB: { evaluatedCount: 1471, rules: [] } }));
  assert.ok(parsed);
  assert.deepEqual(parsed?.protocolB.rules, []);
});

test("parseBao18Summary trả null khi protocolB bị thiếu hoàn toàn", () => {
  assert.equal(parseBao18Summary(validSummary({ protocolB: null })), null);
  const raw = validSummary() as Record<string, unknown>;
  delete raw.protocolB;
  assert.equal(parseBao18Summary(raw), null);
});

test("parseBao18Summary trả null khi một rule row thiếu trường bắt buộc", () => {
  const badRow = validRuleRow();
  delete (badRow as Record<string, unknown>).hit6Rate;
  assert.equal(parseBao18Summary(validSummary({ protocolB: { evaluatedCount: 1471, rules: [badRow] } })), null);
});

test("parseBao18Summary trả null khi rule không thuộc danh sách hợp lệ", () => {
  const badRow = validRuleRow({ rule: "SUPER18" });
  assert.equal(parseBao18Summary(validSummary({ protocolB: { evaluatedCount: 1471, rules: [badRow] } })), null);
});

test("parseBao18Summary trả null cho giá trị không phải object", () => {
  assert.equal(parseBao18Summary(null), null);
  assert.equal(parseBao18Summary(undefined), null);
  assert.equal(parseBao18Summary("not an object"), null);
  assert.equal(parseBao18Summary(42), null);
});

test("parseBao18Summary trả null khi finalVerdict/scientificGrade không phải string", () => {
  assert.equal(parseBao18Summary(validSummary({ finalVerdict: 1 })), null);
  assert.equal(parseBao18Summary(validSummary({ scientificGrade: null })), null);
});
