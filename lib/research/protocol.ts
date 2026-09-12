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
