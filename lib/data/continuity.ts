/**
 * Continuity analysis (§9 of the research-core upgrade).
 *
 * Assumption, stated explicitly per the master prompt's instruction to encode
 * numbering edge cases rather than assume them silently: Mega 6/45 draw ids
 * are 5-digit zero-padded sequential integers starting at `#00001` with no
 * gaps. This is an *empirical* finding from the fully verified 2016-07-20 →
 * latest history (1561/1561 ids present, zero gaps at the time this was
 * written — see `reports/research-core-upgrade-final.md`), not a structural
 * guarantee from Vietlott. If a real gap is ever detected, `missingIds` is
 * reported rather than silently backfilled or ignored, and it must be
 * checked against the official source before being treated as a data error
 * versus a genuine historical anomaly.
 */
import type { DrawRecord } from "./types";

export type ContinuityReport = {
  firstId: string | null;
  latestId: string | null;
  recordCount: number;
  /** `null` for an empty dataset (also `continuous: false`); otherwise latestId - firstId + 1. */
  expectedCount: number | null;
  missingIds: string[];
  duplicateIds: string[];
  continuous: boolean;
};

export function analyzeContinuity(records: DrawRecord[]): ContinuityReport {
  if (records.length === 0) {
    return {
      firstId: null,
      latestId: null,
      recordCount: 0,
      expectedCount: null,
      missingIds: [],
      duplicateIds: [],
      continuous: false,
    };
  }

  const idCounts = new Map<string, number>();
  for (const record of records) idCounts.set(record.id, (idCounts.get(record.id) ?? 0) + 1);
  const duplicateIds = [...idCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id)
    .sort();

  const numericIds = [...new Set(records.map((record) => Number(record.id)))].sort((a, b) => a - b);
  const first = numericIds[0];
  const last = numericIds[numericIds.length - 1];
  const expectedCount = last - first + 1;

  const present = new Set(numericIds);
  const missingIds: string[] = [];
  for (let n = first; n <= last; n += 1) {
    if (!present.has(n)) missingIds.push(String(n).padStart(5, "0"));
  }

  return {
    firstId: String(first).padStart(5, "0"),
    latestId: String(last).padStart(5, "0"),
    recordCount: records.length,
    expectedCount,
    missingIds,
    duplicateIds,
    continuous: missingIds.length === 0 && duplicateIds.length === 0,
  };
}
