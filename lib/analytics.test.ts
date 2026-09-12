import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  DEFAULT_ALPHA,
  PROTOCOL_VERSION,
  ROBUST_PAYOUT_CAP,
  calculateFrequency,
  createStrategyPick,
  dependenceAwareStandardError,
  filterByWindow,
  hacBandwidth,
  neweyWestStandardError,
  oneSidedPValue,
  outperformsOnRobustPayout,
  robustPayoutTotal,
  runTemporalBacktestReport,
  runWalkForwardBacktest,
  screeningSignificant,
  selectCandidate,
  walkForwardPairedDifferences,
  type DrawRecord,
  type PhaseBacktestResult,
} from "./analytics.ts";
import { FIXED_PRIZE } from "./mega645.ts";
import { spentAlphaForLook } from "./research/alpha-spending.ts";
import { parseDrawsJsonl } from "./data/jsonl.ts";
import { validateDataset } from "./data/merge.ts";
import { validateNumbers } from "./mega645.ts";

const draws: DrawRecord[] = Array.from({ length: 120 }, (_, index) => ({
  date: new Date(Date.UTC(2025, 0, index + 1)).toISOString().slice(0, 10),
  id: String(index + 1).padStart(5, "0"),
  result: Array.from({ length: 6 }, (__, offset) => ((index + offset) % 45) + 1).sort((a, b) => a - b),
}));

test("parseDrawsJsonl sắp xếp dữ liệu theo ngày", () => {
  const parsed = parseDrawsJsonl('{"date":"2025-01-02","id":"00002","result":[1,2,3,4,5,6]}\n{"date":"2025-01-01","id":"00001","result":[7,8,9,10,11,12]}');
  assert.equal(parsed.issues.length, 0);
  assert.equal(parsed.records[0].id, "00001");
});

test("parseDrawsJsonl báo lỗi bản ghi sai hoặc trùng kỳ", () => {
  assert.equal(parseDrawsJsonl('{"date":"2025-01-01","id":"00001","result":[1,1,2,3,4,5]}').issues.length, 1);
  const duplicate = parseDrawsJsonl('{"date":"2025-01-01","id":"00001","result":[1,2,3,4,5,6]}\n{"date":"2025-01-02","id":"00001","result":[7,8,9,10,11,12]}');
  assert.equal(validateDataset(duplicate.records).valid, false);
});

test("lọc đúng cửa sổ 30 ngày tính từ kỳ mới nhất", () => {
  assert.equal(filterByWindow(draws, "30D").length, 30);
  assert.equal(filterByWindow(draws, "ALL").length, 120);
});

test("tần suất luôn bảo toàn tổng số bóng", () => {
  const rows = calculateFrequency(draws);
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), draws.length * 6);
});

test("mọi chiến lược đều sinh một vé hợp lệ", () => {
  for (const strategy of ["RANDOM", "HOT", "COLD", "BALANCED"] as const) {
    assert.equal(validateNumbers(createStrategyPick(draws.slice(0, 90), strategy, 42)), true);
  }
});

test("walk-forward không nhìn trước và tạo đủ kết quả", () => {
  const results = runWalkForwardBacktest(draws, 90);
  assert.equal(results.length, 4);
  assert.equal(results[0].trials, 30);
  assert.ok(results.every((result) => Number.isFinite(result.roi)));
  assert.deepEqual(results, runWalkForwardBacktest(draws, 90));
});

test("pipeline development-validation-test chia theo thời gian và hiệu chỉnh nhiều chiến lược", () => {
  const report = runTemporalBacktestReport(draws, 90);
  assert.deepEqual(report.phases.map((phase) => phase.id), ["DEVELOPMENT", "VALIDATION", "TEST"]);
  assert.deepEqual(report.phases.map((phase) => phase.trials), [15, 7, 8]);
  assert.equal(report.results.length, 12);
  assert.equal(report.reliability.length, 3);
  assert.ok(report.results.every((result) => result.trials > 0));
  assert.ok(report.results.every((result) => result.pValueVsRandom >= 0 && result.pValueVsRandom <= 1));
  assert.ok(report.results.filter((result) => result.strategy !== "RANDOM").every((result) => result.adjustedPValue !== null && result.adjustedPValue >= 0 && result.adjustedPValue <= 1));
});

