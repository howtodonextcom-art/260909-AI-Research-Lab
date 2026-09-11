/**
 * `npm run data:cross-check` — deterministic spot verification (§11) between
 * the local canonical dataset, the official detail page, and the secondary
 * mirror (vietvudanh/vietlott-data). Unlike `data:verify-live`, this DOES
 * write — but only the manifest's `crossCheck` summary, never the dataset
 * itself and never an overwrite driven by the mirror (the mirror is
 * consulted, never authoritative — ADR-001).
 *
 * Exit codes: 0 = PASS, 1 = FAIL (a real mismatch), 2 = PARTIAL/EMPTY
 * (could not fully verify, e.g. offline) — distinct from FAIL on purpose,
 * per §39's "do not fake success" and "mark NOT EXECUTED" instructions.
 */
import { fileURLToPath } from "node:url";
import { loadSnapshot, resolvePaths, saveManifest } from "../lib/data/persistence";
import { fetchOfficialDraw } from "../lib/data/sources/vietlott-official";
import { vietlottDataAdapter } from "../lib/data/sources/vietlott-data";
import { runCrossCheck } from "../lib/data/cross-check";
import type { DrawRecord } from "../lib/data/types";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const paths = resolvePaths(projectRoot);
const sampleSize = Number(process.argv.find((a) => a.startsWith("--sample="))?.split("=")[1] ?? 8);
const seed = Number(process.argv.find((a) => a.startsWith("--seed="))?.split("=")[1] ?? 645);

const snapshot = await loadSnapshot(paths);
console.log("\nĐỐI CHIẾU CHÉO NGUỒN (official table vs official detail vs mirror)");
console.log(`  Local: ${snapshot.records.length} kỳ`);

let mirrorRecords: DrawRecord[] | null = null;
try {
  const mirrorResponse = await vietlottDataAdapter.fetchAll({ timeoutMs: 30_000 });
  if (mirrorResponse.raw) {
    mirrorRecords = mirrorResponse.raw
      .map((raw) => vietlottDataAdapter.normalize(raw))
      .filter((outcome): outcome is Extract<typeof outcome, { ok: true }> => outcome.ok)
      .map((outcome) => outcome.record);
    console.log(`  Mirror: ${mirrorRecords.length} kỳ đọc được`);
  }
} catch (error) {
  console.log(`  Mirror không khả dụng (bỏ qua đối chiếu mirror): ${error instanceof Error ? error.message : String(error)}`);
}

const report = await runCrossCheck({
  localRecords: snapshot.records,
  mirrorRecords,
  extraSampleSize: Math.max(0, sampleSize - 3),
  seed,
  fetchDetail: (id) => fetchOfficialDraw(id, { timeoutMs: 20_000 }),
});

console.log(`\n  Mẫu (${report.sampleSize}, seed=${report.seed}): ${report.sampledIds.join(", ")}`);
console.log(`  Trạng thái: ${report.status} (khớp lỗi: ${report.failureCount}, lỗi tải: ${report.fetchErrorCount})`);
for (const result of report.results) {
  const line = result.mismatches.length ? result.mismatches.join(" | ") : "khớp";
  console.log(`    #${result.id}: ${line}`);
}

if (snapshot.manifest) {
  await saveManifest(paths, {
    ...snapshot.manifest,
    crossCheck: { status: report.status, sampleSize: report.sampleSize, checkedAt: new Date().toISOString() },
  });
  console.log("\n  Đã cập nhật trạng thái crossCheck trong manifest.");
} else {
  console.log("\n  Không có manifest để cập nhật (chạy npm run data:sync trước).");
}

if (report.status === "FAIL") process.exit(1);
if (report.status === "PARTIAL" || report.status === "EMPTY") process.exit(2);
process.exit(0);
