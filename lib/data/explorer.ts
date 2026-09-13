/**
 * Data Explorer (blueprint G1): pure client-side search over the dataset the
 * app already has loaded in memory (`useDrawData()` → `DrawRecord[]`). There
 * is no server-side search endpoint — the whole dataset already lives in the
 * browser (see `hooks/use-draw-data.ts`), so a "search API" would just be a
 * network round-trip to filter an array the client already owns.
 *
 * Kept pure and framework-free so it is testable without React, matching the
 * project's existing split between pure `lib/` logic and thin UI components
 * (see `lib/research/bao.ts` / `components/cost-frontier.tsx`).
 */
import type { DrawRecord } from "./types";

export type DrawExplorerQuery = {
  /** Exact or prefix match against `DrawRecord.id` (e.g. "01561" or "015"). */
  idQuery?: string;
  /** Inclusive lower bound, "YYYY-MM-DD". */
  fromDate?: string;
  /** Inclusive upper bound, "YYYY-MM-DD". */
  toDate?: string;
};

/**
 * Render cap: the dataset already has 1500+ rows, and a broad or empty query
 * must never dump the whole history into the DOM at once. `totalMatches`
 * still reports the true count so the UI can say "showing 50 of N".
 */
export const DRAW_EXPLORER_RESULT_CAP = 50;

export type DrawExplorerResult = {
  /** Matches, capped to `DRAW_EXPLORER_RESULT_CAP`, most recent first. */
  matches: DrawRecord[];
  /** True count of matching records before the cap was applied. */
  totalMatches: number;
};

const EMPTY_RESULT: DrawExplorerResult = { matches: [], totalMatches: 0 };

/**
 * Filters `records` by an optional id prefix and/or an optional inclusive
 * date range. Dates are plain "YYYY-MM-DD" strings, so lexicographic
 * comparison is a correct range comparison (same trick `lib/analytics.ts`
 * already relies on for window filtering).
 *
 * Design choice, documented here since it is not obvious from the type: an
 * entirely empty query (no id, no from, no to) returns nothing rather than
 * the full 1500+ row history. Filtering the array to figure that out is
 * cheap; the whole point of the cap is to keep a careless/empty query from
 * ever reaching the DOM.
 */
export function filterDraws(records: DrawRecord[], query: DrawExplorerQuery): DrawExplorerResult {
  const idQuery = query.idQuery?.trim() ?? "";
  const fromDate = query.fromDate?.trim() ?? "";
  const toDate = query.toDate?.trim() ?? "";

  if (!idQuery && !fromDate && !toDate) return EMPTY_RESULT;

  const filtered = records.filter((record) => {
    if (idQuery && !record.id.startsWith(idQuery)) return false;
    if (fromDate && record.date < fromDate) return false;
    if (toDate && record.date > toDate) return false;
    return true;
  });

  // Most-recent-first reads better for a search result list than dataset
  // order (oldest-first); `records` itself is left untouched.
  const ordered = filtered.slice().reverse();

  return {
    matches: ordered.slice(0, DRAW_EXPLORER_RESULT_CAP),
    totalMatches: filtered.length,
  };
}
