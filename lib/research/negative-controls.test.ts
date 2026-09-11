import assert from "node:assert/strict";
import test from "node:test";
import { runIidSyntheticControl, runRandomBaselineControl, runTimeShuffleControl } from "./negative-controls";
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
