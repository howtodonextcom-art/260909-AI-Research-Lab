/**
 * Research protocol definition and freeze (§26).
 *
 * `protocolHash` is computed from `CURRENT_PROTOCOL` itself (canonical,
 * sorted-key JSON -> SHA-256), so it changes automatically whenever any
 * field changes — strategy set, lookback, endpoint, alpha, split rule,
 * selection rule, or statistical test. There is no separate manual step
 * that could be forgotten. `version` stays as a human-readable label; the
 * hash is what an experiment artifact should actually pin.
 */
import { SELECTION_RULE } from "../analytics";
import { sha256Hex } from "../data/hash";
import { PRIMARY_ENDPOINT } from "./statistics";

export type ResearchProtocol = {
  version: string;
  primaryEndpoint: string;
  alpha: number;
  lookback: number;
  strategies: string[];
  temporalSplitRule: string;
  selectionRule: string;
  multipleTestingMethod: string;
  /** Monte Carlo fairness draws; UI must read this instead of hard-coding a smaller sample. */
  fairnessSimulationCount: number;
};

/**
 * Kept equal to `analytics.ts`'s `PROTOCOL_VERSION` by hand (importing it
 * here would create analytics.ts <-> protocol.ts <-> statistics.ts <-
 * analytics.ts cycles, since SELECTION_RULE below already pulls from
 * analytics.ts). Both must be bumped together — see §26.
 */
export const CURRENT_PROTOCOL: ResearchProtocol = {
  version: "2026-09-10.1",
  primaryEndpoint: PRIMARY_ENDPOINT.id,
  alpha: 0.05,
  lookback: 90,
  strategies: ["RANDOM", "HOT", "COLD", "BALANCED"],
  temporalSplitRule:
    "Chronological 50% development / 25% validation / 25% test, no shuffling; candidate selection uses validation only, test only confirms or refutes.",
  selectionRule: SELECTION_RULE,
  multipleTestingMethod: "Holm-Bonferroni",
  fairnessSimulationCount: 2000,
};

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

export function canonicalProtocolJson(protocol: ResearchProtocol): string {
  return JSON.stringify(sortKeysDeep(protocol));
}

export async function computeProtocolHash(protocol: ResearchProtocol = CURRENT_PROTOCOL): Promise<string> {
  return sha256Hex(canonicalProtocolJson(protocol));
}

/**
 * §27: makes the retrospective/prospective boundary explicit. A draw is
 * PROSPECTIVE evidence only if its id is strictly newer than the id that
 * was the latest known draw at the moment the protocol was locked; every
 * earlier draw — no matter which split it falls into — is RETROSPECTIVE,
 * because a human could already have seen it before the protocol existed.
 */
export type ProtocolLock = {
  protocolVersion: string;
  protocolHash: string;
  protocolLockedAt: string;
  protocolDatasetHash: string;
  prospectiveStartDrawId: string | null;
};

export type BuildProtocolLockInput = {
  protocol?: ResearchProtocol;
  protocolHash: string;
  lockedAt: string;
  datasetHash: string;
  latestDrawId: string | null;
};

export function nextDrawId(drawId: string | null): string | null {
  if (!drawId) return null;
  const width = drawId.length;
  const value = Number(drawId);
  if (!Number.isInteger(value) || value < 0) return null;
  return String(value + 1).padStart(width, "0");
}

export function buildProtocolLock({
  protocol = CURRENT_PROTOCOL,
  protocolHash,
  lockedAt,
  datasetHash,
  latestDrawId,
}: BuildProtocolLockInput): ProtocolLock {
  return {
    protocolVersion: protocol.version,
    protocolHash,
    protocolLockedAt: lockedAt,
    protocolDatasetHash: datasetHash,
    prospectiveStartDrawId: nextDrawId(latestDrawId),
  };
}

export function classifyEvidence(drawId: string, lock: ProtocolLock): "RETROSPECTIVE" | "PROSPECTIVE" {
  if (!lock.prospectiveStartDrawId) return "RETROSPECTIVE";
  return Number(drawId) >= Number(lock.prospectiveStartDrawId) ? "PROSPECTIVE" : "RETROSPECTIVE";
}

export function parseProtocolLock(value: unknown): ProtocolLock | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.protocolVersion !== "string") return null;
  if (typeof record.protocolHash !== "string") return null;
  if (typeof record.protocolLockedAt !== "string") return null;
  if (typeof record.protocolDatasetHash !== "string") return null;
  if (record.prospectiveStartDrawId !== null && typeof record.prospectiveStartDrawId !== "string") return null;
  return {
    protocolVersion: record.protocolVersion,
    protocolHash: record.protocolHash,
    protocolLockedAt: record.protocolLockedAt,
    protocolDatasetHash: record.protocolDatasetHash,
    prospectiveStartDrawId: record.prospectiveStartDrawId,
  };
}

export function summarizeEvidence(drawIds: string[], lock: ProtocolLock): {
  retrospective: number;
  prospective: number;
} {
  let retrospective = 0;
  let prospective = 0;
  for (const id of drawIds) {
    if (classifyEvidence(id, lock) === "PROSPECTIVE") prospective += 1;
    else retrospective += 1;
  }
  return { retrospective, prospective };
}

