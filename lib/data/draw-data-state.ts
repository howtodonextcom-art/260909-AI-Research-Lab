/**
 * Pure refresh-state transitions for the research data hook.
 * Kept free of React so B-05 can be unit-tested without a DOM harness.
 */
import type { SyncSummary } from "./types";

export type RefreshUiState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "updated"; added: number; total: number; latestDate: string | null }
  | { kind: "up-to-date" }
  | { kind: "conflict"; count: number; message: string }
  | { kind: "error"; message: string };

export const REFRESH_CONFLICT_MESSAGE =
  "Nguồn trả về kết quả khác với dữ liệu đang lưu. Dữ liệu cũ được giữ nguyên.";

export const REFRESH_ERROR_MESSAGE =
  "Không thể cập nhật lúc này. Ứng dụng đang sử dụng bộ dữ liệu hợp lệ gần nhất.";

/** Maps a finished sync summary to the UI refresh badge state. */
export function refreshStateFromSummary(summary: SyncSummary): RefreshUiState {
  if (summary.status === "not-modified" || (summary.status === "ok" && summary.added === 0)) {
    return { kind: "up-to-date" };
  }
  if (summary.status === "ok") {
    return {
      kind: "updated",
      added: summary.added,
      total: summary.totalAfterMerge,
      latestDate: summary.latestDrawDate,
    };
  }
  if (summary.conflicts > 0) {
    return { kind: "conflict", count: summary.conflicts, message: REFRESH_CONFLICT_MESSAGE };
  }
  return { kind: "error", message: REFRESH_ERROR_MESSAGE };
}
