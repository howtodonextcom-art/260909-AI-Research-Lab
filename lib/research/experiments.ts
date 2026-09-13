/**
 * Experiment registry (§24) and artifact (§25).
 *
 * Pure logic only — no filesystem — mirroring the project's existing split
 * between `lib/data/sync.ts` (pure) and `lib/data/persistence.ts` (fs). See
 * `scripts/run-experiment.ts` for the Node-only JSONL store and the script
 * that actually registers and completes experiments against real data.
 */
import { hacBandwidth, type PhaseBacktestResult, type StrategyId, type TemporalBacktestReport } from "../analytics";
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
  /**
   * Pre-registration fields (groundwork for future pre-registered
   * experiments; see §31/§35). All optional and additive-only: existing
   * lines in `reports/experiments/registry.jsonl` predate these fields and
   * must keep parsing unchanged. When present, each is validated for shape
   * by `parseExperimentRegistry` — see `describeExperimentRecordProblem`.
   */
  budgetTickets?: number;
  budgetVnd?: number;
  predictionKind?: "single_ticket" | "portfolio";
  predictions?: string[];
  preRegistered?: boolean;
  dataCutoffDrawId?: string;
  dataCutoffDate?: string;
  rankingScoreVersion?: string | null;
};

export type RegisterExperimentInput = Omit<ExperimentRecord, "registeredAt" | "status">;

export function registerExperiment(input: RegisterExperimentInput, now: () => Date = () => new Date()): ExperimentRecord {
  return { ...input, registeredAt: now().toISOString(), status: "REGISTERED" };
}

export function transitionExperiment(record: ExperimentRecord, status: ExperimentStatus): ExperimentRecord {
  return { ...record, status };
}

const EXPERIMENT_STATUSES: ExperimentStatus[] = ["REGISTERED", "RUNNING", "COMPLETED", "FAILED", "INVALIDATED"];
const STRATEGY_IDS: StrategyId[] = ["RANDOM", "HOT", "COLD", "BALANCED"];

/**
 * Required core fields are always validated. Optional pre-registration fields
 * follow fail-closed shape checks: `undefined` is fine (older lines), but a
 * present field with the wrong type is never silently accepted.
 */
