/**
 * Prospective scorecard *summary* (blueprint G2), derived read-only from
 * `lib/research/prospective.ts`'s `ProspectiveEntry[]`.
 *
 * This module only imports the `ProspectiveEntry` *type* from
 * `prospective.ts` — it does not re-implement or alter the freeze/append
 * invariants owned there (protocol-hash binding, PROSPECTIVE-only freezing,
 * append-only scoring). It exists to answer a different, UI-shaped question:
 * "what should a read-only badge list look like", without teaching the
 * browser anything about the filesystem — same fs/pure split as
 * `experiments.ts` vs `run-experiment.ts`.
 *
 * `scripts/export-prospective-summary.ts` is the only place that reads the
 * real `reports/prospective-scorecard.jsonl` and writes the client-fetchable
 * `public/data/prospective-summary.json`, mirroring how `research-lock.ts`
 * already publishes `protocol-lock.json` under `public/data/`.
 */
import type { ProspectiveEntry } from "./prospective";

export type ProspectiveEntryStatus = "PENDING" | "SCORED";

export type ProspectiveSummaryEntry = {
  drawId: string;
  strategyId: ProspectiveEntry["strategyId"];
  frozenAt: string;
  status: ProspectiveEntryStatus;
  matches: number | null;
  tier: ProspectiveEntry["tier"];
};

export type ProspectiveSummary = {
  generatedAt: string;
  totalFrozen: number;
  pendingCount: number;
  scoredCount: number;
  entries: ProspectiveSummaryEntry[];
};

const STRATEGY_IDS: ProspectiveEntry["strategyId"][] = ["RANDOM", "HOT", "COLD", "BALANCED"];
const PRIZE_TIERS: NonNullable<ProspectiveEntry["tier"]>[] = ["JACKPOT", "FIRST", "SECOND", "THIRD", "NONE"];

function toSummaryEntry(entry: ProspectiveEntry): ProspectiveSummaryEntry {
  return {
    drawId: entry.drawId,
    strategyId: entry.strategyId,
    frozenAt: entry.frozenAt,
    status: entry.result === null ? "PENDING" : "SCORED",
    matches: entry.matches,
    tier: entry.tier,
  };
}

/**
 * Builds a summary from real frozen entries. An empty `entries` array is the
 * normal, expected state today (no draw at or after `prospectiveStartDrawId`
 * has happened yet) — this is not special-cased as an error.
 */
export function buildProspectiveSummary(
  entries: ProspectiveEntry[],
  now: () => Date = () => new Date(),
): ProspectiveSummary {
  const summaryEntries = entries
    .map(toSummaryEntry)
    // Newest freeze first, most useful for a UI reading top-to-bottom.
    .sort((a, b) => (a.frozenAt < b.frozenAt ? 1 : a.frozenAt > b.frozenAt ? -1 : 0));

  return {
    generatedAt: now().toISOString(),
    totalFrozen: summaryEntries.length,
    pendingCount: summaryEntries.filter((entry) => entry.status === "PENDING").length,
    scoredCount: summaryEntries.filter((entry) => entry.status === "SCORED").length,
    entries: summaryEntries,
  };
}

/**
 * Fail-closed client-side parse of the fetched JSON, mirroring
 * `parseProtocolLock` / `parseExperimentFamilySummary`'s shape: malformed or
 * missing shape -> `null` (render an honest "not available" state), never a
 * thrown exception that would blank the whole panel.
 */
export function parseProspectiveSummary(value: unknown): ProspectiveSummary | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.generatedAt !== "string") return null;
  if (typeof raw.totalFrozen !== "number" || !Number.isFinite(raw.totalFrozen) || raw.totalFrozen < 0) return null;
  if (typeof raw.pendingCount !== "number" || !Number.isFinite(raw.pendingCount) || raw.pendingCount < 0) return null;
  if (typeof raw.scoredCount !== "number" || !Number.isFinite(raw.scoredCount) || raw.scoredCount < 0) return null;
  if (!Array.isArray(raw.entries)) return null;

  const entries: ProspectiveSummaryEntry[] = [];
  for (const item of raw.entries) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (typeof row.drawId !== "string" || row.drawId.length === 0) return null;
    if (!STRATEGY_IDS.includes(row.strategyId as ProspectiveEntry["strategyId"])) return null;
    if (typeof row.frozenAt !== "string") return null;
    if (row.status !== "PENDING" && row.status !== "SCORED") return null;
    if (row.matches !== null && (typeof row.matches !== "number" || !Number.isInteger(row.matches))) return null;
    if (row.tier !== null && !PRIZE_TIERS.includes(row.tier as NonNullable<ProspectiveEntry["tier"]>)) return null;
    entries.push({
      drawId: row.drawId,
      strategyId: row.strategyId as ProspectiveEntry["strategyId"],
      frozenAt: row.frozenAt,
      status: row.status,
      matches: row.matches as number | null,
      tier: row.tier as ProspectiveSummaryEntry["tier"],
    });
  }

  return {
    generatedAt: raw.generatedAt,
    totalFrozen: Math.floor(raw.totalFrozen),
    pendingCount: Math.floor(raw.pendingCount),
    scoredCount: Math.floor(raw.scoredCount),
    entries,
  };
}
