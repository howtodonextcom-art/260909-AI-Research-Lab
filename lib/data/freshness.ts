/**
 * Dataset freshness classifier for UI (§17–20).
 *
 * Labels are deliberately coarse and never imply the bundled snapshot is
 * "live Vietlott uptime". They answer one question only: how old is
 * `manifest.lastSuccessfulSync` relative to now?
 *
 * Thresholds (documented, not marketing):
 * - Fresh: within `DATA_REFRESH_TTL_MS` (12h) — matches client auto-refresh policy.
 * - Delayed: older than Fresh but ≤ 7 days — a missed sync across a few draws.
 * - Stale: older than 7 days — must not be presented as current.
 * - Unknown: missing / unparseable `lastSuccessfulSync`.
 */

import { DATA_REFRESH_TTL_MS } from "./refresh";

export type FreshnessLabel = "Fresh" | "Delayed" | "Stale" | "Unknown";

/** 7 calendar days — Mega 6/45 draws ~3×/week; a week without sync is visibly stale. */
export const FRESHNESS_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export type FreshnessAssessment = {
  label: FreshnessLabel;
  /** Vietnamese short badge text shown in Data Status. */
  badgeVi: string;
  /** One-line explanation; always present so UI never silently treats stale as current. */
  detailVi: string;
  ageMs: number | null;
};

const BADGE_VI: Record<FreshnessLabel, string> = {
  Fresh: "Fresh",
  Delayed: "Delayed",
  Stale: "Stale",
  Unknown: "Unknown",
};

export function assessFreshness(
  lastSuccessfulSync: string | null | undefined,
  nowMs: number = Date.now(),
  options: { freshWithinMs?: number; staleAfterMs?: number } = {},
): FreshnessAssessment {
  const freshWithinMs = options.freshWithinMs ?? DATA_REFRESH_TTL_MS;
  const staleAfterMs = options.staleAfterMs ?? FRESHNESS_STALE_AFTER_MS;

  if (!lastSuccessfulSync) {
    return {
      label: "Unknown",
      badgeVi: BADGE_VI.Unknown,
      detailVi: "Chưa có mốc lastSuccessfulSync — không khẳng định dữ liệu đang cập nhật.",
      ageMs: null,
    };
  }

  const syncedAt = Date.parse(lastSuccessfulSync);
  if (!Number.isFinite(syncedAt)) {
    return {
      label: "Unknown",
      badgeVi: BADGE_VI.Unknown,
      detailVi: "lastSuccessfulSync không parse được — độ tươi không xác định.",
      ageMs: null,
    };
  }

  const ageMs = Math.max(0, nowMs - syncedAt);
  if (ageMs <= freshWithinMs) {
    return {
      label: "Fresh",
      badgeVi: BADGE_VI.Fresh,
      detailVi: `Đồng bộ thành công trong ${Math.round(freshWithinMs / 3_600_000)} giờ gần nhất.`,
      ageMs,
    };
  }
  if (ageMs <= staleAfterMs) {
    return {
      label: "Delayed",
      badgeVi: BADGE_VI.Delayed,
      detailVi: "Đã quá cửa sổ Fresh (12 giờ) nhưng chưa tới ngưỡng Stale (7 ngày).",
      ageMs,
    };
  }
  return {
    label: "Stale",
    badgeVi: BADGE_VI.Stale,
    detailVi: "Đồng bộ thành công cũ hơn 7 ngày — không được đọc như dữ liệu hiện hành.",
    ageMs,
  };
}
