/**
 * `npm run data:verify-live` — read-only comparison against the live source.
 *
 * Never writes. Intended for humans and CI smoke checks, and deliberately kept
 * out of the default test run so `npm test` stays offline and deterministic.
 */
import { fileURLToPath } from "node:url";
import { loadSnapshot, resolvePaths } from "../lib/data/persistence";
import { vietlottDataAdapter } from "../lib/data/sources/vietlott-data";
import type { DrawRecord } from "../lib/data/types";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const paths = resolvePaths(projectRoot);

console.log("\nKIỂM CHỨNG NGUỒN TRỰC TIẾP (chỉ đọc, không ghi)");
console.log(`  Nguồn:      ${vietlottDataAdapter.sourceUrl}`);
console.log(`  Thời điểm:  ${new Date().toISOString()}`);

const snapshot = await loadSnapshot(paths);
console.log(`  Local:      ${snapshot.records.length} kỳ, mới nhất ${snapshot.records.at(-1)?.date ?? "—"}`);

let response;
try {
  response = await vietlottDataAdapter.fetchAll({ timeoutMs: 30_000 });
} catch (error) {
  console.error(`\n  Không truy cập được nguồn: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

if (response.raw === null) {
  console.log("  Nguồn báo không thay đổi (304).");
  process.exit(0);
}

const remote: DrawRecord[] = [];
const rejected: string[] = [];
for (const raw of response.raw) {
  const outcome = vietlottDataAdapter.normalize(raw);
  if (outcome.ok) remote.push(outcome.record);
  else rejected.push(outcome.reason);
}

console.log(`  Nguồn:      ${remote.length} kỳ hợp lệ, ${rejected.length} bị từ chối`);
console.log(`  ETag:       ${response.etag ?? "—"}`);

const localIds = new Set(snapshot.records.map((record) => record.id));
const remoteById = new Map(remote.map((record) => [record.id, record]));
const newIds = remote.filter((record) => !localIds.has(record.id));
const conflicts = snapshot.records.filter((record) => {
  const match = remoteById.get(record.id);
  return match && (match.date !== record.date || match.result.join() !== record.result.join());
});

console.log(`\n  Kỳ mới ở nguồn:  ${newIds.length}`);
if (newIds.length) {
  for (const record of newIds.slice(0, 10)) {
    console.log(`    #${record.id} ${record.date} → [${record.result.join(", ")}]`);
  }
}
console.log(`  Xung đột:        ${conflicts.length}`);
for (const record of conflicts.slice(0, 10)) {
  console.log(`    #${record.id}: local [${record.result.join(", ")}] ≠ nguồn [${remoteById.get(record.id)!.result.join(", ")}]`);
}

if (rejected.length) {
  console.log(`\n  Bản ghi bị từ chối (mẫu): ${rejected.slice(0, 5).join(" | ")}`);
}

console.log(
  newIds.length
    ? `\n  Có ${newIds.length} kỳ mới. Chạy: npm run data:sync`
    : "\n  Local đã khớp nguồn.",
);
process.exit(conflicts.length || rejected.length ? 1 : 0);