test("validation không thay đổi khi sửa kỳ holdout tương lai", () => {
  const baseline = runTemporalBacktestReport(draws, 90);
  const changedFuture = draws.map((draw) => ({ ...draw, result: [...draw.result] }));
  changedFuture[changedFuture.length - 1] = {
    ...changedFuture.at(-1)!,
    result: [40, 41, 42, 43, 44, 45],
  };
  const changed = runTemporalBacktestReport(changedFuture, 90);
  const baselineValidation = baseline.results.filter((result) => result.phase === "VALIDATION");
  const changedValidation = changed.results.filter((result) => result.phase === "VALIDATION");
  assert.deepEqual(changedValidation, baselineValidation);
});

// --- B2: chống rò rỉ holdout vào việc chọn ứng viên ---

test("thay đổi toàn bộ tập test không làm đổi ứng viên được chọn", () => {
  const baseline = runTemporalBacktestReport(draws, 90);

  // Ghi đè MỌI kỳ thuộc phần test bằng kết quả khác hẳn.
  const testPhase = baseline.phases.find((phase) => phase.id === "TEST")!;
  const mutated = draws.map((draw) =>
    draw.date >= testPhase.startDate
      ? { ...draw, result: [40, 41, 42, 43, 44, 45] }
      : { ...draw, result: [...draw.result] },
  );
  const changed = runTemporalBacktestReport(mutated, 90);

  assert.deepEqual(changed.candidate, baseline.candidate, "ứng viên không được phụ thuộc tập test");
  assert.deepEqual(
    changed.results.filter((r) => r.phase !== "TEST"),
    baseline.results.filter((r) => r.phase !== "TEST"),
    "kết quả development và validation không được đổi",
  );
  assert.notDeepEqual(
    changed.results.filter((r) => r.phase === "TEST"),
    baseline.results.filter((r) => r.phase === "TEST"),
    "chỉ đánh giá trên tập test được phép thay đổi",
  );
});

test("ứng viên chỉ đến từ validation và phải vượt ngưỡng alpha", () => {
  const make = (strategy: PhaseBacktestResult["strategy"], edge: number, adjusted: number) =>
    ({ strategy, edgeVsRandom: edge, adjustedPValue: adjusted, phase: "VALIDATION" } as PhaseBacktestResult);

  assert.equal(selectCandidate([make("HOT", 0.05, 0.20)], 0.05), null, "p-value quá cao thì không chọn");
  assert.equal(selectCandidate([make("HOT", -0.01, 0.001)], 0.05), null, "edge âm thì không chọn");
  assert.equal(selectCandidate([], 0.05), null, "không có gì thì không chọn");

  const picked = selectCandidate([make("HOT", 0.05, 0.04), make("COLD", 0.09, 0.01)], 0.05);
  assert.equal(picked?.strategy, "COLD", "chọn adjusted p-value nhỏ nhất");
  assert.equal(picked?.protocolVersion, PROTOCOL_VERSION, "ứng viên phải ghi lại phiên bản protocol");

  assert.equal(
    selectCandidate([make("RANDOM", 0.5, 0.001), make("HOT", 0.05, 0.04)], 0.05)?.strategy,
    "HOT",
    "RANDOM không được chọn dù p đẹp",
  );
  assert.equal(
    selectCandidate([make("HOT", 0.05, 0.04), make("COLD", 0.09, 0.04)], 0.05)?.strategy,
    "COLD",
    "cùng adjusted p thì chọn edge lớn hơn",
  );
  assert.equal(selectCandidate([make("HOT", 0.05, 0.05)], 0.05)?.strategy, "HOT", "adjusted p đúng bằng alpha vẫn đủ điều kiện");
});

test("không chiến lược nào được gắn nhãn xác nhận trên dữ liệu tổng hợp", () => {
  const report = runTemporalBacktestReport(draws, 90);
  for (const row of report.reliability) {
    assert.ok(["NO_EDGE", "VALIDATION_ONLY", "HOLDOUT_SIGNAL"].includes(row.verdict));
  }
});

// --- B3: trạng thái VERIFIED không còn tồn tại ---

