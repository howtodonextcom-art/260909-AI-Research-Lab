/**
 * Experiment registry (§24) and artifact (§25).
 *
 * Pure logic only — no filesystem — mirroring the project's existing split
 * between `lib/data/sync.ts` (pure) and `lib/data/persistence.ts` (fs). See
 * `scripts/run-experiment.ts` for the Node-only JSONL store and the script
 * that actually registers and completes experiments against real data.
 */
import type { PhaseBacktestResult, StrategyId, TemporalBacktestReport } from "../analytics";
import { EXPECTED_MATCHES, PRIMARY_ENDPOINT } from "./statistics";
import { classifyEvidence, type ProtocolLock } from "./protocol";

export type ExperimentStatus = "REGISTERED" | "RUNNING" | "COMPLETED" | "FAILED" | "INVALIDATED";

export type ExperimentRecord = {
  experimentId: string;
  hypothesisId: string;
  familyId: string;
  strategyId: StrategyId;
  strategyVersion: string;
  parameters: Record<string, unknown>;
  seed: number;
  datasetHash: string;
  protocolVersion: string;
  protocolHash: string;
  registeredAt: string;
  status: ExperimentStatus;
};

export type RegisterExperimentInput = Omit<ExperimentRecord, "registeredAt" | "status">;

export function registerExperiment(input: RegisterExperimentInput, now: () => Date = () => new Date()): ExperimentRecord {
  return { ...input, registeredAt: now().toISOString(), status: "REGISTERED" };
}

export function transitionExperiment(record: ExperimentRecord, status: ExperimentStatus): ExperimentRecord {
  return { ...record, status };
}

export function parseExperimentRegistry(text: string): ExperimentRecord[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ExperimentRecord);
}

export function registryHasExperiment(records: ExperimentRecord[], experimentId: string): boolean {
  return records.some((record) => record.experimentId === experimentId);
}

export function countFamilyExperiments(records: ExperimentRecord[], familyId: string): number {
  return new Set(records.filter((record) => record.familyId === familyId).map((record) => record.experimentId)).size;
}

function hypothesisKey(record: ExperimentRecord): string | null {
  if (typeof record.hypothesisId === "string" && record.hypothesisId.length > 0) return record.hypothesisId;
  if (typeof record.strategyId === "string" && record.strategyId.length > 0) return record.strategyId;
  return null;
}

/** Distinct hypotheses in a family — the Holm denominator. Does not grow with new looks. */
export function countFamilyHypotheses(records: ExperimentRecord[], familyId: string): number {
  return new Set(
    records
      .filter((record) => record.familyId === familyId)
      .map(hypothesisKey)
      .filter((key): key is string => Boolean(key)),
  ).size;
}

/** Distinct dataset hashes in a family. `extraDatasetHash` counts the look about to be registered. */
export function countFamilyLooks(records: ExperimentRecord[], familyId: string, extraDatasetHash?: string): number {
  const hashes = records
    .filter((record) => record.familyId === familyId)
    .map((record) => record.datasetHash)
    .filter((hash): hash is string => typeof hash === "string" && hash.length > 0);
  if (extraDatasetHash && extraDatasetHash.length > 0) hashes.push(extraDatasetHash);
  return new Set(hashes).size;
}

/** Same family id `run-experiment.ts` writes; Holm must count this family, not `CURRENT_PROTOCOL.strategies`. */
export function primaryStrategyFamilyId(protocolVersion: string): string {
  return `protocol-${protocolVersion}-primary-strategies`;
}

/** Visible non-RANDOM protocol set size — only used when the registry family is empty. */
export const FALLBACK_HOLM_FAMILY_SIZE = 3;

export function resolveHolmFamilySize(
  records: ExperimentRecord[],
  familyId: string,
  fallback = FALLBACK_HOLM_FAMILY_SIZE,
): number {
  return countFamilyHypotheses(records, familyId) || fallback;
}

export type ExperimentFamilySummary = {
  familyId: string;
  /** Alias of `hypothesisCount` — Holm family size. Must not grow when only a look is added. */
  familySize: number;
  hypothesisCount: number;
  lookCount: number;
  fallbackFamilySize: number;
};

export function buildExperimentFamilySummary(
  records: ExperimentRecord[],
  familyId: string,
  fallback = FALLBACK_HOLM_FAMILY_SIZE,
): ExperimentFamilySummary {
  const hypothesisCount = resolveHolmFamilySize(records, familyId, fallback);
  return {
    familyId,
    familySize: hypothesisCount,
    hypothesisCount,
    lookCount: Math.max(1, countFamilyLooks(records, familyId)),
    fallbackFamilySize: fallback,
  };
}

export function parseExperimentFamilySummary(value: unknown): ExperimentFamilySummary | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.familyId !== "string" || raw.familyId.length === 0) return null;
  if (typeof raw.familySize !== "number" || !Number.isFinite(raw.familySize) || raw.familySize < 1) return null;
  if (typeof raw.hypothesisCount !== "number" || !Number.isFinite(raw.hypothesisCount) || raw.hypothesisCount < 1) {
    return null;
  }
  if (typeof raw.lookCount !== "number" || !Number.isFinite(raw.lookCount) || raw.lookCount < 1) return null;
  if (typeof raw.fallbackFamilySize !== "number" || !Number.isFinite(raw.fallbackFamilySize) || raw.fallbackFamilySize < 1) {
    return null;
  }
  const familySize = Math.floor(raw.familySize);
  const hypothesisCount = Math.floor(raw.hypothesisCount);
  const lookCount = Math.floor(raw.lookCount);
  if (familySize !== hypothesisCount) return null;
  return {
    familyId: raw.familyId,
    familySize,
    hypothesisCount,
    lookCount,
    fallbackFamilySize: Math.floor(raw.fallbackFamilySize),
  };
}

