import assert from "node:assert/strict";
import test from "node:test";
import {
  runFutureLeakageControl,
  runIidSyntheticControl,
  runLabelPermutationControl,
  runRandomBaselineControl,
  runTimeShuffleControl,
} from "./negative-controls";
import { createRng, drawFairTicket } from "./rng";
import type { DrawRecord } from "../analytics";

function syntheticDraws(n: number, seed: number): DrawRecord[] {
  const rng = createRng(seed);
  return Array.from({ length: n }, (_, i) => ({
    date: `20${String(10 + Math.floor(i / 300)).padStart(2, "0")}-${String((Math.floor(i / 25) % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    id: String(i + 1).padStart(5, "0"),
    result: drawFairTicket(rng),
  }));
}

test("Control A (IID synthetic): dưới null công bằng, tỉ lệ vượt cả 3 cổng sàng lọc phải thấp", () => {
  const result = runIidSyntheticControl({ drawCount: 220, lookback: 60, replications: 15, seed: 1 });
  assert.equal(result.replications, 15);
  for (const strategy of Object.keys(result.passRateByStrategy) as Array<keyof typeof result.passRateByStrategy>) {
    const rate = result.passRateByStrategy[strategy];
    assert.ok(rate >= 0 && rate <= 1);
    // Coarse sanity bound, not a certified false-positive rate: under a truly
    // fair, history-independent process the strategy should not clear all 3
    // gates most of the time.
    assert.ok(rate <= 0.6, `${strategy} pass rate ${rate} có vẻ cao bất thường dưới null công bằng`);
  }
});

test("Control A tái lập được với cùng seed", () => {
  const a = runIidSyntheticControl({ drawCount: 150, lookback: 50, replications: 8, seed: 42 });
  const b = runIidSyntheticControl({ drawCount: 150, lookback: 50, replications: 8, seed: 42 });
  assert.deepEqual(a, b);
});

test("Control B (time shuffle): chạy được hết pipeline trên dữ liệu đã xáo trộn, dữ liệu vẫn hợp lệ", () => {
  const draws = syntheticDraws(300, 7);
  const result = runTimeShuffleControl(draws, 60, 645);
  assert.equal(result.original.length, 4);
  assert.equal(result.shuffled.length, 4);
  for (const r of [...result.original, ...result.shuffled]) {
    assert.ok(Number.isFinite(r.averageMatches));
    assert.ok(r.trials > 0);
  }
  for (const id of ["HOT", "COLD", "BALANCED"] as const) {
    assert.equal(typeof result.edgeDeltaByStrategy[id], "number");
    assert.ok(Number.isFinite(result.edgeDeltaByStrategy[id]));
  }
  assert.equal(typeof result.temporalSignalCollapsed, "boolean");
});

test("Control B summary: edgeDelta = original − shuffled và tái lập với cùng seed", () => {
  const draws = syntheticDraws(220, 11);
  const a = runTimeShuffleControl(draws, 60, 99);
  const b = runTimeShuffleControl(draws, 60, 99);
  assert.deepEqual(a, b);
  for (const id of ["HOT", "COLD", "BALANCED"] as const) {
    const o = a.original.find((r) => r.strategy === id)!.edgeVsRandom;
    const s = a.shuffled.find((r) => r.strategy === id)!.edgeVsRandom;
    assert.ok(Math.abs(a.edgeDeltaByStrategy[id] - (o - s)) < 1e-12);
  }
});

test("Control C (random baseline): trung bình khớp của RANDOM gần 0.8 kỳ vọng", () => {
  const draws = syntheticDraws(400, 99);
  const result = runRandomBaselineControl(draws, 90);
  assert.ok(Math.abs(result.expectedMean - 0.8) < 1e-9);
  assert.ok(result.trials > 0);
  // 32-sample-averaged RANDOM over ~300 draws: expect the mean to land close
  // to 0.8, well within a generous tolerance for a coarse control.
  assert.ok(result.absoluteDifference < 0.15, `|observed - expected| = ${result.absoluteDifference} quá lớn`);
});

test("Control E (label permutation): xáo trộn cặp vé-kết quả, edge phải sụp về gần EXPECTED_MATCHES", () => {
  const draws = syntheticDraws(400, 321);
  const result = runLabelPermutationControl(draws, 90, 645);
  assert.equal(result.lookback, 90);
  assert.equal(result.seed, 645);
  assert.ok(result.trials > 0);
  for (const id of ["HOT", "COLD", "BALANCED"] as const) {
    assert.ok(Number.isFinite(result.trueEdgeByStrategy[id]));
    assert.ok(Number.isFinite(result.permutedEdgeByStrategy[id]));
    // Under a synthetic IID series there is no real temporal structure to
    // begin with, so the permuted edge should be small in absolute terms —
    // this is the label-permutation null the control is meant to check.
    assert.ok(
      Math.abs(result.permutedEdgeByStrategy[id]) < 0.15,
      `${id} permuted edge ${result.permutedEdgeByStrategy[id]} có vẻ cao bất thường dưới hoán vị nhãn`,
    );
  }
  assert.equal(result.edgeCollapsedTowardNull, true);
});

test("Control E tái lập được với cùng seed (xáo trộn nhãn xác định theo seed)", () => {
  const draws = syntheticDraws(300, 11);
  const a = runLabelPermutationControl(draws, 60, 99);
  const b = runLabelPermutationControl(draws, 60, 99);
  assert.deepEqual(a, b);
});

test("Control E: seed khác nhau cho hoán vị khác nhau (không phải hằng số ẩn)", () => {
  const draws = syntheticDraws(300, 5);
  const a = runLabelPermutationControl(draws, 60, 1);
  const b = runLabelPermutationControl(draws, 60, 2);
  assert.notDeepEqual(a.permutedEdgeByStrategy, b.permutedEdgeByStrategy);
});

test("Control E: dữ liệu ngắn hơn lookback trả về trials=0 một cách an toàn, không NaN/throw", () => {
  const draws = syntheticDraws(50, 7);
  const result = runLabelPermutationControl(draws, 90, 645);
  assert.equal(result.trials, 0);
  assert.equal(result.edgeCollapsedTowardNull, true);
  for (const id of ["HOT", "COLD", "BALANCED"] as const) {
    assert.equal(result.trueEdgeByStrategy[id], 0);
    assert.equal(result.permutedEdgeByStrategy[id], 0);
  }
});

test("Control F (future leakage): vé rò rỉ đọc thẳng kết quả tương lai luôn trúng cả 6 số", () => {
  const draws = syntheticDraws(300, 13);
  const result = runFutureLeakageControl(draws, 90);
  assert.ok(result.trials > 0);
  // The leaked ticket IS the target draw's result, so every trial matches all 6.
  assert.equal(result.leakedAverageMatches, 6);
  assert.equal(result.leakedJackpotRate, 1);
  assert.equal(result.leakDetected, true);
});

test("Control F: edge của vé rò rỉ lớn hơn hẳn edge của chiến lược an toàn (không rò rỉ) trên cùng dữ liệu", () => {
  const draws = syntheticDraws(300, 21);
  const result = runFutureLeakageControl(draws, 90);
  // Leak-safe HOT on an IID-fair synthetic series has no real signal, so its
  // edge stays small; the leaked edge is a full 6 - 0.8 = 5.2 above null.
  assert.ok(Math.abs(result.leakSafeEdge) < 1, `leak-safe edge ${result.leakSafeEdge} bất thường cao`);
  assert.ok(result.leakedEdge > result.leakSafeEdge + 1);
  assert.ok(Math.abs(result.leakedEdge - (6 - 0.8)) < 1e-9);
});

test("Control F: dữ liệu ngắn hơn lookback trả về trials=0 một cách an toàn, leakDetected=false", () => {
  const draws = syntheticDraws(50, 3);
  const result = runFutureLeakageControl(draws, 90);
  assert.equal(result.trials, 0);
  assert.equal(result.leakDetected, false);
  assert.equal(result.leakedAverageMatches, 0);
});

test("Control F tái lập được (không phụ thuộc seed ngẫu nhiên vì vé rò rỉ = kết quả thật)", () => {
  const draws = syntheticDraws(220, 55);
  const a = runFutureLeakageControl(draws, 60);
  const b = runFutureLeakageControl(draws, 60);
  assert.deepEqual(a, b);
});