test("kết quả backtest báo cáo cổng sàng lọc thay vì verdict không thể đạt", () => {
  const results = runWalkForwardBacktest(draws, 90);
  for (const result of results) {
    assert.ok(!("verdict" in result), "verdict tri-state phải bị loại bỏ");
    assert.equal(
      result.gates.passedCount,
      Number(result.gates.significant) +
        Number(result.gates.stableAcrossHalves) +
        Number(result.gates.outperformsRandomPayout),
      "passedCount phải bằng tổng ba cổng",
    );
    assert.ok(result.gates.passedCount >= 0 && result.gates.passedCount <= 3);
  }

  const control = results.find((result) => result.strategy === "RANDOM")!;
  assert.equal(control.gates.passedCount, 0, "mốc đối chứng không tự vượt cổng của chính nó");
  assert.equal(control.gates.significant, false);
  assert.equal(control.gates.stableAcrossHalves, false);
  assert.equal(control.gates.outperformsRandomPayout, false);

  for (const result of results.filter((row) => row.strategy !== "RANDOM")) {
    assert.equal(typeof result.gates.significant, "boolean");
    assert.equal(typeof result.gates.stableAcrossHalves, "boolean");
    assert.equal(typeof result.gates.outperformsRandomPayout, "boolean");
  }
});

test("Holm dùng familySize lớn hơn số chiến lược đang thấy thì conservative hơn", () => {
  const visible = runTemporalBacktestReport(draws, 90, 0.05, 3);
  const family = runTemporalBacktestReport(draws, 90, 0.05, 10);
  assert.equal(visible.familySize, 3);
  assert.equal(family.familySize, 10);
  const visibleHot = visible.results.find((result) => result.phase === "VALIDATION" && result.strategy === "HOT")!;
  const familyHot = family.results.find((result) => result.phase === "VALIDATION" && result.strategy === "HOT")!;
  assert.ok((familyHot.adjustedPValue ?? 1) >= (visibleHot.adjustedPValue ?? 1));
});

test("Newey–West HAC SE ≥ naive SE dưới tự tương quan dương (chuỗi AR-like)", () => {
  // Slow-moving series: overlapping walk-forward edges share lookback history.
  const values = Array.from({ length: 80 }, (_, i) => Math.sin(i / 8) + (i % 3) * 0.01);
  const lookback = 90;
  const expectedLag = hacBandwidth(values.length, lookback);
  assert.equal(expectedLag, 4);
  const naive = (() => {
    const average = values.reduce((s, v) => s + v, 0) / values.length;
    const sd = Math.sqrt(values.reduce((s, v) => s + (v - average) ** 2, 0) / (values.length - 1));
    return sd / Math.sqrt(values.length);
  })();
  const hac = neweyWestStandardError(values, expectedLag);
  assert.ok(hac >= naive - 1e-12, `HAC ${hac} phải ≥ naive ${naive}`);
  const aware = dependenceAwareStandardError(values, lookback);
  assert.equal(aware.lag, expectedLag);
  assert.ok(aware.se >= aware.naiveSe - 1e-12);
  assert.equal(aware.se, Math.max(hac, aware.naiveSe));
});

test("hacBandwidth: n=368 → lag ≈ 7, không phải lookback-1", () => {
  assert.equal(hacBandwidth(368, 90), 7);
  assert.notEqual(hacBandwidth(368, 90), 89);
  assert.equal(hacBandwidth(1, 90), 0);
  assert.equal(hacBandwidth(8, 90), 2);
});

