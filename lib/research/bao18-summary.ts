/**
 * Bao-18 reverse-proof walk-forward audit *summary* — client-fetchable,
 * read-only shape, mirroring `lib/research/prospective-summary.ts`'s role
 * for the prospective scorecard.
 *
 * This module deliberately does NOT import anything from
 * `lib/research/bao18-walkforward.ts` (owned by another workstream and
 * actively being restructured while this file is written). It only defines
 * the STABLE, UI-owned output shape that `scripts/export-bao18-summary.ts`
 * writes to `public/data/bao18-summary.json`, plus a fail-closed parser for
 * the browser to validate whatever it fetches — same fs/pure split as the
 * prospective summary, and the same "malformed or missing -> null, never a
 * thrown exception" contract as `parseProtocolLock` / `parseProspectiveSummary`.
 *
 * The raw audit report's field names may drift over time (it is produced by
 * a CLI owned elsewhere); `scripts/export-bao18-summary.ts` is the one place
 * that reads the raw report defensively and maps it into this stable shape,
 * so a rename upstream never reaches this parser or the UI directly.
 */

export const BAO18_RULE_IDS = ["RANDOM18", "HOT18", "COLD18", "OVERDUE18", "BALANCED18"] as const;
export type Bao18RuleId = (typeof BAO18_RULE_IDS)[number];

export type Bao18RuleRow = {
  rule: Bao18RuleId;
  /** True only for RANDOM18 — the empirical baseline, never itself given an edge verdict. */
  isBaseline: boolean;
  n: number;
  hit6Count: number;
  hit6Rate: number;
  expectedNullHits: number;
  rawPValue: number | null;
  adjustedPValue: number | null;
  meanIntersection: number;
  hit4PlusRate: number;
  hit5PlusRate: number;
  /** null for the RANDOM18 baseline row, which is not judged for "edge". */
  verdict: string | null;
  reasons: string[];
};

export type Bao18Summary = {
  schemaVersion: 1;
  generatedAt: string;
  /** Filename of the source report under `reports/`, for traceability only. */
  sourceReportFile: string;
  datasetRecordCount: number | null;
  firstDrawId: string | null;
  latestDrawId: string | null;
  math: {
    totalCombinations: number;
    bao18Tickets: number;
    ticketPrice: number;
    bao18CostPerDraw: number;
    nullJackpotProbability: number;
  } | null;
  protocolA: {
    evaluatedDraws: number;
    hit6Count: number;
    hit6Rate: number;
    /** Raw verdict string as found in the source report (e.g. "INVALID_PEEK_ONLY"). */
    sourceVerdict: string;
  } | null;
  protocolB: {
    evaluatedCount: number | null;
    rules: Bao18RuleRow[];
  };
  nullCalibration: {
    nullExpectedCount: number;
    nullProbZeroHits: number;
    nullPredictiveInterval95: [number, number] | null;
    underpowered: boolean;
  } | null;
  finalVerdict: string;
  scientificGrade: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseRuleRow(value: unknown): Bao18RuleRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!BAO18_RULE_IDS.includes(row.rule as Bao18RuleId)) return null;
  if (!isFiniteNumber(row.n) || !isFiniteNumber(row.hit6Count) || !isFiniteNumber(row.hit6Rate)) return null;
  if (!isFiniteNumber(row.expectedNullHits)) return null;
  if (row.rawPValue !== null && !isFiniteNumber(row.rawPValue)) return null;
  if (row.adjustedPValue !== null && !isFiniteNumber(row.adjustedPValue)) return null;
  if (!isFiniteNumber(row.meanIntersection) || !isFiniteNumber(row.hit4PlusRate) || !isFiniteNumber(row.hit5PlusRate)) {
    return null;
  }
  if (row.verdict !== null && typeof row.verdict !== "string") return null;
  if (!Array.isArray(row.reasons) || !row.reasons.every((reason) => typeof reason === "string")) return null;
  return {
    rule: row.rule as Bao18RuleId,
    isBaseline: Boolean(row.isBaseline),
    n: row.n,
    hit6Count: row.hit6Count,
    hit6Rate: row.hit6Rate,
    expectedNullHits: row.expectedNullHits,
    rawPValue: row.rawPValue as number | null,
    adjustedPValue: row.adjustedPValue as number | null,
    meanIntersection: row.meanIntersection,
    hit4PlusRate: row.hit4PlusRate,
    hit5PlusRate: row.hit5PlusRate,
    verdict: row.verdict as string | null,
    reasons: row.reasons as string[],
  };
}

/**
 * Fail-closed client-side parse: malformed or missing shape -> `null`
 * (render an honest "not available" state), never a thrown exception that
 * would blank the whole panel. Used by both the export script (as a
 * pre-publish sanity check on its own output) and `components/bao18-panel.tsx`
 * (to validate whatever it fetches from `public/data/bao18-summary.json`).
 */
