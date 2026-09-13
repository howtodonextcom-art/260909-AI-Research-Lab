/**
 * `npm run research:ablation-summary` — publishes a read-only, browser-
 * fetchable summary of `runAblation`'s output under
 * `public/data/ablation-summary.json`, the same way
 * `scripts/export-prospective-summary.ts` / `scripts/export-bao18-summary.ts`
 * already publish their own summaries under `public/data/`.
 *
 * One-stage design (call the real engine directly, no intermediate
 * `reports/*.json` artifact): unlike Bao-18's audit, `research-ablation.ts`
 * has no pre-existing artifact-writing convention to preserve — it only ever
 * printed to console. Ablation is also fully deterministic given the
 * canonical dataset + lookback + alpha (no RNG), so calling `runAblation`
 * directly here is exactly as reproducible as a two-stage report-then-export
 * pipeline would be, with less code and no stale-artifact risk. See
 * `lib/research/ablation-summary.ts` for the pure reshaping logic and the
 * honesty note this script never touches directly.
 */
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadSnapshot, resolvePaths } from "../lib/data/persistence";
import { runAblation } from "../lib/research/ablation";
import { buildAblationSummary, parseAblationSummary } from "../lib/research/ablation-summary";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const paths = resolvePaths(projectRoot);
const outPath = path.join(projectRoot, "public", "data", "ablation-summary.json");

const snapshot = await loadSnapshot(paths);
if (!snapshot.records.length) {
  console.error("Không có dữ liệu local — chạy npm run data:sync trước.");
  process.exit(1);
}

const report = runAblation(snapshot.records, 90);
const summary = buildAblationSummary(report, {
  datasetHash: snapshot.manifest?.datasetSha256 ?? null,
  datasetRecordCount: snapshot.records.length,
});

// Never publish something our own client-side parser would reject.
if (!parseAblationSummary(summary)) {
  console.error("Summary vừa dựng không qua được parseAblationSummary — hủy publish (fail-closed).");
  process.exit(1);
}

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

console.log("ĐÃ XUẤT ABLATION SUMMARY");
console.log(`  datasetHash:  ${summary.datasetHash ?? "(không có manifest)"}`);
console.log(`  fullFamilySize: ${summary.fullFamilySize} lookback=${summary.lookback} alpha=${summary.alpha}`);
console.log(`  số dòng ablation: ${summary.rows.length}`);
console.log(`  file:         ${path.relative(projectRoot, outPath)}`);
