import assert from "node:assert/strict";
import test from "node:test";
import type { ExperimentArtifact, ExperimentRecord } from "./experiments";
import type { ProtocolHistoryEntry, ProtocolLock } from "./protocol";
import {
  canonicalJsonHash,
  canonicalJsonStringify,
  checkArtifactFileIntegrity,
  checkRegistryArtifactConsistency,
  checkRegistryProtocolHashes,
  parseProvenanceExceptions,
  triageViolations,
  type ArtifactFile,
  type ProvenanceException,
} from "./provenance-registry";

const LOCK: ProtocolLock = {
  protocolVersion: "2026-09-10.1",
  protocolHash: "current-hash-aaa",
  protocolLockedAt: "2026-09-12T00:00:00.000Z",
  protocolDatasetHash: "dataset-hash-1",
  prospectiveStartDrawId: "01562",
};

function baseRecord(overrides: Partial<ExperimentRecord> = {}): ExperimentRecord {
  return {
    experimentId: "exp-1",
    hypothesisId: "HOT-vs-random",
    familyId: "family-1",
    strategyId: "HOT",
    strategyVersion: "2026-09-10.1",
    parameters: { lookback: 90 },
    seed: 645,
    datasetHash: "dataset-hash-1",
    protocolVersion: "2026-09-10.1",
    protocolHash: "current-hash-aaa",
    registeredAt: "2026-09-12T01:00:00.000Z",
    status: "COMPLETED",
    ...overrides,
  };
}

function baseArtifact(overrides: Partial<ExperimentArtifact> = {}): ExperimentArtifact {
  return {
    experimentId: "exp-1",
    gitCommit: "abc123",
    datasetSha256: "dataset-hash-1",
    protocolVersion: "2026-09-10.1",
    protocolHash: "current-hash-aaa",
    strategy: { id: "HOT", version: "2026-09-10.1", parameters: { lookback: 90 } },
    seed: 645,
    temporalSplit: {
      development: { startDate: "2017-01-01", endDate: "2020-01-01", trials: 100 },
      validation: { startDate: "2020-01-02", endDate: "2021-01-01", trials: 50 },
      test: { startDate: "2021-01-02", endDate: "2022-01-01", trials: 50 },
    },
    metrics: { averageMatches: 0.8, edgeVsRandom: 0, hit3Rate: 2, roi: -90 },
    statistics: {
      effectSize: 0,
      confidenceInterval: [-0.1, 0.1],
      pValue: 0.5,
      adjustedPValue: 1,
      multipleTestingMethod: "Holm-Bonferroni",
      varianceMethod: "newey-west-hac",
      hacLag: 7,
    },
    controls: {
      familySize: 3,
      lookCount: 1,
      nominalAlpha: 0.05,
      spentAlpha: 0.05,
      latestDrawEvidence: "RETROSPECTIVE",
    },
    runtime: { startedAt: "2026-09-12T00:59:00.000Z", finishedAt: "2026-09-12T01:00:00.000Z" },
    ...overrides,
  } as unknown as ExperimentArtifact;
}

// --- checkRegistryProtocolHashes --------------------------------------------

test("checkRegistryProtocolHashes: hash trùng lock hiện tại thì không có vi phạm", () => {
  const violations = checkRegistryProtocolHashes([baseRecord()], LOCK, []);
  assert.deepEqual(violations, []);
});

test("checkRegistryProtocolHashes: hash trùng một mục trong protocol-history.json thì không có vi phạm", () => {
  const history: ProtocolHistoryEntry[] = [
    { protocolHash: "old-hash-bbb", protocolVersion: "2026-09-01.1", recordedAt: "2026-09-01T00:00:00.000Z", source: "lock" },
  ];
  const record = baseRecord({ protocolHash: "old-hash-bbb" });
  assert.deepEqual(checkRegistryProtocolHashes([record], LOCK, history), []);
});

