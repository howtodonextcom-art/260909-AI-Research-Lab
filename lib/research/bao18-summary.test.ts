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
    scientificSpecHash: "254bafef1c4ed187bd3e14e37ca5188dc01ba7bcf951db2359db62e1f81963be",
    buildProvenance: { generatedAt: "2026-09-13T06:59:17.606Z", gitHeadShort: "4e800aa25" },
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

test("parseBao18Summary đọc scientificSpecHash + buildProvenance khi có", () => {
  const parsed = parseBao18Summary(validSummary());
  assert.equal(parsed?.scientificSpecHash, "254bafef1c4ed187bd3e14e37ca5188dc01ba7bcf951db2359db62e1f81963be");
  assert.deepEqual(parsed?.buildProvenance, { generatedAt: "2026-09-13T06:59:17.606Z", gitHeadShort: "4e800aa25" });
});

test("parseBao18Summary chấp nhận scientificSpecHash/buildProvenance thiếu hoặc null (báo cáo cũ hơn trường này)", () => {
  const raw = validSummary() as Record<string, unknown>;
  delete raw.scientificSpecHash;
  delete raw.buildProvenance;
  const parsed = parseBao18Summary(raw);
  assert.ok(parsed);
  assert.equal(parsed?.scientificSpecHash, null);
  assert.equal(parsed?.buildProvenance, null);

  const parsedExplicitNull = parseBao18Summary(validSummary({ scientificSpecHash: null, buildProvenance: null }));
  assert.ok(parsedExplicitNull);
  assert.equal(parsedExplicitNull?.scientificSpecHash, null);
});

test("parseBao18Summary đọc early/late stability trên mỗi rule row, chấp nhận null khi báo cáo cũ không có", () => {
  const ruleWithStability = validRuleRow({
    early: { n: 735, meanK: 2.39, hit6Count: 3, hit6Rate: 0.0041 },
    late: { n: 736, meanK: 2.39, hit6Count: 1, hit6Rate: 0.0014 },
  });
  const parsed = parseBao18Summary(validSummary({ protocolB: { evaluatedCount: 1471, rules: [ruleWithStability] } }));
  assert.ok(parsed);
  assert.deepEqual(parsed?.protocolB.rules[0]?.early, { n: 735, meanK: 2.39, hit6Count: 3, hit6Rate: 0.0041 });
  assert.deepEqual(parsed?.protocolB.rules[0]?.late, { n: 736, meanK: 2.39, hit6Count: 1, hit6Rate: 0.0014 });

  const parsedNoStability = parseBao18Summary(validSummary());
  assert.equal(parsedNoStability?.protocolB.rules[0]?.early, null);
  assert.equal(parsedNoStability?.protocolB.rules[0]?.late, null);
});

test("parseBao18Summary trả null khi early/late có shape hỏng (không phải null/undefined nhưng thiếu trường)", () => {
  const badRow = validRuleRow({ early: { n: 735 } });
  assert.equal(parseBao18Summary(validSummary({ protocolB: { evaluatedCount: 1471, rules: [badRow] } })), null);
});