function describeExperimentRecordProblem(record: Record<string, unknown>): string | null {
  if (typeof record.experimentId !== "string" || record.experimentId.length === 0) {
    return "thiếu experimentId hoặc experimentId rỗng";
  }
  if (typeof record.hypothesisId !== "string" || record.hypothesisId.length === 0) {
    return "thiếu hypothesisId hoặc hypothesisId rỗng";
  }
  if (typeof record.familyId !== "string" || record.familyId.length === 0) {
    return "thiếu familyId hoặc familyId rỗng";
  }
  if (!STRATEGY_IDS.includes(record.strategyId as StrategyId)) {
    return `strategyId không hợp lệ: ${JSON.stringify(record.strategyId)}`;
  }
  if (typeof record.strategyVersion !== "string" || record.strategyVersion.length === 0) {
    return "thiếu strategyVersion";
  }
  if (record.parameters === null || typeof record.parameters !== "object" || Array.isArray(record.parameters)) {
    return "parameters phải là object";
  }
  if (typeof record.seed !== "number" || !Number.isFinite(record.seed)) {
    return `seed phải là số hữu hạn, nhận: ${JSON.stringify(record.seed)}`;
  }
  if (typeof record.datasetHash !== "string" || record.datasetHash.length === 0) {
    return "thiếu datasetHash";
  }
  if (typeof record.protocolVersion !== "string" || record.protocolVersion.length === 0) {
    return "thiếu protocolVersion";
  }
  if (typeof record.protocolHash !== "string" || record.protocolHash.length === 0) {
    return "thiếu protocolHash";
  }
  if (typeof record.registeredAt !== "string" || Number.isNaN(Date.parse(record.registeredAt))) {
    return `registeredAt không phải ISO timestamp hợp lệ: ${JSON.stringify(record.registeredAt)}`;
  }
  if (!EXPERIMENT_STATUSES.includes(record.status as ExperimentStatus)) {
    return `status không hợp lệ: ${JSON.stringify(record.status)}`;
  }

  if (record.budgetTickets !== undefined && (typeof record.budgetTickets !== "number" || !Number.isFinite(record.budgetTickets))) {
    return `budgetTickets phải là số hữu hạn, nhận: ${JSON.stringify(record.budgetTickets)}`;
  }
  if (record.budgetVnd !== undefined && (typeof record.budgetVnd !== "number" || !Number.isFinite(record.budgetVnd))) {
    return `budgetVnd phải là số hữu hạn, nhận: ${JSON.stringify(record.budgetVnd)}`;
  }
  if (
    record.predictionKind !== undefined &&
    record.predictionKind !== "single_ticket" &&
    record.predictionKind !== "portfolio"
  ) {
    return `predictionKind phải là "single_ticket" hoặc "portfolio", nhận: ${JSON.stringify(record.predictionKind)}`;
  }
  if (
    record.predictions !== undefined &&
    (!Array.isArray(record.predictions) || !record.predictions.every((p) => typeof p === "string"))
  ) {
    return `predictions phải là mảng chuỗi, nhận: ${JSON.stringify(record.predictions)}`;
  }
  if (record.preRegistered !== undefined && typeof record.preRegistered !== "boolean") {
    return `preRegistered phải là boolean, nhận: ${JSON.stringify(record.preRegistered)}`;
  }
  if (record.dataCutoffDrawId !== undefined && typeof record.dataCutoffDrawId !== "string") {
    return `dataCutoffDrawId phải là chuỗi, nhận: ${JSON.stringify(record.dataCutoffDrawId)}`;
  }
  if (record.dataCutoffDate !== undefined && typeof record.dataCutoffDate !== "string") {
    return `dataCutoffDate phải là chuỗi, nhận: ${JSON.stringify(record.dataCutoffDate)}`;
  }
  if (
    record.rankingScoreVersion !== undefined &&
    record.rankingScoreVersion !== null &&
    typeof record.rankingScoreVersion !== "string"
  ) {
    return `rankingScoreVersion phải là chuỗi hoặc null, nhận: ${JSON.stringify(record.rankingScoreVersion)}`;
  }
  return null;
}

export function parseExperimentRegistry(text: string): ExperimentRecord[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      const problem = describeExperimentRecordProblem(parsed);
      if (problem) {
        throw new Error(`Registry hỏng ở dòng ${index + 1}: ${problem}`);
      }
      return parsed as ExperimentRecord;
    });
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

/**
 * Experiment id construction for NEW registrations (Round 5 / GAP-02).
 *
 * Round 4's provenance audit (`reports/26-09-13-16-40-research-provenance-integrity.md`,
 * "Protocol identity") found that `CURRENT_PROTOCOL`'s content had changed at
 * some point WITHOUT its `version` string being bumped — two genuinely
 * different protocols shared one version label, indistinguishable from that
 * label alone. The OLD experimentId scheme
 * (`${familyId}-${strategy.toLowerCase()}-${datasetHash.slice(0, 8)}`, where
 * `familyId` embeds only `protocolVersion`) never encoded the actual
 * `protocolHash` — so two experiments registered under the same version
 * label but genuinely different protocol content could collide into the
 * same id with no way to detect it from the id alone. Concretely, this is
 * why the 3 real rows `protocol-2026-09-10.1-primary-strategies-{hot,cold,balanced}-8e26f348`
 * needed a documented `reports/provenance-exceptions.json` entry instead of
 * a clean pass.
 *
 * Fix: a NEW experimentId also encodes an 8-char `protocolHash` prefix, so
 * two genuinely different protocols (even under an unbumped version string)
 * can never produce the same id.
 *
 * `familyId` itself (see `primaryStrategyFamilyId` above) is DELIBERATELY
 * UNCHANGED by this fix — it governs Holm family membership (which
 * hypotheses share one multiple-testing correction), a purely statistical
 * grouping concept unrelated to per-experiment identity collision. Folding
 * `protocolHash` into `familyId` too would silently change historical Holm
 * family sizes/look counts every time the protocol hash changes under a
 * stable version string, which `resolveHolmFamilySize`/`countFamilyLooks`
 * are explicitly designed to keep stable except when a genuinely new
 * hypothesis or look is added (see their own doc comments). The
 * experimentId is the right — and sufficient — place to bind identity: it
 * is the actual registry/artifact-file key `verify-provenance.ts` and
 * `checkArtifactFileIntegrity` reason about.
 *
 * The 3 pre-existing registry rows above predate this scheme and are NEVER
 * rewritten (append-only) — `parseExperimentRegistry` has no opinion on
 * which scheme produced an id, so old- and new-scheme ids parse identically.
 * Only `scripts/run-experiment.ts`'s construction of NEW ids changes.
 */
