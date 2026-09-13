/**
 * Pure verification logic for the registry <-> protocol <-> artifact
 * provenance chain (§Provenance & Research Integrity audit, Round 4).
 *
 * No filesystem access here — `scripts/verify-provenance.ts` owns reading
 * `reports/experiments/registry.jsonl`, `reports/protocol-lock.json`,
 * `reports/protocol-history.json` and `reports/experiments/*.json`, and
 * calls into these functions with already-parsed data. This mirrors the
 * pure/fs split used throughout the codebase (`lib/research/experiments.ts`
 * vs `scripts/run-experiment.ts`, `lib/data/sync.ts` vs
 * `lib/data/persistence.ts`), so every invariant here is unit-testable
 * without touching the real dataset or reports/ directory.
 */
import { sha256Hex } from "../data/hash";
import type { ExperimentArtifact, ExperimentRecord } from "./experiments";
import { isRecognizedProtocolHash, type ProtocolHistoryEntry, type ProtocolLock } from "./protocol";

export type ProvenanceViolationKind =
  | "UNKNOWN_PROTOCOL_HASH"
  | "ARTIFACT_PROTOCOL_HASH_MISMATCH"
  | "ARTIFACT_DATASET_HASH_MISMATCH"
  | "ARTIFACT_EXPERIMENT_ID_MISMATCH"
  | "ARTIFACT_ID_COLLISION"
  | "ARTIFACT_FILENAME_MISMATCH"
  | "MALFORMED_ARTIFACT_FILE";

