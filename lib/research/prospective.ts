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
import { createHash } from "node:crypto";
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
 *
 * Implemented as a thin wrapper over the append-only hash-chained ledger
 * below (`parseProspectiveLedger` + `deriveProspectiveStatus`) so that a
 * scorecard file mixing legacy full-entry lines with new chained
 * FROZEN/SCORED event lines still parses into the exact same
 * `ProspectiveEntry[]` shape this function has always returned — existing
 * callers (`lib/research/prospective-summary.ts`,
 * `scripts/export-prospective-summary.ts`) need zero changes.
 */
export function parseProspectiveScorecard(text: string): ProspectiveParseOutcome {
  const { lines, issues } = parseProspectiveLedger(text);
  const entries = deriveProspectiveStatus(lines);
  return { entries, issues };
}

// --- Append-only hash-chained ledger (§Provenance audit, Round 4) ---------
//
// The gap this closes: `scripts/research-prospective.ts`'s `append-result`
// command used to fill in `result`/`matches`/`tier` by rewriting the WHOLE
// scorecard file (`writeFile`, not `appendFile`) with a mutated in-memory
// array. That loses tamper-evidence — there is no way to distinguish
// "legitimately scored" from "silently edited" after the fact, because both
// look identical: a line whose bytes changed.
//
// The fix is a proper append-only event log: freezing a prediction appends
// a FrozenEvent; scoring it later appends a *separate* ScoredEvent that
// references the FrozenEvent by `entryId` — the FrozenEvent's own bytes are
// never touched again. Every chained event also carries `previousEntryHash`
// and `entryHash`, forming a hash chain across the WHOLE file in append
// order (like a git commit chain): tampering with, deleting, or reordering
// ANY chained line breaks every hash computed from that point on, which
// `verifyProspectiveChain` detects deterministically.
//
// Backward compatibility: the file may start with legacy lines (the 4 real
// entries frozen before this feature existed have no `entryId`/
// `previousEntryHash`/`entryHash` — they predate the chain and are never
// retroactively assigned a hash that would misrepresent when chaining
// actually started). Those lines parse as `LEGACY`, are still folded into
// the derived view, and are reported by the verifier as a distinct, honest
// `LEGACY_UNCHAINED` category rather than silently treated as always having
// been chained.
//
// Hashing here deliberately uses Node's synchronous `crypto.createHash`
// (not `lib/data/hash.ts`'s WebCrypto-based `sha256Hex`, which is async):
// `parseProspectiveScorecard` above is a long-standing SYNCHRONOUS API that
// `scripts/export-prospective-summary.ts` calls without `await` — making
// any part of this parse path async would silently break that caller. This
// module is Node-only (never imported by client/browser code — only by
// `scripts/*.ts` and its own test file), so `node:crypto` is safe to use.

function syncSha256Hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, val]) => [key, sortKeysDeep(val)]),
    );
  }
  return value;
}

