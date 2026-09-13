/**
 * Prospective scorecard (§27's anti-peeking guarantee, operationalized).
 *
 * Pure logic only — no filesystem — mirroring the split used throughout this
 * codebase (see `experiments.ts`'s header, `lib/data/sync.ts` vs
 * `lib/data/persistence.ts`). `scripts/research-prospective.ts` owns the
 * actual JSONL file (`reports/prospective-scorecard.jsonl`) and real dataset
 * reads.
 *
 * The core invariant: a "prediction" may only ever be frozen for a draw id
 * that `classifyEvidence` (protocol.ts) already classifies as PROSPECTIVE
 * under the current lock. `classifyEvidence` encodes the id-based boundary
 * (`drawId >= lock.prospectiveStartDrawId`), so this module does not
 * re-derive that boundary — it only refuses to proceed when the answer is
 * anything other than PROSPECTIVE. This is what stops anyone from freezing a
 * "prediction" for a draw that has already happened (or happened before the
 * protocol was locked): the boundary is enforced once, in one place.
 *
 * As of this writing there are zero real prospective draws yet (draw #01561
 * is itself RETROSPECTIVE; the lock's `prospectiveStartDrawId` is "01562",
 * a draw that has not occurred). Every function here must therefore treat an
 * empty scorecard — and an empty list of due results — as a normal,
 * non-error state, not something to special-case or throw on.
 */
import type { StrategyId } from "../analytics";
import { evaluateTicket, validateNumbers, type PrizeTier } from "../mega645";
import { classifyEvidence, type ProtocolLock } from "./protocol";

const STRATEGY_IDS: StrategyId[] = ["RANDOM", "HOT", "COLD", "BALANCED"];
const PRIZE_TIERS: PrizeTier[] = ["JACKPOT", "FIRST", "SECOND", "THIRD", "NONE"];

/**
 * One frozen prediction. `result`/`matches`/`tier` start `null` and are only
 * ever filled in later, once the real draw exists, by `appendProspectiveResult`
 * — never by re-freezing.
 */
export type ProspectiveEntry = {
  drawId: string;
  frozenAt: string;
  protocolHash: string;
  datasetHashAtFreeze: string;
  strategyId: StrategyId;
  prediction: number[];
  result: number[] | null;
  matches: number | null;
  tier: PrizeTier | null;
};

export type FreezeProspectiveInput = {
  drawId: string;
  strategyId: StrategyId;
  prediction: number[];
  /** Must equal `lock.protocolHash` — caller-supplied drift is rejected. */
  protocolHash: string;
  datasetHashAtFreeze: string;
  lock: ProtocolLock;
  /**
   * Optional defense-in-depth: refuse when the target draw already exists in
   * the caller's known dataset (peeking), even if id classification says
   * PROSPECTIVE under a stale lock.
   */
  knownDrawIds?: ReadonlySet<string> | readonly string[];
  now?: () => Date;
};

export type FreezeProspectiveResult = { ok: true; entry: ProspectiveEntry } | { ok: false; reason: string };

function knownDrawIdSet(known: FreezeProspectiveInput["knownDrawIds"]): ReadonlySet<string> | null {
  if (!known) return null;
  return known instanceof Set ? known : new Set(known);
}

/**
 * Freezes one prediction for one draw/strategy. Refuses — returns
 * `{ ok: false, reason }`, never silently accepts — unless:
 * 1. `protocolHash` matches the locked protocol hash,
 * 2. `classifyEvidence` says PROSPECTIVE under `lock`,
 * 3. optional `knownDrawIds` does not already contain the draw,
 * 4. the ticket is a valid Mega 6/45 set.
 *
 * Callers must not bypass this by constructing a `ProspectiveEntry` literal.
 */
export function freezeProspectivePrediction(input: FreezeProspectiveInput): FreezeProspectiveResult {
  if (input.protocolHash !== input.lock.protocolHash) {
    return {
      ok: false,
      reason:
        `Từ chối đóng băng kỳ ${input.drawId}: protocolHash caller (${input.protocolHash.slice(0, 12)}…) ` +
        `không khớp protocolHash đã khóa (${input.lock.protocolHash.slice(0, 12)}…). ` +
        "Không được gắn nhãn prospective sau khi đổi protocol.",
    };
  }

  const evidence = classifyEvidence(input.drawId, input.lock);
  if (evidence !== "PROSPECTIVE") {
    return {
      ok: false,
      reason:
        `Từ chối đóng băng dự đoán cho kỳ ${input.drawId}: bằng chứng được phân loại là ${evidence}, ` +
        `không phải PROSPECTIVE (mốc khóa prospectiveStartDrawId=${input.lock.prospectiveStartDrawId ?? "null"}). ` +
        "Không thể đăng ký một 'dự đoán' cho kỳ đã xảy ra hoặc đã biết trước khi khóa protocol.",
    };
  }

  const known = knownDrawIdSet(input.knownDrawIds);
  if (known?.has(input.drawId)) {
    return {
      ok: false,
      reason:
        `Từ chối đóng băng kỳ ${input.drawId}: kỳ này đã có trong dataset đã biết — ` +
        "không thể đăng ký dự đoán sau khi kết quả đã có sẵn (kể cả khi lock bị cũ).",
    };
  }

  if (!validateNumbers(input.prediction)) {
    return {
      ok: false,
      reason: `Vé dự đoán không hợp lệ cho kỳ ${input.drawId}: phải gồm đúng 6 số nguyên khác nhau từ 01 đến 45.`,
    };
  }
  const now = input.now ?? (() => new Date());
  return {
    ok: true,
    entry: {
      drawId: input.drawId,
      frozenAt: now().toISOString(),
      protocolHash: input.protocolHash,
      datasetHashAtFreeze: input.datasetHashAtFreeze,
      strategyId: input.strategyId,
      prediction: [...input.prediction].sort((a, b) => a - b),
      result: null,
      matches: null,
      tier: null,
    },
  };
}

