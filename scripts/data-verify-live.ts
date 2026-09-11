/**
 * `npm run data:verify-live` — read-only comparison against the live official
 * source (§33). Never writes. Kept out of `npm test` so the default suite
 * stays offline and deterministic (§39).
 *
 * Exit codes:
 *   0  local matches the official source (no new draws, no conflicts)
 *   1  a critical mismatch was found (conflict, or a structure-changed parse
 *      failure — the parser itself may be broken)
 *   2  the live source could not be reached at all (DNS/timeout/network) —
 *      reported as "LIVE VERIFICATION = NOT EXECUTED", never silently
 *      treated as success and never conflated with a real data problem.
 */
import { fileURLToPath } from "node:url";
import { loadSnapshot, resolvePaths } from "../lib/data/persistence";
import { vietlottOfficialAdapter, OfficialFetchError, OfficialParseError, fetchOfficialDraw } from "../lib/data/sources/vietlott-official";
import { HttpError } from "../lib/data/http";
import { runCrossCheck } from "../lib/data/cross-check";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const paths = resolvePaths(projectRoot);

console.log("\nKIỂM CHỨNG NGUỒN TRỰC TIẾP (chỉ đọc, không ghi)");
console.log(`  Nguồn chính: ${vietlottOfficialAdapter.sourceUrl}`);
console.log(`  Thời điểm:   ${new Date().toISOString()}`);

const snapshot = await loadSnapshot(paths);
console.log(`  Local:       ${snapshot.records.length} kỳ, mới nhất ${snapshot.records.at(-1)?.date ?? "—"} (#${snapshot.records.at(-1)?.id ?? "—"})`);

function isNetworkUnreachable(error: unknown): boolean {
  if (error instanceof OfficialParseError) return false; // the site answered; the markup just doesn't match — a real finding.
  if (error instanceof OfficialFetchError) return false; // the site answered with a malformed/erroring payload — a real finding.
  if (error instanceof HttpError) return error.status === null; // null status means the request never got an HTTP response at all.
  return true; // anything else (DNS, TLS, abort) is presumed a connectivity problem.
}

let response;
try {
  response = await vietlottOfficialAdapter.fetchSince(
    { etag: null, latestDrawDate: snapshot.records.at(-1)?.date ?? null, latestId: snapshot.records.at(-1)?.id ?? null },
    { timeoutMs: 30_000 },
  );
} catch (error) {
  if (isNetworkUnreachable(error)) {
    console.log(`\n  Không kết nối được tới nguồn trực tiếp: ${error instanceof Error ? error.message : String(error)}`);
    console.log("\n  LIVE VERIFICATION = NOT EXECUTED");
    process.exit(2);
  }
  console.error(`\n  LỖI NGHIÊM TRỌNG khi đọc nguồn trực tiếp: ${error instanceof Error ? error.message : String(error)}`);
  if (error instanceof OfficialParseError) {
    console.error("  → Đây là lỗi cấu trúc trang (PARSE_STRUCTURE_CHANGED): parser có thể đã hỏng do Vietlott đổi giao diện.");
  }
  process.exit(1);
}

if (response.raw === null) {
  console.log("  Nguồn báo không có kỳ mới (đã khớp local).");
} else {
  console.log(`\n  Kỳ mới ở nguồn: ${response.raw.length}`);
  for (const raw of response.raw.slice(0, 10)) {
    const row = raw as { id: string; date: string; result: number[] };
    console.log(`    #${row.id} ${row.date} → [${row.result.join(", ")}]`);
  }
}

console.log("\n  ĐỐI CHIẾU MẪU (deterministic spot-check qua trang chi tiết)");
const crossCheck = await runCrossCheck({
  localRecords: snapshot.records,
  mirrorRecords: null, // mirror comparison is `npm run data:cross-check`'s job; this stays official-only.
  extraSampleSize: 5,
  seed: 645,
  fetchDetail: (id) => fetchOfficialDraw(id, { timeoutMs: 20_000 }),
});
console.log(`  Mẫu (${crossCheck.sampleSize}, seed=${crossCheck.seed}): ${crossCheck.sampledIds.join(", ")}`);
console.log(`  Trạng thái: ${crossCheck.status} (khớp lỗi: ${crossCheck.failureCount}, lỗi tải: ${crossCheck.fetchErrorCount})`);
for (const result of crossCheck.results) {
  if (result.mismatches.length) console.log(`    #${result.id}: ${result.mismatches.join(" | ")}`);
}

const criticalMismatch = (response.raw !== null && response.raw.length === 0) || crossCheck.status === "FAIL";
console.log(criticalMismatch ? "\n  LIVE VERIFICATION = FAIL" : "\n  LIVE VERIFICATION = PASS");
process.exit(criticalMismatch ? 1 : 0);