function canonicalChainJson(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

/**
 * A stable content-addressed reference id for one frozen prediction,
 * derived only from fields every entry (legacy or new) already has. This is
 * NOT a security-sensitive chain hash — it is only ever used to match a
 * ScoredEvent back to the FrozenEvent/legacy entry it scores, which is why
 * it is safe (and necessary) to recompute for legacy entries that never had
 * an explicit `entryId` field on disk.
 */
export function computeProspectiveEntryId(input: { drawId: string; strategyId: StrategyId; frozenAt: string }): string {
  return syncSha256Hex(canonicalChainJson({ drawId: input.drawId, strategyId: input.strategyId, frozenAt: input.frozenAt }));
}

/** `entryHash` = hash(canonical JSON of the event's own content, excluding entryHash itself) + previousEntryHash. */
export function computeChainEntryHash(content: Record<string, unknown>, previousEntryHash: string | null): string {
  return syncSha256Hex(`${canonicalChainJson(content)}|${previousEntryHash ?? "GENESIS"}`);
}

export type ChainedFrozenEvent = ProspectiveEntry & {
  kind: "FROZEN";
  entryId: string;
  previousEntryHash: string | null;
  entryHash: string;
};

export type ChainedScoredEvent = {
  kind: "SCORED";
  entryId: string;
  drawId: string;
  strategyId: StrategyId;
  scoredAt: string;
  result: number[];
  matches: number;
  tier: PrizeTier;
  previousEntryHash: string | null;
  entryHash: string;
};

/**
 * Wraps an already-validated `ProspectiveEntry` (from `freezeProspectivePrediction`)
 * into a chained FrozenEvent ready to append. `previousEntryHash` must be the
 * `entryHash` of the last chained line currently in the file (see
 * `lastChainHash`), or `null` if this is the very first chained line ever
 * (legacy lines, if any, do not count).
 */
export function buildFrozenEvent(entry: ProspectiveEntry, previousEntryHash: string | null): ChainedFrozenEvent {
  const entryId = computeProspectiveEntryId(entry);
  const content = { kind: "FROZEN" as const, entryId, ...entry };
  const entryHash = computeChainEntryHash(content, previousEntryHash);
  return { ...content, previousEntryHash, entryHash };
}

export type BuildScoredEventInput = {
  entryId: string;
  drawId: string;
  strategyId: StrategyId;
  prediction: number[];
  result: number[];
  scoredAt: string;
};

/** Scores `input.prediction` against `input.result` via `evaluateTicket` (never re-derived independently) and wraps it as a chained ScoredEvent. */
export function buildScoredEvent(input: BuildScoredEventInput, previousEntryHash: string | null): ChainedScoredEvent {
  const scored = evaluateTicket(input.prediction, input.result);
  const content = {
    kind: "SCORED" as const,
    entryId: input.entryId,
    drawId: input.drawId,
    strategyId: input.strategyId,
    scoredAt: input.scoredAt,
    result: [...input.result],
    matches: scored.matches,
    tier: scored.tier,
  };
  const entryHash = computeChainEntryHash(content, previousEntryHash);
  return { ...content, previousEntryHash, entryHash };
}

export type ParsedLedgerLine =
  | { format: "LEGACY"; entry: ProspectiveEntry }
  | { format: "FROZEN"; event: ChainedFrozenEvent }
  | { format: "SCORED"; event: ChainedScoredEvent };

export type ProspectiveLedgerParseOutcome = { lines: ParsedLedgerLine[]; issues: ProspectiveParseIssue[] };

function describeChainCommonProblem(row: Record<string, unknown>): string | null {
  if (typeof row.entryId !== "string" || row.entryId.length === 0) return "thiếu entryId";
  if (row.previousEntryHash !== null && typeof row.previousEntryHash !== "string") {
    return "previousEntryHash phải là chuỗi hoặc null";
  }
  if (typeof row.entryHash !== "string" || row.entryHash.length === 0) return "thiếu entryHash";
  return null;
}

function describeFrozenEventProblem(row: Record<string, unknown>): string | null {
  const baseProblem = describeProspectiveEntryProblem(row);
  if (baseProblem) return baseProblem;
  if (row.result !== null) {
    return "FrozenEvent không được có result khác null — điểm số phải đến từ một ScoredEvent riêng, không được nhét thẳng vào lúc đóng băng";
  }
  return describeChainCommonProblem(row);
}

function describeScoredEventProblem(row: Record<string, unknown>): string | null {
  const chainProblem = describeChainCommonProblem(row);
  if (chainProblem) return chainProblem;
  if (typeof row.drawId !== "string" || row.drawId.length === 0) return "thiếu drawId";
  if (!STRATEGY_IDS.includes(row.strategyId as StrategyId)) {
    return `strategyId không hợp lệ: ${JSON.stringify(row.strategyId)}`;
  }
  if (typeof row.scoredAt !== "string" || Number.isNaN(Date.parse(row.scoredAt))) {
    return `scoredAt không phải ISO timestamp hợp lệ: ${JSON.stringify(row.scoredAt)}`;
  }
  if (!Array.isArray(row.result) || !validateNumbers(row.result as number[])) {
    return `result phải là vé hợp lệ (6 số khác nhau 01–45): ${JSON.stringify(row.result)}`;
  }
  if (typeof row.matches !== "number" || !Number.isInteger(row.matches) || row.matches < 0 || row.matches > 6) {
    return `matches phải là số nguyên 0–6: ${JSON.stringify(row.matches)}`;
  }
  if (!PRIZE_TIERS.includes(row.tier as PrizeTier)) return `tier không hợp lệ: ${JSON.stringify(row.tier)}`;
  return null;
}

/**
 * Parses the raw scorecard file into a typed, ordered sequence of ledger
 * lines (legacy full entries, or new chained FROZEN/SCORED events),
 * fail-closed per line exactly like `parseProspectiveScorecard` always was.
 */
export function parseProspectiveLedger(text: string): ProspectiveLedgerParseOutcome {
  const lines: ParsedLedgerLine[] = [];
  const issues: ProspectiveParseIssue[] = [];
  const rawLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  rawLines.forEach((line, index) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      issues.push({ line: index + 1, reason: `JSON không hợp lệ: ${(error as Error).message}` });
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      issues.push({ line: index + 1, reason: `bản ghi không phải object (${Array.isArray(parsed) ? "array" : typeof parsed})` });
      return;
    }
    const row = parsed as Record<string, unknown>;
    if (row.kind === "FROZEN") {
      const problem = describeFrozenEventProblem(row);
      if (problem) {
        issues.push({ line: index + 1, reason: problem });
        return;
      }
      lines.push({ format: "FROZEN", event: row as unknown as ChainedFrozenEvent });
    } else if (row.kind === "SCORED") {
      const problem = describeScoredEventProblem(row);
      if (problem) {
        issues.push({ line: index + 1, reason: problem });
        return;
      }
      lines.push({ format: "SCORED", event: row as unknown as ChainedScoredEvent });
    } else if (row.kind === undefined) {
      const problem = describeProspectiveEntryProblem(row);
      if (problem) {
        issues.push({ line: index + 1, reason: problem });
        return;
      }
      lines.push({ format: "LEGACY", entry: row as ProspectiveEntry });
    } else {
      issues.push({ line: index + 1, reason: `kind không hợp lệ: ${JSON.stringify(row.kind)}` });
    }
  });

  return { lines, issues };
}