export function parseBao18Summary(value: unknown): Bao18Summary | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.schemaVersion !== 1) return null;
  if (typeof raw.generatedAt !== "string") return null;
  if (typeof raw.sourceReportFile !== "string") return null;
  if (raw.datasetRecordCount !== null && !isFiniteNumber(raw.datasetRecordCount)) return null;
  if (raw.firstDrawId !== null && typeof raw.firstDrawId !== "string") return null;
  if (raw.latestDrawId !== null && typeof raw.latestDrawId !== "string") return null;

  let math: Bao18Summary["math"] = null;
  if (raw.math !== null) {
    if (typeof raw.math !== "object" || !raw.math) return null;
    const m = raw.math as Record<string, unknown>;
    if (
      !isFiniteNumber(m.totalCombinations) ||
      !isFiniteNumber(m.bao18Tickets) ||
      !isFiniteNumber(m.ticketPrice) ||
      !isFiniteNumber(m.bao18CostPerDraw) ||
      !isFiniteNumber(m.nullJackpotProbability)
    ) {
      return null;
    }
    math = {
      totalCombinations: m.totalCombinations,
      bao18Tickets: m.bao18Tickets,
      ticketPrice: m.ticketPrice,
      bao18CostPerDraw: m.bao18CostPerDraw,
      nullJackpotProbability: m.nullJackpotProbability,
    };
  }

  let protocolA: Bao18Summary["protocolA"] = null;
  if (raw.protocolA !== null) {
    if (typeof raw.protocolA !== "object" || !raw.protocolA) return null;
    const a = raw.protocolA as Record<string, unknown>;
    if (!isFiniteNumber(a.evaluatedDraws) || !isFiniteNumber(a.hit6Count) || !isFiniteNumber(a.hit6Rate)) return null;
    if (typeof a.sourceVerdict !== "string") return null;
    protocolA = {
      evaluatedDraws: a.evaluatedDraws,
      hit6Count: a.hit6Count,
      hit6Rate: a.hit6Rate,
      sourceVerdict: a.sourceVerdict,
    };
  }

  if (!raw.protocolB || typeof raw.protocolB !== "object") return null;
  const bRaw = raw.protocolB as Record<string, unknown>;
  if (bRaw.evaluatedCount !== null && !isFiniteNumber(bRaw.evaluatedCount)) return null;
  if (!Array.isArray(bRaw.rules)) return null;
  const rules: Bao18RuleRow[] = [];
  for (const item of bRaw.rules) {
    const parsed = parseRuleRow(item);
    if (!parsed) return null;
    rules.push(parsed);
  }

  let nullCalibration: Bao18Summary["nullCalibration"] = null;
  if (raw.nullCalibration !== null) {
    if (typeof raw.nullCalibration !== "object" || !raw.nullCalibration) return null;
    const n = raw.nullCalibration as Record<string, unknown>;
    if (!isFiniteNumber(n.nullExpectedCount) || !isFiniteNumber(n.nullProbZeroHits)) return null;
    if (typeof n.underpowered !== "boolean") return null;
    let interval: [number, number] | null = null;
    if (n.nullPredictiveInterval95 !== null) {
      if (
        !Array.isArray(n.nullPredictiveInterval95) ||
        n.nullPredictiveInterval95.length !== 2 ||
        !isFiniteNumber(n.nullPredictiveInterval95[0]) ||
        !isFiniteNumber(n.nullPredictiveInterval95[1])
      ) {
        return null;
      }
      interval = [n.nullPredictiveInterval95[0], n.nullPredictiveInterval95[1]];
    }
    nullCalibration = {
      nullExpectedCount: n.nullExpectedCount,
      nullProbZeroHits: n.nullProbZeroHits,
      nullPredictiveInterval95: interval,
      underpowered: n.underpowered,
    };
  }

  if (typeof raw.finalVerdict !== "string") return null;
  if (typeof raw.scientificGrade !== "string") return null;

  return {
    schemaVersion: 1,
    generatedAt: raw.generatedAt,
    sourceReportFile: raw.sourceReportFile,
    datasetRecordCount: (raw.datasetRecordCount as number | null) ?? null,
    firstDrawId: (raw.firstDrawId as string | null) ?? null,
    latestDrawId: (raw.latestDrawId as string | null) ?? null,
    math,
    protocolA,
    protocolB: {
      evaluatedCount: (bRaw.evaluatedCount as number | null) ?? null,
      rules,
    },
    nullCalibration,
    finalVerdict: raw.finalVerdict,
    scientificGrade: raw.scientificGrade,
  };
}
