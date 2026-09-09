/**
 * `npm run data:check` — offline integrity check of the local dataset.
 *
 * Never touches the network. Verifies that the snapshot parses, that every
 * whole-dataset invariant holds, and that the manifest still describes the
 * bytes actually on disk.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadSnapshot, resolvePaths } from "../lib/data/persistence";
import { serializeDrawsJsonl } from "../lib/data/jsonl";
import { validateDataset } from "../lib/data/merge";
import { sha256Hex } from "../lib/data/hash";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const paths = resolvePaths(projectRoot);
const failures: string[] = [];

let snapshot;
try {
  snapshot = await loadSnapshot(paths);
} catch (error) {
  console.error(`\nKIỂM TRA THẤT BẠI\n  ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

console.log("\nKIỂM TRA TOÀN VẸN DỮ LIỆU");
console.log(`  Bản ghi: ${snapshot.records.length}`);

if (!snapshot.records.length) failures.push("dataset rỗng");

const datasetCheck = validateDataset(snapshot.records);
if (!datasetCheck.valid) {
  for (const issue of datasetCheck.issues) failures.push(issue.reason);
} else {
  console.log("  ✓ Không trùng mã kỳ, thứ tự canonical đúng");
}

const serialized = serializeDrawsJsonl(snapshot.records);
const actualHash = await sha256Hex(serialized);
console.log(`  SHA-256 hiện tại: ${actualHash}`);

if (!snapshot.manifest) {
  failures.push("thiếu manifest — chạy npm run data:sync");
} else {
  if (snapshot.manifest.datasetSha256 !== actualHash) {
    failures.push(
      `hash trong manifest (${snapshot.manifest.datasetSha256.slice(0, 16)}…) ` +
        `không khớp dữ liệu thực tế (${actualHash.slice(0, 16)}…)`,
    );
  } else {
    console.log("  ✓ Hash khớp manifest");
  }
  if (snapshot.manifest.recordCount !== snapshot.records.length) {
    failures.push(
      `recordCount trong manifest (${snapshot.manifest.recordCount}) ≠ thực tế (${snapshot.records.length})`,
    );
  } else {
    console.log("  ✓ recordCount khớp");
  }
}

// The bundled file must already be canonical, otherwise the browser and the
// CLI would disagree about the hash of identical data.
const onDisk = await readFile(paths.snapshot, "utf8");
if (onDisk !== serialized) {
  failures.push("file trên đĩa chưa ở dạng canonical (chạy npm run data:sync để chuẩn hoá)");
} else {
  console.log("  ✓ File trên đĩa đã ở dạng canonical");
}

if (failures.length) {
  console.error("\n  THẤT BẠI:");
  for (const failure of failures) console.error(`    - ${failure}`);
  process.exit(1);
}

console.log("\n  Tất cả kiểm tra đạt.");
