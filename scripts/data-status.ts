/**
 * `npm run data:status` — prints what the local dataset currently holds.
 * Offline and read-only.
 */
import { fileURLToPath } from "node:url";
import { loadSnapshot, resolvePaths } from "../lib/data/persistence";
import { formatManifestStatus } from "../lib/data/report";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const paths = resolvePaths(projectRoot);

try {
  const snapshot = await loadSnapshot(paths);
  console.log(formatManifestStatus(snapshot.manifest, snapshot.records.length));
  if (snapshot.records.length) {
    const latest = snapshot.records[snapshot.records.length - 1];
    console.log(`  Kỳ mới nhất          #${latest.id} ${latest.date} → [${latest.result.join(", ")}]`);
  }
} catch (error) {
  console.error(`\nKhông đọc được dữ liệu: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
