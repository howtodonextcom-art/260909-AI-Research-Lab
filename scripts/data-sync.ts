/**
 * `npm run data:sync` — fetch, validate, merge and persist the Mega 6/45 dataset.
 *
 * Primary source is the official vietlott.vn history table (ADR-001); the
 * vietvudanh/vietlott-data mirror is demoted to secondary/cross-check only —
 * it is never fetched here and never authoritatively overwrites the primary
 * snapshot. Run `npm run data:cross-check` separately to compare the two.
 *
 * Exit codes: 0 when the snapshot is up to date (whether or not anything was
 * added), 1 when anything failed. A non-zero exit always means the previous
 * snapshot is still in place, untouched.
 */
import { fileURLToPath } from "node:url";
import { runSync } from "../lib/data/sync";
import { loadSnapshot, resolvePaths, saveManifest, saveSnapshot } from "../lib/data/persistence";
import { vietlottOfficialAdapter } from "../lib/data/sources/vietlott-official";
import { VIETLOTT_DATA_SOURCE } from "../lib/data/sources/vietlott-data";
import { formatSyncReport } from "../lib/data/report";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const paths = resolvePaths(projectRoot);
const force = process.argv.includes("--force");
const allowGaps = process.argv.includes("--allow-gaps");

// Stamps the demoted mirror in as `source.secondary`; `runSync` builds the
// manifest generically and has no notion of a secondary source.
function withSecondary<T extends { source: { primary: unknown; secondary: unknown } }>(manifest: T): T {
  return { ...manifest, source: { ...manifest.source, secondary: VIETLOTT_DATA_SOURCE } };
}

const summary = await runSync(
  {
    adapter: vietlottOfficialAdapter,
    loadSnapshot: () => loadSnapshot(paths),
    saveSnapshot: (records, manifest) => saveSnapshot(paths, records, withSecondary(manifest)),
    saveManifest: (manifest) => saveManifest(paths, withSecondary(manifest)),
    now: () => new Date(),
  },
  { force, allowGaps, timeoutMs: 30_000 },
);

console.log(formatSyncReport(summary));
console.log("\n  (Nguồn phụ đối chiếu: chạy `npm run data:cross-check` để so sánh với mirror vietlott-data.)");

if (summary.status === "failed") {
  process.exitCode = 1;
}