export function buildExperimentId(familyId: string, strategy: string, datasetHash: string, protocolHash: string): string {
  return `${familyId}-${strategy.toLowerCase()}-${datasetHash.slice(0, 8)}-${protocolHash.slice(0, 8)}`;
}

/**
 * The PRE-GAP-02 id scheme (no protocolHash suffix) — kept only so
 * `scripts/run-experiment.ts` can detect "this exact strategy+dataset
 * combination already has an old-scheme registry entry" and skip
 * re-registering it, rather than double-registering under the new scheme.
 *
 * Why this is needed: the live registry's 3 real rows
 * (`protocol-2026-09-10.1-primary-strategies-{hot,cold,balanced}-8e26f348`)
 * were registered when `CURRENT_PROTOCOL`'s live hash was
 * `089e16b90b1d…`. Since then (per the Round 4 provenance audit), the
 * protocol's actual content drifted to hash `9b864bec07e3…` WITHOUT the
 * version string changing — so today, `buildExperimentId` for the same
 * strategy+dataset now computes a DIFFERENT id (because it now includes the
 * CURRENT hash `9b864bec…`, not the original `089e16b90b1d…` the old row
 * was registered under). Naively checking only the new-scheme id would
 * therefore treat these 3 already-registered strategies as brand new and
 * register duplicate rows purely because the id CONSTRUCTION formula
 * changed — not because anything new is actually being measured that
 * wasn't already covered by the original registration + its documented
 * `reports/provenance-exceptions.json` entry.
 *
 * This function exists ONLY for that one-time backward-compatibility check.
 * It is never used to construct a NEW id — only to recognize an OLD one.
 */
export function buildLegacyExperimentId(familyId: string, strategy: string, datasetHash: string): string {
  return `${familyId}-${strategy.toLowerCase()}-${datasetHash.slice(0, 8)}`;
}

/**
 * Fail-closed guard for the ambiguous-reuse scenario `buildExperimentId` is
 * designed to make unreachable: a NEW registration whose computed
 * experimentId matches an EXISTING registry entry, but the two disagree on
 * `protocolHash`. Under the OLD scheme this was silently possible (see the
 * comment above `buildExperimentId`); under the new scheme it should be
 * structurally impossible, since `protocolHash` is now literally part of the
 * id — but "structurally hard to reach" is not the same as "explicitly
 * guarded," so `scripts/run-experiment.ts` calls this before every
 * registration and hard-fails (no registry write, no artifact write) on a
 * non-null result.
 *
 * Returns `null` for the ordinary, expected cases: no existing entry with
 * this id (a genuinely new registration), or an existing entry that agrees
 * on `protocolHash` (an idempotent re-run — `registryHasExperiment` already
 * causes the caller to skip re-registering that one). Returns the
 * conflicting existing record only when the same id was claimed under a
 * different `protocolHash`.
 */
