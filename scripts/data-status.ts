/**
 * `npm run data:status` — prints what the local dataset currently holds.
 * Offline and read-only. `--json` prints a machine-readable report instead
 * (§34): source, record count, first/latest draw, missing ids, duplicate
 * count, conflict count, dataset hash, cross-check status, last successful sync.
 */
import { fileURLToPath } from "node:url";
import { loadSnapshot, resolvePaths } from "../lib/data/persistence";
import { formatManifestStatus } from "../lib/data/report";
import { analyzeContinuity } from "../lib/data/continuity";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const paths = resolvePaths(projectRoot);
const asJson = process.argv.includes("--json");

try {
  const snapshot = await loadSnapshot(paths);

  if (asJson) {
    const continuity = analyzeContinuity(snapshot.records);
    console.log(
      JSON.stringify(
        {
          source: snapshot.manifest?.source ?? null,
          recordCount: snapshot.records.length,
          firstDrawId: continuity.firstId,
          firstDrawDate: snapshot.records[0]?.date ?? null,
          latestDrawId: continuity.latestId,
          latestDrawDate: snapshot.records.at(-1)?.date ?? null,
          missingIds: continuity.missingIds,
          duplicateIds: continuity.duplicateIds,
          conflictCount: snapshot.manifest?.validation.conflicts ?? null,
          datasetSha256: snapshot.manifest?.datasetSha256 ?? null,
          crossCheck: snapshot.manifest?.crossCheck ?? null,
          lastSuccessfulSync: snapshot.manifest?.lastSuccessfulSync ?? null,
          lastAttemptedSync: snapshot.manifest?.lastAttemptedSync ?? null,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  console.log(formatManifestStatus(snapshot.manifest, snapshot.records.length));
  if (snapshot.records.length) {
    const latest = snapshot.records[snapshot.records.length - 1];
    console.log(`  Kỳ mới nhất          #${latest.id} ${latest.date} → [${latest.result.join(", ")}]`);
  }
} catch (error) {
  console.error(`\nKhông đọc được dữ liệu: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