test("checkRegistryProtocolHashes: hash không khớp lock hiện tại và không có trong history thì FAIL với UNKNOWN_PROTOCOL_HASH", () => {
  const record = baseRecord({ protocolHash: "unrecognized-hash-zzz" });
  const violations = checkRegistryProtocolHashes([record], LOCK, []);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].kind, "UNKNOWN_PROTOCOL_HASH");
  assert.equal(violations[0].experimentId, "exp-1");
});

test("checkRegistryProtocolHashes: currentLock null thì chỉ history được công nhận", () => {
  const history: ProtocolHistoryEntry[] = [
    { protocolHash: "old-hash-bbb", protocolVersion: "2026-09-01.1", recordedAt: "2026-09-01T00:00:00.000Z", source: "lock" },
  ];
  assert.deepEqual(checkRegistryProtocolHashes([baseRecord({ protocolHash: "old-hash-bbb" })], null, history), []);
  const violations = checkRegistryProtocolHashes([baseRecord({ protocolHash: "current-hash-aaa" })], null, history);
  assert.equal(violations.length, 1);
});

// --- checkRegistryArtifactConsistency ---------------------------------------

test("checkRegistryArtifactConsistency: artifact null (chưa có artifact) không phải vi phạm", () => {
  assert.deepEqual(checkRegistryArtifactConsistency(baseRecord(), null), []);
});

test("checkRegistryArtifactConsistency: mọi trường khớp nhau thì không có vi phạm", () => {
  assert.deepEqual(checkRegistryArtifactConsistency(baseRecord(), baseArtifact()), []);
});

test("checkRegistryArtifactConsistency: experimentId lệch -> ARTIFACT_EXPERIMENT_ID_MISMATCH", () => {
  const violations = checkRegistryArtifactConsistency(baseRecord(), baseArtifact({ experimentId: "exp-other" }));
  assert.equal(violations.length, 1);
  assert.equal(violations[0].kind, "ARTIFACT_EXPERIMENT_ID_MISMATCH");
});

test("checkRegistryArtifactConsistency: protocolHash lệch -> ARTIFACT_PROTOCOL_HASH_MISMATCH (đây chính là bug thật đã tìm thấy trong reports/experiments/)", () => {
  const violations = checkRegistryArtifactConsistency(baseRecord({ protocolHash: "old-hash-bbb" }), baseArtifact({ protocolHash: "current-hash-aaa" }));
  assert.equal(violations.length, 1);
  assert.equal(violations[0].kind, "ARTIFACT_PROTOCOL_HASH_MISMATCH");
});

test("checkRegistryArtifactConsistency: datasetHash lệch -> ARTIFACT_DATASET_HASH_MISMATCH", () => {
  const violations = checkRegistryArtifactConsistency(baseRecord(), baseArtifact({ datasetSha256: "different-dataset-hash" }));
  assert.equal(violations.length, 1);
  assert.equal(violations[0].kind, "ARTIFACT_DATASET_HASH_MISMATCH");
});

test("checkRegistryArtifactConsistency: nhiều trường lệch cùng lúc thì báo đủ từng vi phạm", () => {
  const violations = checkRegistryArtifactConsistency(
    baseRecord({ protocolHash: "old-hash-bbb", datasetHash: "different-dataset-hash" }),
    baseArtifact({ experimentId: "exp-other", protocolHash: "current-hash-aaa", datasetSha256: "dataset-hash-1" }),
  );
  assert.equal(violations.length, 3);
  const kinds = violations.map((v) => v.kind).sort();
  assert.deepEqual(kinds, ["ARTIFACT_DATASET_HASH_MISMATCH", "ARTIFACT_EXPERIMENT_ID_MISMATCH", "ARTIFACT_PROTOCOL_HASH_MISMATCH"]);
});

// --- checkArtifactFileIntegrity ----------------------------------------------