export function hasFrozenEntry(entries: ProspectiveEntry[], drawId: string, strategyId: StrategyId): boolean {
  return entries.some((entry) => entry.drawId === drawId && entry.strategyId === strategyId);
}

/**
 * Appends the real result to every still-unscored entry for `drawId`.
 * Pure — returns a new array; entries that already carry a result are left
 * untouched (append-only: a score, once recorded, is never recomputed or
 * overwritten by this function). A `drawId` with no matching entries — or an
 * empty `entries` array — is a normal no-op, not an error.
 */
export function appendProspectiveResult(
  entries: ProspectiveEntry[],
  input: { drawId: string; result: number[] },
): ProspectiveEntry[] {
  return entries.map((entry) => {
    if (entry.drawId !== input.drawId || entry.result !== null) return entry;
    const scored = evaluateTicket(entry.prediction, input.result);
    return { ...entry, result: [...input.result], matches: scored.matches, tier: scored.tier };
  });
}

export type ProspectiveParseIssue = { line: number; reason: string };
export type ProspectiveParseOutcome = { entries: ProspectiveEntry[]; issues: ProspectiveParseIssue[] };

function describeProspectiveEntryProblem(value: unknown): string | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return `bản ghi không phải object (${Array.isArray(value) ? "array" : typeof value})`;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.drawId !== "string" || row.drawId.length === 0) return "thiếu drawId hoặc drawId rỗng";
  if (typeof row.frozenAt !== "string" || Number.isNaN(Date.parse(row.frozenAt))) {
    return `frozenAt không phải ISO timestamp hợp lệ: ${JSON.stringify(row.frozenAt)}`;
  }
  if (typeof row.protocolHash !== "string" || row.protocolHash.length === 0) return "thiếu protocolHash";
  if (typeof row.datasetHashAtFreeze !== "string" || row.datasetHashAtFreeze.length === 0) {
    return "thiếu datasetHashAtFreeze";
  }
  if (!STRATEGY_IDS.includes(row.strategyId as StrategyId)) {
    return `strategyId không hợp lệ: ${JSON.stringify(row.strategyId)}`;
  }
  if (!Array.isArray(row.prediction) || !validateNumbers(row.prediction as number[])) {
    return `prediction phải là vé hợp lệ (6 số khác nhau 01–45): ${JSON.stringify(row.prediction)}`;
  }
  if (row.result !== null && (!Array.isArray(row.result) || !validateNumbers(row.result as number[]))) {
    return `result phải là null hoặc vé hợp lệ: ${JSON.stringify(row.result)}`;
  }
  if (row.matches !== null && (typeof row.matches !== "number" || !Number.isInteger(row.matches) || row.matches < 0 || row.matches > 6)) {
    return `matches phải là null hoặc số nguyên 0–6: ${JSON.stringify(row.matches)}`;
  }
  if (row.tier !== null && !PRIZE_TIERS.includes(row.tier as PrizeTier)) {
    return `tier không hợp lệ: ${JSON.stringify(row.tier)}`;
  }
  // Internally consistent: result present iff matches/tier present.
  const resultPresent = row.result !== null;
  const scorePresent = row.matches !== null && row.tier !== null;
  if (resultPresent !== scorePresent) {
    return "result và matches/tier phải cùng null hoặc cùng có giá trị";
  }
  return null;
}

/**
 * Parses a JSONL scorecard, fail-closed per line: a malformed line is
 * reported as an issue, never silently dropped or silently accepted with
 * wrong shape. An empty string parses to `{ entries: [], issues: [] }` — the
 * normal state today, since no real prospective draw exists yet.
 */
export function parseProspectiveScorecard(text: string): ProspectiveParseOutcome {
  const entries: ProspectiveEntry[] = [];
  const issues: ProspectiveParseIssue[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line, index) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      issues.push({ line: index + 1, reason: `JSON không hợp lệ: ${(error as Error).message}` });
      return;
    }
    const problem = describeProspectiveEntryProblem(parsed);
    if (problem) {
      issues.push({ line: index + 1, reason: problem });
      return;
    }
    entries.push(parsed as ProspectiveEntry);
  });

  return { entries, issues };
}
