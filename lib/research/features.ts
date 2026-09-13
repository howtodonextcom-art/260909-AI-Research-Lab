/**
 * Leak-safe feature store (§B1 remaining item 1 of the v2 forensics
 * blueprint: "Feature store with leak tests for any non-stub scorer").
 *
 * Pure logic only — no filesystem, mirroring the split used throughout this
 * codebase (see `experiments.ts` / `prospective.ts` headers).
 *
 * Design constraint (the whole point of this file): every function here
 * accepts only a `history: DrawRecord[]` that the CALLER must already have
 * restricted to `drawDate < target`. This module deliberately does NOT
 * accept "the full dataset plus a target date/index" and slice internally —
 * that shape would let a caller pass an unsliced dataset and rely on this
 * module to do the leak-safe cut correctly, which means a bug here could
 * silently leak the future into every feature computed. By only ever taking
 * an already-sliced `history`, a leak becomes a caller-side mistake (passing
 * the wrong array) that is trivial to spot in a code review — look at what
 * was passed in, not what this module does with it.
 *
 * This mirrors the exact pattern already used correctly throughout
 * `lib/analytics.ts`'s `buildWalkForwardSeries` and
 * `lib/research/negative-controls.ts`'s Control F: the leak-safe call is
 * always `draws.slice(index - lookback, index)` — never `draws[index]` or
 * later. `assertNoFutureLeakage` below is the tripwire that makes a
 * violation of that contract fail loudly instead of silently.
 */
import { calculateFrequency, type DrawRecord, type FrequencyRow } from "../analytics";

export type NumberFeature = {
  number: number;
  /** Raw occurrence count within `history`. */
  count: number;
  /** Expected occurrence count under a fair draw, same denominator as `calculateFrequency`. */
  expected: number;
  /** (count − expected) / expected * 100 — reused verbatim from `calculateFrequency`. */
  deltaPercent: number;
  /** Draws since this number last appeared, within `history` (0 = appeared in the most recent draw of `history`). */
  gap: number;
};

export type FeatureSet = {
  /** Number of draws the features were computed over — always `history.length`, never a larger dataset. */
  historySize: number;
  features: NumberFeature[];
};

/**
 * The leak tripwire (blueprint: "must fail if future draw included").
 * Throws — never returns a boolean, never silently drops the offending row —
 * the moment any draw in `history` has `date >= targetDate`. Call this at the
 * top of any new scorer that consumes `history` before using it for anything,
 * exactly the way a real leak-safe feature pipeline should validate its input
 * rather than trust the caller silently.
 */
export function assertNoFutureLeakage(history: DrawRecord[], targetDate: string): void {
  const offender = history.find((draw) => draw.date >= targetDate);
  if (offender) {
    throw new Error(
      `Rò rỉ dữ liệu tương lai: kỳ ${offender.id} (${offender.date}) nằm trong history nhưng >= targetDate ${targetDate}. ` +
        "History truyền vào phải được cắt nghiêm ngặt trước targetDate (drawDate < target) trước khi gọi hàm feature.",
    );
  }
}

/**
 * Descriptive per-number features computed strictly from the given
 * `history`. Reuses `calculateFrequency` (already leak-safe by construction:
 * it only ever iterates the array it is given) rather than reimplementing
 * frequency/gap counting.
 *
 * This function does NOT call `assertNoFutureLeakage` itself — it has no
 * `targetDate` to check against, by design (see file header: this module
 * never accepts a target/cutoff, only a pre-sliced history). Callers that DO
 * have a target date should call `assertNoFutureLeakage(history, targetDate)`
 * themselves before this, which is exactly what the must-fail test below
 * demonstrates.
 */
export function computeNumberFeatures(history: DrawRecord[]): FeatureSet {
  const rows: FrequencyRow[] = calculateFrequency(history);
  return {
    historySize: history.length,
    features: rows.map((row) => ({
      number: row.number,
      count: row.count,
      expected: row.expected,
      deltaPercent: row.deltaPercent,
      gap: row.gap,
    })),
  };
}
