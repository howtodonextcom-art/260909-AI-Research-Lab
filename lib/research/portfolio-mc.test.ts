import assert from "node:assert/strict";
import test from "node:test";
import { optimizePortfolio } from "../portfolio";
import {
  bestMatchInPortfolio,
  runPortfolioSameBudgetMonteCarlo,
  type PortfolioMcSummary,
} from "./portfolio-mc";

test("cùng seed -> summary giống hệt (tái lập được)", () => {
  const a = runPortfolioSameBudgetMonteCarlo(10, { simulationCount: 200, seed: 7, portfolioSeed: 645 });
  const b = runPortfolioSameBudgetMonteCarlo(10, { simulationCount: 200, seed: 7, portfolioSeed: 645 });
  assert.deepEqual(a, b);
});

test("seed khác nhau cho summary khác nhau (không phải hằng số bị hard-code)", () => {
  const a = runPortfolioSameBudgetMonteCarlo(10, { simulationCount: 200, seed: 1 });
  const b = runPortfolioSameBudgetMonteCarlo(10, { simulationCount: 200, seed: 2 });
  assert.notDeepEqual(a, b);
});

function assertSaneBounds(summary: PortfolioMcSummary) {
  assert.ok(summary.projectiveMeanBestMatch >= 0 && summary.projectiveMeanBestMatch <= 6);
  assert.ok(summary.randomMeanBestMatch >= 0 && summary.randomMeanBestMatch <= 6);
  for (const rate of [
    summary.projectiveHitAtLeast4Rate,
    summary.randomHitAtLeast4Rate,
    summary.projectiveHitAtLeast5Rate,
    summary.randomHitAtLeast5Rate,
  ]) {
    assert.ok(rate >= 0 && rate <= 1);
  }
  // hit>=5 rate can never exceed hit>=4 rate for the same arm.
  assert.ok(summary.projectiveHitAtLeast5Rate <= summary.projectiveHitAtLeast4Rate + 1e-12);
  assert.ok(summary.randomHitAtLeast5Rate <= summary.randomHitAtLeast4Rate + 1e-12);
}

test("mọi tỉ lệ trong [0,1] và mọi trung bình trong [0,6], với n=1,10,20,30", () => {
  for (const n of [1, 10, 20, 30]) {
    const summary = runPortfolioSameBudgetMonteCarlo(n, { simulationCount: 150, seed: 645 });
    assert.equal(summary.ticketCount, n);
    assertSaneBounds(summary);
  }
});

test("optimizePortfolio cho đúng n vé, tất cả phân biệt (không lặp vé)", () => {
  for (const n of [1, 10, 20, 30]) {
    const portfolio = optimizePortfolio(n, 645);
    assert.equal(portfolio.length, n);
    const distinct = new Set(portfolio.map((ticket) => ticket.join(",")));
    assert.equal(distinct.size, n, `portfolio n=${n} phải có ${n} vé phân biệt`);
  }
});

test("bestMatchInPortfolio duyệt TOÀN BỘ vé, không chỉ vé đầu tiên", () => {
  const tickets = [
    [1, 2, 3, 4, 5, 6], // matches draw in 1 number only
    [7, 8, 9, 10, 11, 12], // matches draw in 5 numbers — the true best
    [13, 14, 15, 16, 17, 45], // matches draw in 0 numbers
  ];
  const draw = [7, 8, 9, 10, 11, 6];
  // If the implementation accidentally only checked tickets[0] repeated,
  // it would report 1 instead of the true best of 5.
  assert.equal(bestMatchInPortfolio(tickets, draw), 5);
});

test("bestMatchInPortfolio trả về 0 khi không vé nào trùng số nào", () => {
  const tickets = [
    [1, 2, 3, 4, 5, 6],
    [7, 8, 9, 10, 11, 12],
  ];
  const draw = [13, 14, 15, 16, 17, 18];
  assert.equal(bestMatchInPortfolio(tickets, draw), 0);
});

test("simulationCount không hợp lệ bị từ chối", () => {
  assert.throws(() => runPortfolioSameBudgetMonteCarlo(10, { simulationCount: 0 }));
  assert.throws(() => runPortfolioSameBudgetMonteCarlo(10, { simulationCount: -5 }));
  assert.throws(() => runPortfolioSameBudgetMonteCarlo(10, { simulationCount: 1.5 }));
});

test("ticketCount ngoài giới hạn vẫn bị optimizePortfolio từ chối (không bọc lại logic đã có)", () => {
  assert.throws(() => runPortfolioSameBudgetMonteCarlo(0, { simulationCount: 10 }));
  assert.throws(() => runPortfolioSameBudgetMonteCarlo(31, { simulationCount: 10 }));
});