export type FoldedProspectiveEntry = ProspectiveEntry & { entryId: string };

/**
 * Folds a parsed ledger into one entry per distinct (drawId, strategyId,
 * frozenAt) — a LEGACY line or a FROZEN event both establish an entry
 * (first-seen order preserved); a SCORED event fills in `result`/`matches`/
 * `tier` on the entry its `entryId` references, but only if that entry is
 * still `null` (append-only: a score, once recorded, is never overwritten,
 * matching `appendProspectiveResult`'s existing guarantee). A SCORED event
 * with no matching entry (a dangling reference) is silently skipped here —
 * this fold must stay resilient for read paths (UI/exporter);
 * `verifyProspectiveChain`/`scripts/verify-provenance.ts` are where a
 * dangling reference should be treated as a hard failure.
 */
export function foldProspectiveLedger(lines: ParsedLedgerLine[]): FoldedProspectiveEntry[] {
  const order: string[] = [];
  const byId = new Map<string, FoldedProspectiveEntry>();

  for (const line of lines) {
    if (line.format === "LEGACY") {
      const entryId = computeProspectiveEntryId(line.entry);
      if (!byId.has(entryId)) order.push(entryId);
      byId.set(entryId, { ...line.entry, entryId });
    } else if (line.format === "FROZEN") {
      const event = line.event;
      const folded: FoldedProspectiveEntry = {
        entryId: event.entryId,
        drawId: event.drawId,
        frozenAt: event.frozenAt,
        protocolHash: event.protocolHash,
        datasetHashAtFreeze: event.datasetHashAtFreeze,
        strategyId: event.strategyId,
        prediction: event.prediction,
        result: event.result,
        matches: event.matches,
        tier: event.tier,
      };
      if (!byId.has(folded.entryId)) order.push(folded.entryId);
      byId.set(folded.entryId, folded);
    } else {
      const existing = byId.get(line.event.entryId);
      if (existing && existing.result === null) {
        byId.set(line.event.entryId, {
          ...existing,
          result: [...line.event.result],
          matches: line.event.matches,
          tier: line.event.tier,
        });
      }
    }
  }

  return order.map((id) => byId.get(id)!);
}

