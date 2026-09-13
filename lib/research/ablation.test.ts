import assert from "node:assert/strict";
import test from "node:test";
import { holmBonferroni, runTemporalBacktestReport, type DrawRecord } from "../analytics";
import { runAblation, type AblatableStrategy } from "./ablation";
import { createRng, drawFairTicket } from "./rng";

function syntheticDraws(n: number, seed: number): DrawRecord[] {
  const rng = createRng(seed);
  return Array.from({ length: n }, (_, i) => ({
    date: `20${String(10 + Math.floor(i / 300)).padStart(2, "0")}-${String((Math.floor(i / 25) % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    id: String(i + 1).padStart(5, "0"),
    result: drawFairTicket(rng),
  }));
}

const ALL_STRATEGIES: AblatableStrategy[] = ["HOT", "COLD", "BALANCED"];

test("runAblation: một mục ablation cho mỗi chiến lược HOT/COLD/BALANCED, mỗi mục còn đúng 2 chiến lược kia", () => {
  const draws = syntheticDraws(400, 7);
  const report = runAblation(draws, 90);
  assert.equal(report.ablations.length, 3);
  for (const ablation of report.ablations) {
    assert.ok(ALL_STRATEGIES.includes(ablation.removed));
    const remaining = ablation.deltas.map((d) => d.strategy).sort();
    const expected = ALL_STRATEGIES.filter((s) => s !== ablation.removed).sort();
    assert.deepEqual(remaining, expected);
  }
});

test("runAblation: deltaValidationEdge luôn bằng 0 — edge riêng của một chiến lược không phụ thuộc các chiến lược khác", () => {
  const draws = syntheticDraws(400, 11);
  const report = runAblation(draws, 90);
  for (const ablation of report.ablations) {
    for (const delta of ablation.deltas) {
      assert.equal(delta.deltaValidationEdge, 0);
    }
  }
});

test("runAblation: ablatedFamilySize = fullFamilySize - 1 (thu hẹp họ Holm đúng 1 khi bỏ 1 chiến lược)", () => {
  const draws = syntheticDraws(400, 21);
  const report = runAblation(draws, 90);
  for (const ablation of report.ablations) {
    assert.equal(ablation.fullFamilySize, report.fullFamilySize);
    assert.equal(ablation.ablatedFamilySize, Math.max(report.fullFamilySize - 1, 2));
  }
});

test("runAblation: adjusted p-value sau ablation không bao giờ LỚN HƠN adjusted p-value gốc (thu hẹp họ Holm chỉ có thể nới lỏng, không siết chặt)", () => {
  const draws = syntheticDraws(400, 33);
  const report = runAblation(draws, 90);
  for (const ablation of report.ablations) {
    for (const delta of ablation.deltas) {
      assert.ok(
        delta.validation.ablatedAdjustedPValue <= delta.validation.originalAdjustedPValue + 1e-9,
        `VALIDATION ${delta.strategy}: ablated ${delta.validation.ablatedAdjustedPValue} > original ${delta.validation.originalAdjustedPValue}`,
      );
      assert.ok(
        delta.test.ablatedAdjustedPValue <= delta.test.originalAdjustedPValue + 1e-9,
        `TEST ${delta.strategy}: ablated ${delta.test.ablatedAdjustedPValue} > original ${delta.test.originalAdjustedPValue}`,
      );
    }
  }
});

test("runAblation: nếu chiến lược đã significant trong Full thì vẫn significant sau ablation (không bao giờ đảo chiều ngược)", () => {
  const draws = syntheticDraws(400, 45);
  const report = runAblation(draws, 90);
  for (const ablation of report.ablations) {
    for (const delta of ablation.deltas) {
      if (delta.validation.originalSignificant) assert.equal(delta.validation.ablatedSignificant, true);
      if (delta.test.originalSignificant) assert.equal(delta.test.ablatedSignificant, true);
    }
  }
});

test("runAblation: adjusted p-value sau ablation khớp với việc gọi trực tiếp holmBonferroni trên đúng 2 p-value còn lại", () => {
  const draws = syntheticDraws(400, 99);
  const report = runAblation(draws, 90);
  // Cross-check against the underlying analytics report directly, using the
  // already-tested holmBonferroni primitive, rather than trusting ablation.ts's
  // own wiring.
  const full = runTemporalBacktestReport(draws, 90);
  for (const ablation of report.ablations) {
    const remaining = ALL_STRATEGIES.filter((s) => s !== ablation.removed);
    for (const phaseId of ["VALIDATION", "TEST"] as const) {
      const items = remaining.map((strategy) => ({
        strategy,
        pValue: full.results.find((r) => r.phase === phaseId && r.strategy === strategy)!.pValueVsRandom,
      }));
      const expected = holmBonferroni(items, ablation.ablatedFamilySize);
      for (const item of expected) {
        const delta = ablation.deltas.find((d) => d.strategy === item.strategy)!;
        const actual = phaseId === "VALIDATION" ? delta.validation.ablatedAdjustedPValue : delta.test.ablatedAdjustedPValue;
        assert.ok(Math.abs(actual - item.adjustedPValue) < 1e-12, `${phaseId} ${item.strategy}: ${actual} != ${item.adjustedPValue}`);
      }
    }
  }
});

test("runAblation: tái lập được với cùng dữ liệu và tham số (thuần, không ngẫu nhiên ẩn)", () => {
  const draws = syntheticDraws(300, 5);
  const a = runAblation(draws, 60);
  const b = runAblation(draws, 60);
  assert.deepEqual(a, b);
});

test("runAblation: verdict là chuỗi mô tả cho từng ablation, luôn đề cập chiến lược bị bỏ", () => {
  const draws = syntheticDraws(300, 5);
  const report = runAblation(draws, 60);
  for (const ablation of report.ablations) {
    assert.equal(typeof ablation.verdict, "string");
    assert.ok(ablation.verdict.includes(ablation.removed));
  }
});
