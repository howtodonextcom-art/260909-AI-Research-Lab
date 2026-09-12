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
console.log("\n  B — time shuffle");
console.log(`    original trials=${controlB.original[0]?.trials ?? 0} shuffled trials=${controlB.shuffled[0]?.trials ?? 0}`);

const controlC = runRandomBaselineControl(snapshot.records, 90);
console.log("\n  C — RANDOM vs exact null");
console.log(`    observed=${controlC.observedMean.toFixed(4)} expected=${controlC.expectedMean.toFixed(4)} |Δ|=${controlC.absoluteDifference.toFixed(4)}`);
console.log("\n  Xong.");
