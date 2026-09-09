import assert from "node:assert/strict";
import test from "node:test";
import { choose, outcomes, profitLedger, fixedPrizeExpectation } from "./profit";

test("exact distribution conserves all 8,145,060 combinations and mean 0.8", () => {
  assert.equal(choose(45, 6), 8145060);
  assert.equal(outcomes.reduce((sum, x) => sum + x.combinations, 0), 8145060);
  assert.ok(Math.abs(outcomes.reduce((sum, x) => sum + x.probability, 0) - 1) < 1e-12);
  assert.ok(Math.abs(outcomes.reduce((sum, x) => sum + x.matches * x.probability, 0) - .8) < 1e-12);
  assert.equal(outcomes[3].combinations, 182780);
});
test("20k net requires 30k returned on first ticket", () => {
  assert.equal(profitLedger(0, 30000).net, 20000);
  assert.equal(profitLedger(0, 20000).net, 10000);
});
test("all losing tickets are charged, including the final winning ticket", () => {
  assert.equal(profitLedger(2, 30000).net, 0);
  assert.equal(profitLedger(3, 30000).net, -10000);
  assert.equal(profitLedger(10, 30000).requiredFor20k, 130000);
});
test("invalid ledger values rejected and jackpot never replaced by a fixed payout", () => {
  for (const n of [-1, .5, NaN, Infinity, 10001]) assert.throws(() => profitLedger(n, 30000));
  assert.equal(outcomes[6].payout, null);
  assert.ok(fixedPrizeExpectation() < 10000);
});
