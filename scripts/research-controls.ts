/**
 * `npm run research:controls` — run negative controls A/B/C and print the
 * exact null contract (PRIMARY_ENDPOINT / EXPECTED_MATCHES).
 */
import { fileURLToPath } from "node:url";
import { loadSnapshot, resolvePaths } from "../lib/data/persistence";
import { runIidSyntheticControl, runRandomBaselineControl, runTimeShuffleControl } from "../lib/research/negative-controls";
import { EXPECTED_MATCHES, PRIMARY_ENDPOINT } from "../lib/research/statistics";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const paths = resolvePaths(projectRoot);
const snapshot = await loadSnapshot(paths);

console.log("\nNEGATIVE CONTROLS A/B/C");
console.log(`  Endpoint: ${PRIMARY_ENDPOINT.id}`);
console.log(`  EXPECTED_MATCHES: ${EXPECTED_MATCHES}`);

const controlA = runIidSyntheticControl({ drawCount: 220, lookback: 60, replications: 15, seed: 1 });
console.log("\n  A — IID synthetic");
console.log(`    replications=${controlA.replications} drawCount=${controlA.drawCount}`);
for (const [strategy, rate] of Object.entries(controlA.passRateByStrategy)) {
  console.log(`    ${strategy} passRate=${rate.toFixed(3)}`);
}

if (!snapshot.records.length) {
  console.error("\n  Không có dữ liệu local — bỏ qua B/C. Chạy npm run data:sync trước.");
  process.exit(1);
}

const controlB = runTimeShuffleControl(snapshot.records, 90, 645);
console.log("\n  B — time shuffle (phá cấu trúc thời gian)");
console.log(`    original trials=${controlB.original[0]?.trials ?? 0} shuffled trials=${controlB.shuffled[0]?.trials ?? 0}`);
console.log("    strategy | edge_original | edge_shuffled | Δ(orig−shuf)");
for (const row of controlB.original.filter((r) => r.strategy !== "RANDOM")) {
  const shuffled = controlB.shuffled.find((r) => r.strategy === row.strategy);
  const delta = controlB.edgeDeltaByStrategy[row.strategy as Exclude<typeof row.strategy, "RANDOM">];
  console.log(
    `    ${row.strategy.padEnd(8)} | ${row.edgeVsRandom.toFixed(4).padStart(13)} | ${(shuffled?.edgeVsRandom ?? 0).toFixed(4).padStart(13)} | ${delta.toFixed(4)}`,
  );
}
console.log(`    temporalSignalCollapsed=${controlB.temporalSignalCollapsed} (mọi |edge| sau shuffle ≤ |edge| gốc)`);
console.log("    Nếu edge sau shuffle vẫn lớn và giống hệt gốc → nghi tín hiệu giả / bug pipeline.");

const controlC = runRandomBaselineControl(snapshot.records, 90);
console.log("\n  C — RANDOM vs exact null");
console.log(`    observed=${controlC.observedMean.toFixed(4)} expected=${controlC.expectedMean.toFixed(4)} |Δ|=${controlC.absoluteDifference.toFixed(4)}`);
console.log("\n  Xong.");
