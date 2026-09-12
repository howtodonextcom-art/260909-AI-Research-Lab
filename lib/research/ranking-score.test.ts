import assert from "node:assert/strict";
import test from "node:test";
import {
  computeCalibrationReport,
  computeRankingScore,
  promotionGateMet,
  type CalibrationPair,
} from "./ranking-score";

test("computeRankingScore trả về trung bình feature của 6 số trong vé", () => {
  const ticket = [1, 2, 3, 4, 5, 6];
  const features = { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50, 6: 60 };
  const result = computeRankingScore(ticket, features);
  assert.equal(result.score, (10 + 20 + 30 + 40 + 50 + 60) / 6);
  assert.deepEqual(result.ticket, ticket);
});

test("computeRankingScore coi feature vắng mặt là 0", () => {
  const result = computeRankingScore([1, 2, 3, 4, 5, 6], { 1: 6 });
  assert.equal(result.score, 6 / 6);
});

test("computeRankingScore từ chối vé không hợp lệ", () => {
  assert.throws(() => computeRankingScore([1, 2, 3, 4, 5], {}));
  assert.throws(() => computeRankingScore([1, 1, 2, 3, 4, 5], {}));
  assert.throws(() => computeRankingScore([0, 2, 3, 4, 5, 6], {}));
});

test("computeCalibrationReport: Brier score = 0 khi dự đoán khớp hoàn hảo outcome", () => {
  const pairs: CalibrationPair[] = [
    { predictedScore: 0, actualOutcome: 0 },
    { predictedScore: 1, actualOutcome: 1 },
  ];
  const report = computeCalibrationReport(pairs, 2);
  assert.equal(report.brierScore, 0);
  assert.equal(report.sampleSize, 2);
});

test("computeCalibrationReport: Brier score tính tay khớp — ví dụ 4 điểm", () => {
  // (0.1-0)^2=0.01, (0.2-0)^2=0.04, (0.6-1)^2=0.16, (0.9-1)^2=0.01 -> sum 0.22 / 4 = 0.055
  const pairs: CalibrationPair[] = [
    { predictedScore: 0.1, actualOutcome: 0 },
    { predictedScore: 0.2, actualOutcome: 0 },
    { predictedScore: 0.6, actualOutcome: 1 },
    { predictedScore: 0.9, actualOutcome: 1 },
  ];
  const report = computeCalibrationReport(pairs, 2);
  assert.ok(Math.abs(report.brierScore - 0.055) < 1e-12);
});

test("computeCalibrationReport: ECE tính tay khớp — cùng ví dụ 4 điểm, 2 bucket", () => {
  // Bucket [0,0.5): predicted {0.1,0.2} avg=0.15, outcome avg=0, weight 2/4=0.5, |diff|=0.15
  // Bucket [0.5,1]: predicted {0.6,0.9} avg=0.75, outcome avg=1, weight 2/4=0.5, |diff|=0.25
  // ECE = 0.5*0.15 + 0.5*0.25 = 0.2
  const pairs: CalibrationPair[] = [
    { predictedScore: 0.1, actualOutcome: 0 },
    { predictedScore: 0.2, actualOutcome: 0 },
    { predictedScore: 0.6, actualOutcome: 1 },
    { predictedScore: 0.9, actualOutcome: 1 },
  ];
  const report = computeCalibrationReport(pairs, 2);
  assert.ok(Math.abs(report.expectedCalibrationError - 0.2) < 1e-12);
  assert.equal(report.bucketCount, 2);
});

test("computeCalibrationReport từ chối danh sách rỗng hoặc bucketCount không hợp lệ", () => {
  assert.throws(() => computeCalibrationReport([]));
  assert.throws(() => computeCalibrationReport([{ predictedScore: 0.5, actualOutcome: 1 }], 0));
  assert.throws(() => computeCalibrationReport([{ predictedScore: 0.5, actualOutcome: 1 }], 1.5));
});

test("promotionGateMet trả về false khi bất kỳ ngưỡng nào không đạt", () => {
  const goodReport = computeCalibrationReport([
    { predictedScore: 0, actualOutcome: 0 },
    { predictedScore: 1, actualOutcome: 1 },
  ]);
  // Sample size too small.
  assert.equal(
    promotionGateMet(goodReport, { maxBrierScore: 0.5, maxExpectedCalibrationError: 0.5, minSampleSize: 100 }),
    false,
  );
  // Brier/ECE thresholds too strict for a report that isn't perfect.
  const mixedReport = computeCalibrationReport([
    { predictedScore: 0.1, actualOutcome: 0 },
    { predictedScore: 0.6, actualOutcome: 1 },
    { predictedScore: 0.9, actualOutcome: 0 },
  ]);
  assert.equal(
    promotionGateMet(mixedReport, { maxBrierScore: 0, maxExpectedCalibrationError: 0, minSampleSize: 1 }),
    false,
  );
});

test("promotionGateMet trả về true khi mọi ngưỡng đều đạt", () => {
  const report = computeCalibrationReport([
    { predictedScore: 0, actualOutcome: 0 },
    { predictedScore: 1, actualOutcome: 1 },
  ]);
  assert.equal(
    promotionGateMet(report, { maxBrierScore: 0.01, maxExpectedCalibrationError: 0.01, minSampleSize: 2 }),
    true,
  );
});
