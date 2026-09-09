/**
 * Merge policy.
 *
 * The one rule that matters: an existing record is never overwritten. If the
 * source returns a different result for an id we already hold, that is a
 * conflict to be reported to a human, not a value to silently adopt. Silent
 * overwrite is how a bad upstream day quietly rewrites history.
 */
import { compareDraws, recordsConflict, sortDraws } from "./schema";
import type { ConflictRecord, DrawRecord, MergeResult, ValidationIssue } from "./types";

/**
 * Merges incoming records into an existing snapshot.
 * Existing records always win; conflicts are collected, not applied.
 */
export function mergeDraws(existing: DrawRecord[], incoming: DrawRecord[]): MergeResult {
  const byId = new Map<string, DrawRecord>();
  for (const record of existing) byId.set(record.id, record);

  const seenInBatch = new Set<string>();
  const conflicts: ConflictRecord[] = [];
  let added = 0;
  let unchanged = 0;
  let duplicates = 0;

  for (const record of incoming) {
    const current = byId.get(record.id);

    if (!current) {
      byId.set(record.id, record);
      seenInBatch.add(record.id);
      added += 1;
      continue;
    }

    if (recordsConflict(current, record)) {
      conflicts.push({ id: record.id, existing: current, incoming: record });
      continue;
    }

    if (seenInBatch.has(record.id)) duplicates += 1;
    else unchanged += 1;
    seenInBatch.add(record.id);
  }

  return {
    records: sortDraws([...byId.values()]),
    added,
    unchanged,
    duplicates,
    conflicts,
  };
}

export type DatasetValidation = {
  valid: boolean;
  issues: ValidationIssue[];
};

/**
 * Whole-dataset invariants that per-record validation cannot see:
 * unique ids, canonical ordering, and no backwards jump in coverage.
 */
export function validateDataset(
  records: DrawRecord[],
  previousLatestDate?: string | null,
): DatasetValidation {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, number>();

  records.forEach((record, index) => {
    const firstIndex = seen.get(record.id);
    if (firstIndex !== undefined) {
      issues.push({
        index,
        id: record.id,
        reason: `mã kỳ ${record.id} xuất hiện nhiều lần (lần đầu ở vị trí ${firstIndex})`,
      });
      return;
    }
    seen.set(record.id, index);
  });

  for (let index = 1; index < records.length; index += 1) {
    if (compareDraws(records[index - 1], records[index]) > 0) {
      issues.push({
        index,
        id: records[index].id,
        reason: `dữ liệu không được sắp xếp canonical tại vị trí ${index}`,
      });
      break;
    }
  }

  const latest = records.length ? records[records.length - 1].date : null;
  if (previousLatestDate && latest && latest < previousLatestDate) {
    issues.push({
      index: null,
      id: null,
      reason: `kỳ mới nhất (${latest}) cũ hơn snapshot trước đó (${previousLatestDate}) — từ chối để tránh mất dữ liệu`,
    });
  }

  return { valid: issues.length === 0, issues };
}
