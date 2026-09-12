/**
 * JSONL parsing and canonical serialization.
 *
 * Canonical form fixes key order (date, id, result, process_time) and sorts
 * records, so the same dataset always serializes to the same bytes and
 * therefore to the same SHA-256. This is what makes `data:sync` idempotent in
 * a way that is checkable rather than merely asserted.
 */
import { normalizeDraw, sortDraws } from "./schema";
import type { DrawRecord, RawDraw, ValidationIssue } from "./types";

export type ParseOutcome = {
  records: DrawRecord[];
  issues: ValidationIssue[];
  /** Rows that parsed as JSON but failed domain validation, plus malformed lines. */
  rejected: number;
  /** Lines seen, excluding blank ones. */
  fetched: number;
};

/** Compare on-disk JSONL after mapping CRLF to LF so Windows checkouts stay canonical. */
export function canonicalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

/** Splits JSONL into raw rows, reporting malformed lines instead of throwing. */
export function parseJsonlRows(text: string): { rows: RawDraw[]; issues: ValidationIssue[] } {
  const rows: RawDraw[] = [];
  const issues: ValidationIssue[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      rows.push(JSON.parse(trimmed) as RawDraw);
    } catch {
      issues.push({
        index: lineIndex,
        id: null,
        reason: `dòng ${lineIndex + 1} không phải JSON hợp lệ`,
      });
    }
  });

  return { rows, issues };
}

/** Parses and validates JSONL text into canonical, sorted records. */
export function parseDrawsJsonl(text: string): ParseOutcome {
  const { rows, issues } = parseJsonlRows(text);
  const records: DrawRecord[] = [];
  const allIssues = [...issues];

  rows.forEach((row, index) => {
    const outcome = normalizeDraw(row);
    if (outcome.ok) {
      records.push(outcome.record);
    } else {
      allIssues.push({ index, id: outcome.id, reason: outcome.reason });
    }
  });

  return {
    records: sortDraws(records),
    issues: allIssues,
    rejected: allIssues.length,
    fetched: rows.length + issues.length,
  };
}

/** Serializes records to canonical JSONL with a trailing newline. */
export function serializeDrawsJsonl(records: DrawRecord[]): string {
  return sortDraws(records)
    .map((record) => {
      const ordered: Record<string, unknown> = {
        date: record.date,
        id: record.id,
        result: record.result,
      };
      if (record.process_time) ordered.process_time = record.process_time;
      return JSON.stringify(ordered);
    })
    .join("\n") + "\n";
}
