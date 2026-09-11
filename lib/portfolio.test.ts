import assert from "node:assert/strict";
import test from "node:test";
import { calculatePortfolioOdds, countCoveredPairs, intersectionSize, optimizePortfolio, validatePortfolio } from "./portfolio";

test("optimizer tạo portfolio hợp lệ và lặp lại được", () => {
  for (const count of [1, 5, 10, 20, 30]) {
    const portfolio = optimizePortfolio(count, 20260909);
    assert.equal(portfolio.length, count);
    assert.equal(validatePortfolio(portfolio), true);
    assert.deepEqual(portfolio, optimizePortfolio(count, 20260909));
    assert.equal(countCoveredPairs(portfolio), count * 15);
  }
});

test("mọi cặp vé chỉ giao tối đa một số", () => {
  const portfolio = optimizePortfolio(30);
  for (let left = 0; left < portfolio.length; left += 1) {
    for (let right = left + 1; right < portfolio.length; right += 1) {
      assert.ok(intersectionSize(portfolio[left], portfolio[right]) <= 1);
    }
  }
});

test("xác suất portfolio tăng tuyến tính nhưng không đổi xác suất từng vé", () => {
  const one = calculatePortfolioOdds(1);
  const ten = calculatePortfolioOdds(10);
  assert.equal(ten.cost, 100_000);
  assert.ok(Math.abs(ten.exactProbabilityAtLeast4 - one.exactProbabilityAtLeast4 * 10) < 1e-15);
  assert.equal(ten.exactProbabilityJackpot, 10 / 8_145_060);
});

test("từ chối số vé ngoài giới hạn", () => {
  for (const count of [0, 31, -1, 1.5]) assert.throws(() => optimizePortfolio(count));
});
