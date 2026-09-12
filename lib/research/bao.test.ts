import assert from "node:assert/strict";
import test from "node:test";
import { choose } from "../profit";
import {
  baoCost,
  baoJackpotProbability,
  baoPoolSizeForBudget,
  baoTickets,
  costCoverageFrontier,
  randomSameNJackpotEstimate,
} from "./bao";

test("baoTickets(18) = C(18,6) = 18564 chính xác (pin số)", () => {
  assert.equal(baoTickets(18), 18564);
});

test("baoJackpotProbability(45) = 1 (phủ toàn bộ 45 số thì chắc chắn trúng jackpot)", () => {
  assert.equal(baoJackpotProbability(45), 1);
});

test("baoJackpotProbability(6) = 1/C(45,6) — bao-6 chỉ là 1 vé duy nhất", () => {
  assert.equal(baoTickets(6), 1);
  assert.equal(baoJackpotProbability(6), 1 / choose(45, 6));
});

test("baoCost tỉ lệ tuyến tính với baoTickets theo giá vé cố định", () => {
  for (const n of [6, 10, 18, 25]) {
    assert.equal(baoCost(n), baoTickets(n) * 10_000);
  }
});

test("baoTickets/baoCost/baoJackpotProbability từ chối pool ngoài 6..45", () => {
  for (const n of [5, 46, 0, -1, 6.5]) {
    assert.throws(() => baoTickets(n));
  }
});

test("baoJackpotProbability tăng đơn điệu theo kích thước pool", () => {
  let previous = 0;
  for (let n = 6; n <= 45; n += 1) {
    const p = baoJackpotProbability(n);
    assert.ok(p >= previous);
    previous = p;
  }
});

test("randomSameNJackpotEstimate nằm trong [0,1] và tăng theo số vé", () => {
  const a = randomSameNJackpotEstimate(10);
  const b = randomSameNJackpotEstimate(20);
  assert.ok(a.approxProbabilityJackpot >= 0 && a.approxProbabilityJackpot <= 1);
  assert.ok(b.approxProbabilityJackpot >= 0 && b.approxProbabilityJackpot <= 1);
  assert.ok(b.approxProbabilityJackpot > a.approxProbabilityJackpot);
});

test("randomSameNJackpotEstimate xấp xỉ n/C(45,6) khi n nhỏ so với tổng tổ hợp", () => {
  const total = choose(45, 6);
  const estimate = randomSameNJackpotEstimate(10);
  const naive = 10 / total;
  assert.ok(Math.abs(estimate.approxProbabilityJackpot - naive) < 1e-9);
});

test("baoPoolSizeForBudget: ngân sách đúng bằng baoCost(18) trả về pool 18", () => {
  assert.equal(baoPoolSizeForBudget(baoCost(18)), 18);
});

test("baoPoolSizeForBudget từ chối ngân sách dưới giá bao nhỏ nhất (bao-6)", () => {
  assert.throws(() => baoPoolSizeForBudget(baoCost(6) - 1));
});

test("costCoverageFrontier: thứ tự nhất quán — ngân sách tăng thì pool bao và chi phí bao không giảm", () => {
  const budgets = [baoCost(6), baoCost(10), baoCost(14), baoCost(18)];
  const rows = costCoverageFrontier(budgets);
  for (let i = 1; i < rows.length; i += 1) {
    assert.ok(rows[i].bao.poolSize >= rows[i - 1].bao.poolSize);
    assert.ok(rows[i].bao.cost >= rows[i - 1].bao.cost);
    assert.ok(rows[i].bao.jackpotProbability >= rows[i - 1].bao.jackpotProbability);
  }
});

test("costCoverageFrontier: mỗi hàng có caveat bắt buộc, không rỗng", () => {
  const rows = costCoverageFrontier([100_000, 300_000, baoCost(18)]);
  for (const row of rows) {
    assert.ok(row.caveat.length > 20);
  }
});

test("costCoverageFrontier: nhánh projective bị giới hạn 30 vé khi ngân sách lớn (bao-18)", () => {
  const [row] = costCoverageFrontier([baoCost(18)]);
  assert.equal(row.projective.tickets, 30);
  assert.equal(row.projective.cappedAt30, true);
  assert.ok(row.projective.odds !== null);
});

test("costCoverageFrontier: ngân sách nhỏ (đúng 1 vé) cho projective 1 vé, không capped", () => {
  const [row] = costCoverageFrontier([10_000]);
  assert.equal(row.projective.tickets, 1);
  assert.equal(row.projective.cappedAt30, false);
  assert.ok(row.projective.odds !== null);
});
