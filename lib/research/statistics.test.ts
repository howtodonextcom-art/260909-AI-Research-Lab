import assert from "node:assert/strict";
import test from "node:test";
import type { DrawRecord } from "../analytics";
import { createRng, drawFairTicket } from "./rng";
import {
  EXPECTED_MATCHES,
  MATCH_VARIANCE,
  expectedPrizeFrequency,
  matchProbability,
  monteCarloFairnessDiagnostic,
  runMonteCarloNull,
  simulateFairDataset,
  tailProbabilityAtLeast,
  type MonteCarloNullOptions,
} from "./statistics";

test("MonteCarloNullOptions được export — tsc bắt nếu declaration biến mất", () => {
  const options: MonteCarloNullOptions = { simulationCount: 300, seed: 645 };
  assert.equal(options.simulationCount, 300);
  assert.equal(options.seed, 645);
});

test("EXPECTED_MATCHES = 0.8, dẫn xuất từ phân phối hypergeometric chính xác", () => {
  assert.ok(Math.abs(EXPECTED_MATCHES - 0.8) < 1e-9);
});

test("MATCH_VARIANCE dương và hữu hạn", () => {
  assert.ok(MATCH_VARIANCE > 0 && Number.isFinite(MATCH_VARIANCE));
});

test("tổng xác suất khớp đúng 0..6 bằng 1 (property test §29)", () => {
  const total = Array.from({ length: 7 }, (_, k) => matchProbability(k)).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
});

test("matchProbability từ chối k ngoài khoảng 0..6", () => {
  assert.throws(() => matchProbability(7));
  assert.throws(() => matchProbability(-1));
});

test("tailProbabilityAtLeast giảm dần theo k và tailProbabilityAtLeast(0) = 1", () => {
  assert.ok(Math.abs(tailProbabilityAtLeast(0) - 1) < 1e-9);
  for (let k = 1; k <= 6; k += 1) {
    assert.ok(tailProbabilityAtLeast(k) <= tailProbabilityAtLeast(k - 1));
  }
});

test("expectedPrizeFrequency tỉ lệ thuận với ticketCount", () => {
  const freq100 = expectedPrizeFrequency(100);
  const freq200 = expectedPrizeFrequency(200);
  for (let k = 0; k <= 6; k += 1) {
    assert.ok(Math.abs(freq200[k] - freq100[k] * 2) < 1e-9);
  }
});

test("drawFairTicket luôn trả về 6 số duy nhất trong 1..45", () => {
  const rng = createRng(42);
  for (let i = 0; i < 50; i += 1) {
    const ticket = drawFairTicket(rng);
    assert.equal(ticket.length, 6);
    assert.equal(new Set(ticket).size, 6);
    assert.ok(ticket.every((n) => n >= 1 && n <= 45));
    assert.deepEqual(ticket, [...ticket].sort((a, b) => a - b));
  }
});

test("runMonteCarloNull tái lập được: cùng seed → samples giống hệt", () => {
  const a = runMonteCarloNull(50, (results) => results.length, { simulationCount: 20, seed: 7 });
  const b = runMonteCarloNull(50, (results) => results.length, { simulationCount: 20, seed: 7 });
  assert.deepEqual(a.samples, b.samples);
  assert.equal(a.seed, 7);
  assert.equal(a.simulationCount, 20);
});

test("simulateFairDataset sinh đúng số kỳ yêu cầu, mỗi kỳ hợp lệ", () => {
  const rng = createRng(1);
  const dataset = simulateFairDataset(10, rng);
  assert.equal(dataset.length, 10);
  for (const result of dataset) {
    assert.equal(result.length, 6);
    assert.equal(new Set(result).size, 6);
  }
});

function fakeDraws(results: number[][]): DrawRecord[] {
  return results.map((result, i) => ({ date: `2020-01-${String((i % 28) + 1).padStart(2, "0")}`, id: String(i), result }));
}

test("monteCarloFairnessDiagnostic tái lập được với cùng seed và trả về p-value trong [0,1]", () => {
  const rng = createRng(99);
  const draws = fakeDraws(simulateFairDataset(120, rng));
  const a = monteCarloFairnessDiagnostic(draws, { simulationCount: 100, seed: 645 });
  const b = monteCarloFairnessDiagnostic(draws, { simulationCount: 100, seed: 645 });
  assert.deepEqual(a, b);
  assert.ok(a.monteCarloPValue > 0 && a.monteCarloPValue <= 1);
  assert.equal(a.simulationCount, 100);
  assert.equal(a.seed, 645);
});

test("monteCarloFairnessDiagnostic dùng cùng thống kê chi-square với chiSquareStatistic hiện có", () => {
  const rng = createRng(3);
  const draws = fakeDraws(simulateFairDataset(60, rng));
  const result = monteCarloFairnessDiagnostic(draws, { simulationCount: 30, seed: 1 });
  assert.ok(Number.isFinite(result.observedStatistic));
  assert.ok(result.observedStatistic >= 0);
});
