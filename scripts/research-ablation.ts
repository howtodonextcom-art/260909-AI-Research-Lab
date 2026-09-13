/**
 * `npm run research:ablation` — marginal value of each baseline strategy in
 * the pre-registered Holm-Bonferroni family (§B1/§B3 remaining: "Ablation
 * harness"). Reads the real canonical dataset; does not run inside `npm
 * test`. See `lib/research/ablation.ts` for the pure logic and the honesty
 * note on what "ablation" can and cannot mean here without forking
 * `lib/analytics.ts`'s internals.
 */
import { fileURLToPath } from "node:url";
import { loadSnapshot, resolvePaths } from "../lib/data/persistence";
import { runAblation } from "../lib/research/ablation";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const paths = resolvePaths(projectRoot);
const snapshot = await loadSnapshot(paths);

if (!snapshot.records.length) {
  console.error("Không có dữ liệu local — chạy npm run data:sync trước.");
  process.exit(1);
}

console.log("\nABLATION — giá trị biên của từng chiến lược nền trong họ kiểm định Holm-Bonferroni");
console.log("(KHÔNG chạy lại walk-forward: edge riêng của một chiến lược không phụ thuộc các chiến lược khác — xem lib/research/ablation.ts).\n");

const report = runAblation(snapshot.records, 90);
console.log(`  fullFamilySize=${report.fullFamilySize} lookback=${report.lookback} alpha(spent)=${report.alpha}\n`);

for (const ablation of report.ablations) {
  console.log(`  Bỏ ${ablation.removed} (familySize ${ablation.fullFamilySize} -> ${ablation.ablatedFamilySize})`);
  console.log("    chiến lược còn lại | Δvalidation edge | VAL adj-p (gốc→ablated) | TEST adj-p (gốc→ablated) | mới vượt alpha?");
  for (const delta of ablation.deltas) {
    const flips = delta.validation.newlySignificantAfterAblation || delta.test.newlySignificantAfterAblation;
    const valCell = `${delta.validation.originalAdjustedPValue.toFixed(4)} -> ${delta.validation.ablatedAdjustedPValue.toFixed(4)}`;
    const testCell = `${delta.test.originalAdjustedPValue.toFixed(4)} -> ${delta.test.ablatedAdjustedPValue.toFixed(4)}`;
    console.log(
      `    ${delta.strategy.padEnd(18)} | ${delta.deltaValidationEdge.toFixed(4).padStart(17)} | ${valCell} | ${testCell} | ${flips ? "CÓ — cảnh báo" : "không"}`,
    );
  }
  console.log(`    Kết luận: ${ablation.verdict}\n`);
}

console.log("  Diễn giải: familySize phải được đăng ký trước (pre-registered), không được thu hẹp sau khi thấy");
console.log("  kết quả để giúp một chiến lược khác vượt alpha — bảng trên tồn tại để LỘ RÕ rủi ro đó, không phải để đề xuất bỏ baseline.");
console.log("\n  Xong.");
