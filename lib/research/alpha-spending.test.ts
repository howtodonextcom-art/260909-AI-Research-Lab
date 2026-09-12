import assert from "node:assert/strict";
import test from "node:test";
import { pocockCumulativeSpend, spentAlphaForLook } from "./alpha-spending";

test("lookCount === 1 giữ nguyên alpha 0.05", () => {
  assert.equal(spentAlphaForLook(1, 0.05), 0.05);
  assert.equal(spentAlphaForLook(0, 0.05), 0.05);
  assert.equal(spentAlphaForLook(-3, 0.05), 0.05);
});

test("lookCount > 1: alpha look sau nhỏ hơn 0.05 và được pin", () => {
  const look2 = spentAlphaForLook(2, 0.05);
  const look3 = spentAlphaForLook(3, 0.05);
  // Pocock incremental at K=2: α − α*(1/2) = 0.05 − 0.05·ln(1+(e−1)/2)
  assert.ok(Math.abs(look2 - 0.018994274652086127) < 1e-12, `look2=${look2}`);
  assert.ok(look2 < 0.05);
  assert.ok(look3 < look2);
  assert.ok(look3 > 0);
});

test("Pocock cumulative spend: t=0 → 0, t=1 → alpha", () => {
  assert.equal(pocockCumulativeSpend(0, 0.05), 0);
  assert.equal(pocockCumulativeSpend(1, 0.05), 0.05);
  assert.ok(pocockCumulativeSpend(0.5, 0.05) > 0);
  assert.ok(pocockCumulativeSpend(0.5, 0.05) < 0.05);
});
