/**
 * Human-readable rendering of a sync result, shared by the CLI commands.
 * Kept separate from `sync.ts` so orchestration stays free of presentation.
 */
import type { DatasetManifest, SyncSummary } from "./types";

function line(label: string, value: string | number): string {
  return `  ${label.padEnd(24)} ${value}`;
}

export function formatSyncReport(summary: SyncSummary): string {
  const rows: string[] = [];
  const header =
    summary.status === "ok"
      ? "ĐỒNG BỘ THÀNH CÔNG"
      : summary.status === "not-modified"
        ? "KHÔNG CÓ DỮ LIỆU MỚI"
        : "ĐỒNG BỘ THẤT BẠI";

  rows.push(`\n${header}`);
  rows.push(line("Nguồn", summary.source));
  rows.push(line("Thời điểm", summary.fetchedAt));

  if (summary.status !== "not-modified") {
    rows.push(line("Bản ghi nhận về", summary.fetched));
    rows.push(line("Hợp lệ", summary.valid));
    rows.push(line("Thêm mới", summary.added));
    rows.push(line("Không đổi", summary.unchanged));
    rows.push(line("Trùng lặp", summary.duplicates));
    rows.push(line("Xung đột", summary.conflicts));
    rows.push(line("Bị từ chối", summary.rejected));
  }

  rows.push(line("Tổng sau khi gộp", summary.totalAfterMerge));
  rows.push(line("Kỳ đầu tiên", summary.firstDrawDate ?? "—"));
  rows.push(line("Kỳ mới nhất", summary.latestDrawDate ?? "—"));
  rows.push(line("SHA-256", summary.datasetHash ? summary.datasetHash.slice(0, 16) + "…" : "—"));

  if (summary.issues.length) {
    rows.push("\n  Vấn đề dữ liệu:");
    for (const issue of summary.issues.slice(0, 10)) {
      rows.push(`    - ${issue.id ? `kỳ ${issue.id}: ` : ""}${issue.reason}`);
    }
    if (summary.issues.length > 10) rows.push(`    …và ${summary.issues.length - 10} vấn đề khác`);
  }

  if (summary.conflictDetails.length) {
    rows.push("\n  Xung đột (dữ liệu cũ được giữ nguyên):");
    for (const conflict of summary.conflictDetails.slice(0, 10)) {
      rows.push(
        `    - kỳ ${conflict.id}: local [${conflict.existing.result.join(", ")}] ` +
          `≠ nguồn [${conflict.incoming.result.join(", ")}]`,
      );
    }
  }

  if (summary.error) {
    rows.push(`\n  Lỗi: ${summary.error}`);
    rows.push("  Snapshot hợp lệ trước đó KHÔNG bị thay đổi.");
  }

  return rows.join("\n");
}

export function formatManifestStatus(
  manifest: DatasetManifest | null,
  recordCount: number,
): string {
  if (!manifest) {
    return `\nKhông có manifest. Dataset local có ${recordCount} bản ghi.\nChạy: npm run data:sync`;
  }
  const rows = [
    "\nTRẠNG THÁI DỮ LIỆU",
    line("Sản phẩm", manifest.product),
    line("Số kỳ", manifest.recordCount),
    line("Kỳ đầu tiên", manifest.firstDrawId ? `#${manifest.firstDrawId} (${manifest.firstDrawDate ?? "—"})` : "—"),
    line("Kỳ mới nhất", manifest.latestDrawId ? `#${manifest.latestDrawId} (${manifest.latestDrawDate ?? "—"})` : "—"),
    line("Nguồn chính", `${manifest.source.primary.id} (${manifest.source.primary.license})`),
    line("URL nguồn chính", manifest.source.primary.url),
    line("Nguồn phụ (đối chiếu)", manifest.source.secondary ? `${manifest.source.secondary.id} (${manifest.source.secondary.license})` : "—"),
    line("Lần thử gần nhất", manifest.lastAttemptedSync ?? "—"),
    line("Lần thành công gần nhất", manifest.lastSuccessfulSync ?? "—"),
    line("SHA-256", manifest.datasetSha256),
    line("Hợp lệ", manifest.validation.valid ? "có" : "KHÔNG"),
    line("Trùng / Xung đột / Loại", `${manifest.validation.duplicates} / ${manifest.validation.conflicts} / ${manifest.validation.rejected}`),
    line("Kỳ thiếu (continuity)", manifest.validation.missingIds.length ? manifest.validation.missingIds.join(", ") : "không có"),
    line("Đối chiếu chéo (cross-check)", `${manifest.crossCheck.status} (mẫu ${manifest.crossCheck.sampleSize}, lúc ${manifest.crossCheck.checkedAt ?? "—"})`),
  ];
  return rows.join("\n");
}