export function findExperimentIdProtocolHashConflict(
  records: ExperimentRecord[],
  experimentId: string,
  protocolHash: string,
): ExperimentRecord | null {
  const existing = records.find((record) => record.experimentId === experimentId);
  if (!existing) return null;
  return existing.protocolHash !== protocolHash ? existing : null;
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
    /** How the SE behind pValue/CI was computed — "newey-west-hac" since the audit-forensics HAC fix. */
    varianceMethod: string;
    /** hacBandwidth(n, lookback) for the TEST-phase trial count actually used — the lag the HAC estimator ran with. */
    hacLag: number | null;
  };
  controls: Record<string, unknown>;
  runtime: { startedAt: string; finishedAt: string; durationMs: number };
};

/**
 * Fail-closed shape validation for a parsed `reports/experiments/*.json`
 * artifact file (§Provenance audit, Round 4) — mirrors
 * `describeExperimentRecordProblem`'s registry-line validation above, so
 * `scripts/verify-provenance.ts` never trusts a field on an artifact whose
 * basic shape it hasn't checked. Deliberately not exhaustive on every nested
 * field (temporalSplit/statistics/controls/runtime internals) — only what
 * `checkRegistryArtifactConsistency` (lib/research/provenance-registry.ts)
 * and the collision/filename checks actually read.
 */
function describeExperimentArtifactProblem(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return `artifact không phải object (${Array.isArray(value) ? "array" : typeof value})`;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.experimentId !== "string" || row.experimentId.length === 0) {
    return "thiếu experimentId hoặc experimentId rỗng";
  }
  if (row.gitCommit !== null && typeof row.gitCommit !== "string") {
    return `gitCommit phải là chuỗi hoặc null: ${JSON.stringify(row.gitCommit)}`;
  }
  if (typeof row.datasetSha256 !== "string" || row.datasetSha256.length === 0) {
    return "thiếu datasetSha256";
  }
  if (typeof row.protocolVersion !== "string" || row.protocolVersion.length === 0) {
    return "thiếu protocolVersion";
  }
  if (typeof row.protocolHash !== "string" || row.protocolHash.length === 0) {
    return "thiếu protocolHash";
  }
  if (!row.strategy || typeof row.strategy !== "object" || Array.isArray(row.strategy)) {
    return "thiếu strategy";
  }
  const strategy = row.strategy as Record<string, unknown>;
  if (typeof strategy.id !== "string" || strategy.id.length === 0) return "thiếu strategy.id";
  if (typeof row.seed !== "number" || !Number.isFinite(row.seed)) {
    return `seed phải là số hữu hạn: ${JSON.stringify(row.seed)}`;
  }
  if (!row.temporalSplit || typeof row.temporalSplit !== "object") return "thiếu temporalSplit";
  if (!row.metrics || typeof row.metrics !== "object") return "thiếu metrics";
  if (!row.statistics || typeof row.statistics !== "object") return "thiếu statistics";
  if (!row.controls || typeof row.controls !== "object") return "thiếu controls";
  if (!row.runtime || typeof row.runtime !== "object") return "thiếu runtime";
  return null;
}

/** `null` on any shape violation — callers must treat that as "cannot trust this file", never as "empty/default". */
export function parseExperimentArtifact(value: unknown): ExperimentArtifact | null {
  if (describeExperimentArtifactProblem(value)) return null;
  return value as ExperimentArtifact;
}

/** Same check as `parseExperimentArtifact`, but returns the Vietnamese reason instead of discarding it — for CLI error messages. */
export function describeExperimentArtifactShapeProblem(value: unknown): string | null {
  return describeExperimentArtifactProblem(value);
}

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
    // Multiple-testing/HAC provenance (audit-forensics v3/v4 fixes) — persisted so an
    // artifact is self-describing without needing to re-derive it from the live report.
    familySize: report.familySize,
    lookCount: report.lookCount,
    nominalAlpha: report.nominalAlpha,
    spentAlpha: report.alpha,
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
        varianceMethod: report.varianceMethod,
        hacLag: testResult ? hacBandwidth(testResult.trials, report.lookback) : null,
      },
      controls,
      runtime: { startedAt, finishedAt, durationMs: Date.parse(finishedAt) - Date.parse(startedAt) },
    };
  });
}