export type ExperimentArtifact = {
  experimentId: string;
  gitCommit: string | null;
  datasetSha256: string;
  protocolVersion: string;
  protocolHash: string;
  strategy: { id: string; version: string; parameters: Record<string, unknown> };
  seed: number;
  temporalSplit: {
    development: { startDate: string | null; endDate: string | null; trials: number };
    validation: { startDate: string | null; endDate: string | null; trials: number };
    test: { startDate: string | null; endDate: string | null; trials: number };
  };
  metrics: Record<string, number>;
  statistics: {
    effectSize: number | null;
    confidenceInterval: [number, number] | [];
    pValue: number | null;
    adjustedPValue: number | null;
  };
  controls: Record<string, unknown>;
  runtime: { startedAt: string; finishedAt: string; durationMs: number };
};

function phaseOf(report: TemporalBacktestReport, phaseId: "DEVELOPMENT" | "VALIDATION" | "TEST") {
  return report.phases.find((phase) => phase.id === phaseId) ?? null;
}

function resultOf(report: TemporalBacktestReport, phaseId: "DEVELOPMENT" | "VALIDATION" | "TEST", strategy: StrategyId): PhaseBacktestResult | null {
  return report.results.find((result) => result.phase === phaseId && result.strategy === strategy) ?? null;
}

/**
 * Builds one immutable artifact per strategy from an already-computed
 * `TemporalBacktestReport` (§15/§17's walk-forward + dev/val/test split),
 * so the statistics themselves are never recomputed or reinterpreted here —
 * only repackaged with provenance (git commit, dataset hash, protocol hash,
 * seed) attached. The TEST-phase numbers are used for `statistics`, since
 * that is the confirm/refute segment; VALIDATION is what `selectCandidate`
 * used to nominate the nomination in the first place.
 */
export function buildExperimentArtifactsFromReport(input: {
  report: TemporalBacktestReport;
  datasetSha256: string;
  gitCommit: string | null;
  seed: number;
  experimentIdFor: (strategy: StrategyId) => string;
  controls?: Record<string, unknown>;
  runtime: { startedAt: string; finishedAt: string };
  protocolHash: string;
  protocolLock?: ProtocolLock | null;
  latestDrawId?: string | null;
}): ExperimentArtifact[] {
  const { report, datasetSha256, gitCommit, seed, experimentIdFor, runtime, protocolHash } = input;
  const protocolLock = input.protocolLock ?? null;
  const latestDrawId = input.latestDrawId ?? null;
  const controls = {
    primaryEndpoint: PRIMARY_ENDPOINT.id,
    expectedMatches: EXPECTED_MATCHES,
    protocolLock,
    latestDrawEvidence: protocolLock && latestDrawId ? classifyEvidence(latestDrawId, protocolLock) : null,
    ...input.controls,
  };
  const strategies = [...new Set(report.results.map((r) => r.strategy))].filter((s) => s !== "RANDOM");

  return strategies.map((strategy) => {
    const dev = phaseOf(report, "DEVELOPMENT");
    const val = phaseOf(report, "VALIDATION");
    const test = phaseOf(report, "TEST");
    const testResult = resultOf(report, "TEST", strategy);
    const finishedAt = runtime.finishedAt;
    const startedAt = runtime.startedAt;

    return {
      experimentId: experimentIdFor(strategy),
      gitCommit,
      datasetSha256,
      protocolVersion: report.protocolVersion,
      protocolHash,
      strategy: { id: strategy, version: report.protocolVersion, parameters: { lookback: report.lookback } },
      seed,
      temporalSplit: {
        development: { startDate: dev?.startDate ?? null, endDate: dev?.endDate ?? null, trials: dev?.trials ?? 0 },
        validation: { startDate: val?.startDate ?? null, endDate: val?.endDate ?? null, trials: val?.trials ?? 0 },
        test: { startDate: test?.startDate ?? null, endDate: test?.endDate ?? null, trials: test?.trials ?? 0 },
      },
      metrics: {
        averageMatches: testResult?.averageMatches ?? Number.NaN,
        edgeVsRandom: testResult?.edgeVsRandom ?? Number.NaN,
        hit3Rate: testResult?.hit3Rate ?? Number.NaN,
        roi: testResult?.roi ?? Number.NaN,
      },
      statistics: {
        effectSize: testResult?.edgeVsRandom ?? null,
        confidenceInterval: testResult ? [testResult.ci95Low, testResult.ci95High] : [],
        pValue: testResult?.pValueVsRandom ?? null,
        adjustedPValue: testResult?.adjustedPValue ?? null,
      },
      controls,
      runtime: { startedAt, finishedAt, durationMs: Date.parse(finishedAt) - Date.parse(startedAt) },
    };
  });
}