test("checkArtifactFileIntegrity: tên file khớp experimentId thì không có vi phạm", () => {
  const files: ArtifactFile[] = [{ fileName: "exp-1.json", artifact: baseArtifact() }];
  assert.deepEqual(checkArtifactFileIntegrity(files), []);
});

test("checkArtifactFileIntegrity: tên file lệch experimentId tự khai -> ARTIFACT_FILENAME_MISMATCH", () => {
  const files: ArtifactFile[] = [{ fileName: "wrong-name.json", artifact: baseArtifact() }];
  const violations = checkArtifactFileIntegrity(files);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].kind, "ARTIFACT_FILENAME_MISMATCH");
});

test("checkArtifactFileIntegrity: hai file cùng experimentId nhưng nội dung khác nhau -> ARTIFACT_ID_COLLISION", () => {
  // Two distinct on-disk filenames necessarily means at least one of them
  // mismatches `${experimentId}.json` — that's a separate, correctly-raised
  // ARTIFACT_FILENAME_MISMATCH. What this test actually pins down is that
  // the CONTENT collision itself is detected exactly once, regardless.
  const files: ArtifactFile[] = [
    { fileName: "exp-1.json", artifact: baseArtifact({ seed: 645 }) },
    { fileName: "exp-1-dup.json", artifact: baseArtifact({ seed: 999 }) },
  ];
  const violations = checkArtifactFileIntegrity(files);
  const collisions = violations.filter((v) => v.kind === "ARTIFACT_ID_COLLISION");
  assert.equal(collisions.length, 1);
});

test("checkArtifactFileIntegrity: hai file cùng experimentId và NỘI DUNG GIỐNG HỆT thì không phải collision (chỉ là bản sao)", () => {
  const files: ArtifactFile[] = [
    { fileName: "exp-1.json", artifact: baseArtifact() },
    { fileName: "exp-1-backup.json", artifact: baseArtifact() },
  ];
  // Filename mismatch on the second copy is still flagged, but NOT a content collision.
  const violations = checkArtifactFileIntegrity(files);
  assert.ok(!violations.some((v) => v.kind === "ARTIFACT_ID_COLLISION"));
  assert.ok(violations.some((v) => v.kind === "ARTIFACT_FILENAME_MISMATCH"));
});

// --- canonicalJsonStringify / canonicalJsonHash -----------------------------

test("canonicalJsonStringify: thứ tự khóa khác nhau cho cùng chuỗi hóa (sorted-key canonical)", () => {
  const a = { b: 1, a: 2, c: { z: 1, y: 2 } };
  const b = { a: 2, c: { y: 2, z: 1 }, b: 1 };
  assert.equal(canonicalJsonStringify(a), canonicalJsonStringify(b));
});

test("canonicalJsonHash: cùng nội dung (bất kể thứ tự khóa) cho cùng hash; nội dung khác cho hash khác", async () => {
  const a = { x: 1, y: 2 };
  const b = { y: 2, x: 1 };
  const c = { x: 1, y: 3 };
  assert.equal(await canonicalJsonHash(a), await canonicalJsonHash(b));
  assert.notEqual(await canonicalJsonHash(a), await canonicalJsonHash(c));
});

// --- triageViolations / parseProvenanceExceptions ---------------------------

test("triageViolations: vi phạm không có exception khớp thì vào unexplained", () => {
  const violations = checkRegistryProtocolHashes([baseRecord({ protocolHash: "unrecognized-hash-zzz" })], LOCK, []);
  const { unexplained, acknowledged } = triageViolations(violations, []);
  assert.equal(unexplained.length, 1);
  assert.equal(acknowledged.length, 0);
});

