import assert from "node:assert/strict";
import test from "node:test";
import { calculatePortfolioOdds } from "../portfolio";
import { computeExactBenchmark, EXACT_BENCHMARK_CAVEAT } from "./exact-benchmark";

test("N=1: projective và independentRandom giống hệt nhau (không có cấu trúc portfolio ở N=1)", () => {
  // 1-(1-p) vs p can differ in the last bit of floating-point precision; the
  // invariant under test is mathematical identity, not bit-identical floats.
  const [row] = computeExactBenchmark([1]);
  assert.ok(Math.abs(row.projective.probAtLeast4 - row.independentRandom.probAtLeast4) < 1e-15);
  assert.ok(Math.abs(row.projective.probAtLeast5 - row.independentRandom.probAtLeast5) < 1e-15);
  assert.ok(Math.abs(row.projective.probJackpot - row.independentRandom.probJackpot) < 1e-15);
  assert.ok(Math.abs(row.liftAtLeast4.absolute) < 1e-15);
  assert.ok(Math.abs(row.liftAtLeast5.absolute) < 1e-15);
  assert.ok(Math.abs(row.liftJackpot.absolute) < 1e-15);
});

test("khớp với calculatePortfolioOdds cho nhánh projective", () => {
  for (const count of [1, 5, 10, 20, 30]) {
    const [row] = computeExactBenchmark([count]);
    const odds = calculatePortfolioOdds(count);
    assert.equal(row.projective.probAtLeast4, odds.exactProbabilityAtLeast4);
    assert.equal(row.projective.probAtLeast5, odds.exactProbabilityAtLeast5);
    assert.equal(row.projective.probJackpot, odds.exactProbabilityJackpot);
  }
});

test("nhánh independentRandom dùng đúng công thức 1-(1-p)^N", () => {
  const total = 8_145_060;
  // P(một vé ngẫu nhiên trúng >=4) = (C(6,4)C(39,2)+C(6,5)C(39,1)+C(6,6)C(39,0)) / C(45,6)
  const combinations4 = 15 * 741 + 6 * 39 + 1 * 1;
  const p4 = combinations4 / total;
  const [row] = computeExactBenchmark([10]);
  assert.ok(Math.abs(row.independentRandom.probAtLeast4 - (1 - (1 - p4) ** 10)) < 1e-12);
  assert.equal(row.independentRandom.probJackpot, 1 - (1 - 1 / total) ** 10);
});

test("cả hai nhánh đều đơn điệu không giảm theo số vé", () => {
  const rows = computeExactBenchmark([1, 2, 5, 10, 15, 20, 25, 30]);
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const current = rows[index];
    assert.ok(current.projective.probAtLeast4 >= previous.projective.probAtLeast4);
    assert.ok(current.projective.probAtLeast5 >= previous.projective.probAtLeast5);
    assert.ok(current.projective.probJackpot >= previous.projective.probJackpot);
    assert.ok(current.independentRandom.probAtLeast4 >= previous.independentRandom.probAtLeast4);
    assert.ok(current.independentRandom.probAtLeast5 >= previous.independentRandom.probAtLeast5);
    assert.ok(current.independentRandom.probJackpot >= previous.independentRandom.probJackpot);
  }
});

test("lift luôn không âm (projective không bao giờ tệ hơn random độc lập ở cùng N) — báo cáo số thật, không làm đẹp", () => {
  const rows = computeExactBenchmark([1, 2, 5, 10, 15, 20, 25, 30]);
  for (const row of rows) {
    assert.ok(row.liftAtLeast4.absolute >= -1e-15, `N=${row.ticketCount} liftAtLeast4 âm: ${row.liftAtLeast4.absolute}`);
    assert.ok(row.liftAtLeast5.absolute >= -1e-15, `N=${row.ticketCount} liftAtLeast5 âm: ${row.liftAtLeast5.absolute}`);
    assert.ok(row.liftJackpot.absolute >= -1e-15, `N=${row.ticketCount} liftJackpot âm: ${row.liftJackpot.absolute}`);
  }
});

test("N=10 worked example khớp số trong báo cáo", () => {
  const [row] = computeExactBenchmark([10]);
  // Giá trị này được tính lại trong reports/*-exact-random-vs-projective-benchmark.md — giữ đồng bộ.
  assert.equal(row.ticketCount, 10);
  assert.ok(row.projective.probAtLeast4 > row.independentRandom.probAtLeast4);
  assert.ok(row.liftAtLeast4.relative > 0);
});

test("từ chối ticketCount ngoài giới hạn 1-30", () => {
  for (const count of [0, 31, -1, 1.5]) {
    assert.throws(() => computeExactBenchmark([count]));
  }
});

test("caveat trung thực được export và không rỗng", () => {
  assert.ok(EXACT_BENCHMARK_CAVEAT.length > 20);
  assert.match(EXACT_BENCHMARK_CAVEAT, /không làm một vé riêng lẻ/i);
});