/**
 * §Provenance audit (Round 4): `reports/protocol-lock.json` is only a
 * "current pointer" — by design it is silently overwritable
 * (`research-lock.ts --force`). Without a separate append-only record of
 * every hash that has ever been the *current* lock, a re-lock could replace
 * an old identity with a new one and leave no trace the old one ever
 * existed — which would make it impossible to tell a legitimate historical
 * protocol change apart from an experiment registry entry that was simply
 * never locked at all (i.e. tampered with, or the result of a bug).
 * `reports/protocol-history.json` is that trace: `scripts/research-lock.ts`
 * appends one entry every time it runs (idempotent — re-locking with an
 * unchanged hash never duplicates an entry), and nothing else is allowed to
 * rewrite or remove an existing entry.
 */
export type ProtocolHistorySource =
  | "lock"
  | "migrated-existing-lock"
  | "migrated-pre-lock-registry";

export type ProtocolHistoryEntry = {
  protocolHash: string;
  protocolVersion: string;
  /** ISO timestamp this hash was first known to be the current lock (or, for a migrated entry, the best available evidence of when it was). */
  recordedAt: string;
  source: ProtocolHistorySource;
  /** Present only for migrated entries — explains why this entry was reconstructed instead of written live by research-lock.ts. */
  note?: string;
};

const PROTOCOL_HISTORY_SOURCES: ProtocolHistorySource[] = [
  "lock",
  "migrated-existing-lock",
  "migrated-pre-lock-registry",
];

function describeProtocolHistoryEntryProblem(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return `bản ghi lịch sử không phải object (${Array.isArray(value) ? "array" : typeof value})`;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.protocolHash !== "string" || row.protocolHash.length === 0) return "thiếu protocolHash";
  if (typeof row.protocolVersion !== "string" || row.protocolVersion.length === 0) return "thiếu protocolVersion";
  if (typeof row.recordedAt !== "string" || Number.isNaN(Date.parse(row.recordedAt))) {
    return `recordedAt không phải ISO timestamp hợp lệ: ${JSON.stringify(row.recordedAt)}`;
  }
  if (!PROTOCOL_HISTORY_SOURCES.includes(row.source as ProtocolHistorySource)) {
    return `source không hợp lệ: ${JSON.stringify(row.source)}`;
  }
  if (row.note !== undefined && typeof row.note !== "string") return "note phải là chuỗi nếu có";
  return null;
}

/**
 * Fail-closed parse of `reports/protocol-history.json`: a malformed file (or
 * a malformed entry inside it) returns `null`, never a partially-trusted
 * array — a corrupt history file must never be silently treated as "no
 * history" (that would defeat its entire purpose).
 */
export function parseProtocolHistory(value: unknown): ProtocolHistoryEntry[] | null {
  if (!Array.isArray(value)) return null;
  const entries: ProtocolHistoryEntry[] = [];
  for (const item of value) {
    const problem = describeProtocolHistoryEntryProblem(item);
    if (problem) return null;
    entries.push(item as ProtocolHistoryEntry);
  }
  return entries;
}

/**
 * True if `hash` is either the current lock's hash or a documented
 * historical one. There is deliberately no third way to become "recognized"
 * — an unrecognized hash always means "cannot verify this was ever a real
 * locked protocol", which callers must treat as a hard failure.
 */
export function isRecognizedProtocolHash(
  hash: string,
  currentLock: ProtocolLock | null,
  history: ProtocolHistoryEntry[],
): boolean {
  if (currentLock && currentLock.protocolHash === hash) return true;
  return history.some((entry) => entry.protocolHash === hash);
}

/**
 * Appends `newEntry` unless a documented entry for the same hash already
 * exists (idempotent — re-locking with an unchanged protocol must not
 * duplicate the entry every time `research-lock.ts` runs). Pure: never
 * mutates `history`, never edits or removes an existing entry.
 */
export function appendProtocolHistoryEntry(
  history: ProtocolHistoryEntry[],
  newEntry: ProtocolHistoryEntry,
): ProtocolHistoryEntry[] {
  if (history.some((entry) => entry.protocolHash === newEntry.protocolHash)) return history;
  return [...history, newEntry];
}

/**
 * When `protocol-history.json` does not exist yet but `protocol-lock.json`
 * already does, the existing lock's identity must not simply vanish the
 * moment history-tracking is introduced: it becomes history entry 1,
 * source `"migrated-existing-lock"`, so the very first `research-lock.ts`
 * run after this feature ships does not look like the protocol was "born"
 * at that moment.
 */
export function seedProtocolHistoryFromExistingLock(lock: ProtocolLock): ProtocolHistoryEntry[] {
  return [
    {
      protocolHash: lock.protocolHash,
      protocolVersion: lock.protocolVersion,
      recordedAt: lock.protocolLockedAt,
      source: "migrated-existing-lock",
    },
  ];
}