test("HAC vs naive trên HOT/TEST dataset bundled: khác nhau, SE = max(HAC, naive), không giả định HAC > naive", () => {
  const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
  const parsed = parseDrawsJsonl(readFileSync(path.join(root, "public/data/power645.jsonl"), "utf8"));
  assert.ok(parsed.issues.length === 0);
  assert.ok(parsed.records.length >= 400, "cần snapshot bundled thật, không phải fixture ngắn");
  const differences = walkForwardPairedDifferences(parsed.records, "HOT", "TEST", 90);
  assert.ok(differences.length >= 100, `TEST HOT phải có đủ trials, nhận ${differences.length}`);
  const aware = dependenceAwareStandardError(differences, 90);
  const hac = neweyWestStandardError(differences, aware.lag);
  assert.ok(aware.lag <= 8 && aware.lag >= 6, `bandwidth n^{1/3} trên TEST, nhận lag=${aware.lag} n=${differences.length}`);
  assert.ok(Number.isFinite(hac) && hac > 0);
  assert.ok(Number.isFinite(aware.naiveSe) && aware.naiveSe > 0);
  assert.ok(
    Math.abs(hac - aware.naiveSe) > 1e-6,
    `HAC trên series thật phải khác naive (hac=${hac}, naive=${aware.naiveSe}) — nếu bằng nhau, path HAC đã chết`,
  );
  assert.equal(aware.se, Math.max(hac, aware.naiveSe));
  // Empirical pin after n^{1/3} bandwidth on this bundled snapshot: HAC < naive
  // so the floor is still naive. Not a general law — do not invert it.
  assert.ok(
    hac < aware.naiveSe,
    `HOT/TEST hiện tại: kỳ vọng HAC < naive (hac=${hac}, naive=${aware.naiveSe}, lag=${aware.lag})`,
  );
});

test("temporal report ghi varianceMethod newey-west-hac và không đổi candidate khi mutate TEST", () => {
  const report = runTemporalBacktestReport(draws, 90);
  assert.equal(report.varianceMethod, "newey-west-hac");
  assert.equal(report.lookCount, 1);
  assert.equal(report.alpha, DEFAULT_ALPHA);
  assert.equal(report.nominalAlpha, DEFAULT_ALPHA);
  const testPhase = report.phases.find((phase) => phase.id === "TEST")!;
  const mutated = draws.map((draw) =>
    draw.date >= testPhase.startDate
      ? { ...draw, result: [40, 41, 42, 43, 44, 45] }
      : { ...draw, result: [...draw.result] },
  );
  assert.deepEqual(runTemporalBacktestReport(mutated, 90).candidate, report.candidate);
});

test("cổng significant dùng one-sided p ≤ alpha, không hard-code 1.96", () => {
  assert.equal(ROBUST_PAYOUT_CAP, FIXED_PRIZE.SECOND);
  assert.ok(screeningSignificant(1.65, 0.05, false), "z≈1.65 → p≈0.05 phải qua cổng ở alpha=0.05");
  assert.equal(screeningSignificant(1.64, 0.05, false), false);
  assert.equal(screeningSignificant(1.96, 0.05, true), false);
  assert.ok(oneSidedPValue(1.96) < 0.03);
  assert.ok(oneSidedPValue(1.65) <= 0.05);
  const source = readFileSync(fileURLToPath(new URL("./analytics.ts", import.meta.url)), "utf8");
  assert.doesNotMatch(source, /zScore\s*>=\s*1\.96/);
  assert.match(source, /screeningSignificant/);
});

test("một payout cực trị không lật cổng bền đuôi nếu phần còn lại không hơn RANDOM", () => {
  const strategy = [FIXED_PRIZE.FIRST, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const random = Array.from({ length: 11 }, () => FIXED_PRIZE.THIRD);
  assert.ok(strategy.reduce((sum, value) => sum + value, 0) > random.reduce((sum, value) => sum + value, 0));
  assert.equal(robustPayoutTotal(strategy), ROBUST_PAYOUT_CAP);
  assert.equal(robustPayoutTotal(random), FIXED_PRIZE.THIRD * 11);
  assert.equal(outperformsOnRobustPayout(strategy, random), false);
  assert.equal(outperformsOnRobustPayout([FIXED_PRIZE.THIRD, FIXED_PRIZE.THIRD], [0, 0]), true);
});

test("lookCount > 1: selectCandidate / Holm dùng alpha đã spend, không còn 0.05", () => {
  const one = runTemporalBacktestReport(draws, 90, 0.05, 3, 1);
  const two = runTemporalBacktestReport(draws, 90, 0.05, 3, 2);
  assert.equal(one.lookCount, 1);
  assert.equal(one.alpha, 0.05);
  assert.equal(two.lookCount, 2);
  assert.equal(two.nominalAlpha, 0.05);
  assert.equal(two.alpha, spentAlphaForLook(2, 0.05));
  assert.ok(two.alpha < 0.05);
  assert.ok(Math.abs(two.alpha - 0.018994274652086127) < 1e-12);
});
