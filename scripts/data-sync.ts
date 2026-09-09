/**
 * `npm run data:sync` — fetch, validate, merge and persist the Mega 6/45 dataset.
 *
 * Exit codes: 0 when the snapshot is up to date (whether or not anything was
 * added), 1 when anything failed. A non-zero exit always means the previous
 * snapshot is still in place, untouched.
 */
import { fileURLToPath } from "node:url";
import { runSync } from "../lib/data/sync";
import { loadSnapshot, resolvePaths, saveManifest, saveSnapshot } from "../lib/data/persistence";
import { vietlottDataAdapter } from "../lib/data/sources/vietlott-data";
import { formatSyncReport } from "../lib/data/report";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const paths = resolvePaths(projectRoot);
const force = process.argv.includes("--force");

const summary = await runSync(
  {
    adapter: vietlottDataAdapter,
    loadSnapshot: () => loadSnapshot(paths),
    saveSnapshot: (records, manifest) => saveSnapshot(paths, records, manifest),
    saveManifest: (manifest) => saveManifest(paths, manifest),
    now: () => new Date(),
  },
  { force },
);

console.log(formatSyncReport(summary));

if (summary.status === "failed") {
  process.exitCode = 1;
}