test("triageViolations: vi phạm khớp CHÍNH XÁC (kind, experimentId, detail) với một exception thì được acknowledge, không unexplained", () => {
  const violations = checkRegistryArtifactConsistency(baseRecord({ protocolHash: "old-hash-bbb" }), baseArtifact({ protocolHash: "current-hash-aaa" }));
  assert.equal(violations.length, 1);
  const exception: ProvenanceException = {
    kind: "ARTIFACT_PROTOCOL_HASH_MISMATCH",
    experimentId: "exp-1",
    detail: violations[0].detail,
    justification: "known historical defect, root cause fixed",
    discoveredAt: "2026-09-13T00:00:00.000Z",
    rootCauseFixed: true,
  };
  const { unexplained, acknowledged } = triageViolations(violations, [exception]);
  assert.equal(unexplained.length, 0);
  assert.equal(acknowledged.length, 1);
});

test("triageViolations: exception KHÔNG khớp vì detail lệch (dù chỉ một ký tự) thì vi phạm vẫn unexplained — không tự nới lỏng theo thời gian", () => {
  const violations = checkRegistryArtifactConsistency(baseRecord({ protocolHash: "old-hash-bbb" }), baseArtifact({ protocolHash: "current-hash-aaa" }));
  const staleException: ProvenanceException = {
    kind: "ARTIFACT_PROTOCOL_HASH_MISMATCH",
    experimentId: "exp-1",
    detail: `${violations[0].detail} (đã lỗi thời)`,
    justification: "stale",
    discoveredAt: "2026-09-13T00:00:00.000Z",
    rootCauseFixed: true,
  };
  const { unexplained, acknowledged } = triageViolations(violations, [staleException]);
  assert.equal(unexplained.length, 1);
  assert.equal(acknowledged.length, 0);
});

test("triageViolations: exception cho experimentId khác thì không áp dụng nhầm sang experiment này", () => {
  const violations = checkRegistryArtifactConsistency(baseRecord({ protocolHash: "old-hash-bbb" }), baseArtifact({ protocolHash: "current-hash-aaa" }));
  const wrongIdException: ProvenanceException = {
    kind: "ARTIFACT_PROTOCOL_HASH_MISMATCH",
    experimentId: "exp-other",
    detail: violations[0].detail,
    justification: "wrong id",
    discoveredAt: "2026-09-13T00:00:00.000Z",
    rootCauseFixed: true,
  };
  const { unexplained } = triageViolations(violations, [wrongIdException]);
  assert.equal(unexplained.length, 1);
});

test("parseProvenanceExceptions: mảng hợp lệ thì parse đúng", () => {
  const raw = [
    {
      kind: "ARTIFACT_PROTOCOL_HASH_MISMATCH",
      experimentId: "exp-1",
      detail: "some detail",
      justification: "reason",
      discoveredAt: "2026-09-13T00:00:00.000Z",
      rootCauseFixed: true,
    },
  ];
  const parsed = parseProvenanceExceptions(raw);
  assert.ok(parsed !== null);
  assert.equal(parsed!.length, 1);
});

test("parseProvenanceExceptions: fail-closed — không phải array, hoặc thiếu trường, hoặc kind lạ đều trả về null (không phải mảng rỗng)", () => {
  assert.equal(parseProvenanceExceptions({}), null);
  assert.equal(parseProvenanceExceptions([{ kind: "NOT_A_REAL_KIND", experimentId: "x", detail: "d", justification: "j", discoveredAt: "2026-01-01T00:00:00.000Z", rootCauseFixed: true }]), null);
  assert.equal(parseProvenanceExceptions([{ kind: "ARTIFACT_PROTOCOL_HASH_MISMATCH", experimentId: "x" }]), null);
  assert.equal(parseProvenanceExceptions([{ kind: "ARTIFACT_PROTOCOL_HASH_MISMATCH", experimentId: "x", detail: "d", justification: "j", discoveredAt: "không-phải-ngày", rootCauseFixed: true }]), null);
  assert.equal(parseProvenanceExceptions([{ kind: "ARTIFACT_PROTOCOL_HASH_MISMATCH", experimentId: "x", detail: "d", justification: "j", discoveredAt: "2026-01-01T00:00:00.000Z", rootCauseFixed: "yes" }]), null);
});