export type ProvenanceViolation = {
  kind: ProvenanceViolationKind;
  experimentId: string;
  detail: string;
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

/** Canonical (sorted-key) JSON serialization — same recipe as `protocol.ts`'s `canonicalProtocolJson`, generalized to any value. */
export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

export async function canonicalJsonHash(value: unknown): Promise<string> {
  return sha256Hex(canonicalJsonStringify(value));
}

/**
 * Every registry entry's `protocolHash` must be either the current lock's
 * hash or a documented historical one. An entry matching neither is a hard
 * failure: either the registry was tampered with after the fact, or a
 * protocol change happened without ever being locked/recorded — both are
 * exactly the silent-disagreement this function exists to catch.
 */
export function checkRegistryProtocolHashes(
  records: ExperimentRecord[],
  currentLock: ProtocolLock | null,
  history: ProtocolHistoryEntry[],
): ProvenanceViolation[] {
  const violations: ProvenanceViolation[] = [];
  for (const record of records) {
    if (!isRecognizedProtocolHash(record.protocolHash, currentLock, history)) {
      violations.push({
        kind: "UNKNOWN_PROTOCOL_HASH",
        experimentId: record.experimentId,
        detail:
          `protocolHash ${record.protocolHash.slice(0, 12)}… của experiment "${record.experimentId}" ` +
          "không khớp protocol-lock.json hiện tại và không có trong protocol-history.json — " +
          "không thể xác minh đây có từng là một protocol đã khóa hợp lệ hay không.",
      });
    }
  }
  return violations;
}

/**
 * Cross-checks one registry entry against its artifact file, when one
 * exists. `artifact === null` (no artifact file found for this
 * experimentId) is not itself a violation — a REGISTERED/RUNNING/FAILED
 * experiment may legitimately have no completed artifact yet.
 */
export function checkRegistryArtifactConsistency(
  record: ExperimentRecord,
  artifact: ExperimentArtifact | null,
): ProvenanceViolation[] {
  if (!artifact) return [];
  const violations: ProvenanceViolation[] = [];
  if (artifact.experimentId !== record.experimentId) {
    violations.push({
      kind: "ARTIFACT_EXPERIMENT_ID_MISMATCH",
      experimentId: record.experimentId,
      detail: `Artifact tra cứu theo experimentId "${record.experimentId}" nhưng tự khai experimentId khác: "${artifact.experimentId}".`,
    });
  }
  if (artifact.protocolHash !== record.protocolHash) {
    violations.push({
      kind: "ARTIFACT_PROTOCOL_HASH_MISMATCH",
      experimentId: record.experimentId,
      detail:
        `Artifact của "${record.experimentId}" có protocolHash ${artifact.protocolHash.slice(0, 12)}… ` +
        `nhưng registry ghi ${record.protocolHash.slice(0, 12)}….`,
    });
  }
  if (artifact.datasetSha256 !== record.datasetHash) {
    violations.push({
      kind: "ARTIFACT_DATASET_HASH_MISMATCH",
      experimentId: record.experimentId,
      detail:
        `Artifact của "${record.experimentId}" có datasetSha256 ${artifact.datasetSha256.slice(0, 12)}… ` +
        `nhưng registry ghi datasetHash ${record.datasetHash.slice(0, 12)}….`,
    });
  }
  return violations;
}

/**
 * A documented, human-reviewed exception for one SPECIFIC already-known
 * violation — never a blanket suppression. `reports/provenance-exceptions.json`
 * (read by `scripts/verify-provenance.ts`) is the one and only place these are
 * allowed to live, and it is committed, reviewable, and small on purpose.
 *
 * This exists for exactly one situation: a real historical defect was found
 * (an experiment's artifact and registry entry disagree on `protocolHash`
 * because `scripts/run-experiment.ts` used to silently overwrite artifacts on
 * every run — since fixed to make artifacts immutable once registered), the
 * root cause is fixed so it cannot recur, but the already-committed registry
 * line and artifact file are BOTH append-only/immutable and must not be
 * rewritten to hide the fact that this happened. An exception says "yes, this
 * exact violation exists, here is why, it is not new, do not treat it as a
 * regression" — it does not make the underlying disagreement disappear.
 *
 * A NEW violation (different kind, different experimentId, or a detail that
 * doesn't match) is never matched by an existing exception, by design.
 */
export type ProvenanceException = {
  kind: ProvenanceViolationKind;
  experimentId: string;
  /** Must equal the violation's own `detail` exactly — prevents an exception from silently widening to cover a different, unreviewed problem later. */
  detail: string;
  justification: string;
  discoveredAt: string;
  rootCauseFixed: boolean;
};

export type ViolationTriage = {
  /** Real violations with no matching documented exception — these must fail CI. */
  unexplained: ProvenanceViolation[];
  /** Real violations that exactly match a documented exception — printed as a warning, never fatal. */
  acknowledged: Array<{ violation: ProvenanceViolation; exception: ProvenanceException }>;
};

/**
 * Exact match only on (kind, experimentId, detail) — an exception never
 * matches a violation whose message text differs even slightly, so editing
 * the underlying data (which would change computed detail strings like hash
 * prefixes) automatically un-suppresses it for re-review rather than
 * silently continuing to apply a now-stale exception.
 */
export function triageViolations(
  violations: ProvenanceViolation[],
  exceptions: ProvenanceException[],
): ViolationTriage {
  const unexplained: ProvenanceViolation[] = [];
  const acknowledged: ViolationTriage["acknowledged"] = [];
  for (const violation of violations) {
    const exception = exceptions.find(
      (e) => e.kind === violation.kind && e.experimentId === violation.experimentId && e.detail === violation.detail,
    );
    if (exception) acknowledged.push({ violation, exception });
    else unexplained.push(violation);
  }
  return { unexplained, acknowledged };
}

const PROVENANCE_VIOLATION_KINDS: ProvenanceViolationKind[] = [
  "UNKNOWN_PROTOCOL_HASH",
  "ARTIFACT_PROTOCOL_HASH_MISMATCH",
  "ARTIFACT_DATASET_HASH_MISMATCH",
  "ARTIFACT_EXPERIMENT_ID_MISMATCH",
  "ARTIFACT_ID_COLLISION",
  "ARTIFACT_FILENAME_MISMATCH",
  "MALFORMED_ARTIFACT_FILE",
];

function describeProvenanceExceptionProblem(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "bản ghi exception không phải object";
  const row = value as Record<string, unknown>;
  if (!PROVENANCE_VIOLATION_KINDS.includes(row.kind as ProvenanceViolationKind)) return `kind không hợp lệ: ${JSON.stringify(row.kind)}`;
  if (typeof row.experimentId !== "string" || !row.experimentId) return "thiếu experimentId";
  if (typeof row.detail !== "string" || !row.detail) return "thiếu detail";
  if (typeof row.justification !== "string" || !row.justification) return "thiếu justification";
  if (typeof row.discoveredAt !== "string" || Number.isNaN(Date.parse(row.discoveredAt))) return "discoveredAt không phải ISO timestamp hợp lệ";
  if (typeof row.rootCauseFixed !== "boolean") return "rootCauseFixed phải là boolean";
  return null;
}

/** Fail-closed: a malformed exceptions file returns `null` (never a partially-trusted array), so a corrupt file can't silently suppress nothing while looking like it suppresses something. */
export function parseProvenanceExceptions(value: unknown): ProvenanceException[] | null {
  if (!Array.isArray(value)) return null;
  const entries: ProvenanceException[] = [];
  for (const item of value) {
    if (describeProvenanceExceptionProblem(item)) return null;
    entries.push(item as ProvenanceException);
  }
  return entries;
}

export type ArtifactFile = { fileName: string; artifact: ExperimentArtifact };

/**
 * Detects two dishonest scenarios that a per-experimentId-filename
 * convention alone does not rule out: (a) a file whose name disagrees with
 * the experimentId it internally declares, and (b) two files that
 * internally declare the *same* experimentId with different content (only
 * reachable if something bypassed the normal one-file-per-id write path in
 * `scripts/run-experiment.ts`).
 */
export function checkArtifactFileIntegrity(files: ArtifactFile[]): ProvenanceViolation[] {
  const violations: ProvenanceViolation[] = [];

  for (const file of files) {
    const expectedFileName = `${file.artifact.experimentId}.json`;
    if (file.fileName !== expectedFileName) {
      violations.push({
        kind: "ARTIFACT_FILENAME_MISMATCH",
        experimentId: file.artifact.experimentId,
        detail: `File "${file.fileName}" tự khai experimentId "${file.artifact.experimentId}" — tên file đáng lẽ phải là "${expectedFileName}".`,
      });
    }
  }

  const byId = new Map<string, ArtifactFile[]>();
  for (const file of files) {
    const list = byId.get(file.artifact.experimentId) ?? [];
    list.push(file);
    byId.set(file.artifact.experimentId, list);
  }
  for (const [experimentId, group] of byId) {
    if (group.length < 2) continue;
    const distinctContent = new Set(group.map((file) => canonicalJsonStringify(file.artifact)));
    if (distinctContent.size > 1) {
      violations.push({
        kind: "ARTIFACT_ID_COLLISION",
        experimentId,
        detail: `${group.length} file artifact (${group.map((file) => file.fileName).join(", ")}) cùng khai experimentId "${experimentId}" nhưng nội dung KHÁC nhau.`,
      });
    }
  }

  return violations;
}