/**
 * The read-only view `parseProspectiveScorecard` has always returned:
 * `ProspectiveEntry[]`, one per distinct frozen prediction, `result`/
 * `matches`/`tier` filled in once a ScoredEvent (or a legacy inline score)
 * exists for it. Only difference from `foldProspectiveLedger`: this strips
 * the internal `entryId` bookkeeping field so legacy-only files parse to
 * byte-for-byte the same shape they always did.
 */
export function deriveProspectiveStatus(lines: ParsedLedgerLine[]): ProspectiveEntry[] {
  return foldProspectiveLedger(lines).map(
    (folded): ProspectiveEntry => ({
      drawId: folded.drawId,
      frozenAt: folded.frozenAt,
      protocolHash: folded.protocolHash,
      datasetHashAtFreeze: folded.datasetHashAtFreeze,
      strategyId: folded.strategyId,
      prediction: folded.prediction,
      result: folded.result,
      matches: folded.matches,
      tier: folded.tier,
    }),
  );
}

/** The `entryHash` of the last CHAINED (FROZEN or SCORED) line in the file, or `null` if the file has no chained lines yet (empty, or legacy-only). This is the `previousEntryHash` the next appended chained line must use. */
export function lastChainHash(lines: ParsedLedgerLine[]): string | null {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (line.format === "FROZEN" || line.format === "SCORED") return line.event.entryHash;
  }
  return null;
}

export type ProspectiveChainResult = {
  ok: boolean;
  violations: string[];
  /** Chained (FROZEN + SCORED) line count. */
  chainedCount: number;
  /** Lines that predate the hash chain — reported honestly, not folded into the chain as if always chained. */
  legacyCount: number;
};

/**
 * Walks the ledger in file order and recomputes each chained line's
 * `entryHash` from its own content plus the actual previous chained line's
 * hash (genesis — the very first chained line ever — must claim
 * `previousEntryHash: null`). Any mismatch — content edited after the fact,
 * a line deleted, or two lines reordered — breaks the chain at exactly the
 * point of tampering and is reported as a violation; `ok: false` whenever
 * `violations` is non-empty. Legacy lines are counted separately and never
 * participate in hash verification (see the header comment above for why).
 */
export function verifyProspectiveChain(lines: ParsedLedgerLine[]): ProspectiveChainResult {
  const violations: string[] = [];
  let expectedPrevious: string | null = null;
  let chainedCount = 0;
  let legacyCount = 0;

  lines.forEach((line, index) => {
    if (line.format === "LEGACY") {
      legacyCount += 1;
      return;
    }
    chainedCount += 1;
    const event = line.event as unknown as Record<string, unknown> & {
      previousEntryHash: string | null;
      entryHash: string;
      entryId: string;
    };
    const { previousEntryHash, entryHash, ...content } = event;
    const recomputed = computeChainEntryHash(content, previousEntryHash);
    const position = `dòng thứ ${index + 1} trong file (entryId=${event.entryId.slice(0, 12)}…, kind=${line.format})`;

    if (previousEntryHash !== expectedPrevious) {
      violations.push(
        `${position}: previousEntryHash="${previousEntryHash?.slice(0, 12) ?? "null"}" không khớp hash thực tế của dòng liền trước ("${expectedPrevious?.slice(0, 12) ?? "null"}") — có dòng đã bị xóa, chèn thêm, hoặc bị đảo thứ tự.`,
      );
    }
    if (recomputed !== entryHash) {
      violations.push(`${position}: entryHash không khớp với nội dung thực tế của chính dòng này — nội dung đã bị sửa sau khi ghi.`);
    }

    // Advance using the line's OWN claimed hash (not the recomputed one), so
    // a single tampered line is flagged exactly once instead of cascading
    // into a false mismatch on every later, untouched line.
    expectedPrevious = entryHash;
  });

  return { ok: violations.length === 0, violations, chainedCount, legacyCount };
}
