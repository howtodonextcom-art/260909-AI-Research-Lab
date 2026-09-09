/**
 * Normalization and validation for raw source rows.
 *
 * Every rejection carries a human-readable reason; nothing is ever dropped
 * silently. Callers are expected to surface `NormalizeFailure.reason` in the
 * sync report so a schema change upstream becomes visible instead of quietly
 * shrinking the dataset.
 */
import type { DrawRecord, RawDraw } from "./types";

export const DRAW_SIZE = 6;
export const MIN_NUMBER = 1;
export const MAX_NUMBER = 45;

export type NormalizeSuccess = { ok: true; record: DrawRecord };
export type NormalizeFailure = { ok: false; reason: string; id: string | null };
export type NormalizeOutcome = NormalizeSuccess | NormalizeFailure;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True only for dates that exist on the calendar (rejects 2026-02-30). */
export function isRealCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isValidResult(result: unknown): result is number[] {
  if (!Array.isArray(result) || result.length !== DRAW_SIZE) return false;
  if (!result.every((n) => typeof n === "number" && Number.isInteger(n) && n >= MIN_NUMBER && n <= MAX_NUMBER)) {
    return false;
  }
  return new Set(result as number[]).size === DRAW_SIZE;
}

function describeResult(result: unknown): string {
  if (!Array.isArray(result)) return `result không phải mảng (${typeof result})`;
  if (result.length !== DRAW_SIZE) return `result có ${result.length} phần tử, cần đúng ${DRAW_SIZE}`;
  const bad = result.find((n) => typeof n !== "number" || !Number.isInteger(n));
  if (bad !== undefined) return `result chứa giá trị không phải số nguyên: ${JSON.stringify(bad)}`;
  const outOfRange = (result as number[]).find((n) => n < MIN_NUMBER || n > MAX_NUMBER);
  if (outOfRange !== undefined) return `result chứa số ngoài khoảng ${MIN_NUMBER}–${MAX_NUMBER}: ${outOfRange}`;
  if (new Set(result as number[]).size !== DRAW_SIZE) return "result chứa số trùng nhau";
  return "result không hợp lệ";
}

/**
 * Turns one untrusted row into a canonical record.
 * Canonical form sorts `result` ascending so byte-level comparison is stable.
 */
export function normalizeDraw(raw: RawDraw): NormalizeOutcome {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: `bản ghi không phải object (${Array.isArray(raw) ? "array" : typeof raw})`, id: null };
  }

  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : null;
  if (!id) {
    return { ok: false, reason: "thiếu id hoặc id rỗng", id: null };
  }

  const date = typeof row.date === "string" ? row.date.trim() : "";
  if (!DATE_PATTERN.test(date)) {
    return { ok: false, reason: `date không đúng định dạng YYYY-MM-DD: ${JSON.stringify(row.date)}`, id };
  }
  if (!isRealCalendarDate(date)) {
    return { ok: false, reason: `date không tồn tại trên lịch: ${date}`, id };
  }

  if (!isValidResult(row.result)) {
    return { ok: false, reason: describeResult(row.result), id };
  }

  const record: DrawRecord = {
    date,
    id,
    result: [...(row.result as number[])].sort((a, b) => a - b),
  };
  if (typeof row.process_time === "string" && row.process_time.trim()) {
    record.process_time = row.process_time;
  }
  return { ok: true, record };
}

/** Canonical ordering: by draw date, then by id. Deterministic for hashing. */
export function compareDraws(a: DrawRecord, b: DrawRecord): number {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function sortDraws(records: DrawRecord[]): DrawRecord[] {
  return [...records].sort(compareDraws);
}

/** Two records for the same id disagree if either the date or any number differs. */
export function recordsConflict(a: DrawRecord, b: DrawRecord): boolean {
  if (a.date !== b.date) return true;
  return a.result.some((value, index) => value !== b.result[index]);
}
