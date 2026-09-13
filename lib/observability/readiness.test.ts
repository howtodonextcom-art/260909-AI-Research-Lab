import assert from "node:assert/strict";
import test from "node:test";
import { checkReadiness, type ReadinessDeps } from "./readiness";
import { serializeDrawsJsonl } from "../data/jsonl";
import { sha256Hex } from "../data/hash";
import type { DatasetManifest, DrawRecord } from "../data/types";
import { PRODUCT_ID } from "../data/types";

const draws: DrawRecord[] = [
  { id: "00001", date: "2016-07-20", result: [1, 2, 3, 4, 5, 6] },
  { id: "00002", date: "2016-07-27", result: [2, 3, 4, 5, 6, 7] },
];

function manifestFor(records: DrawRecord[], hash: string): DatasetManifest {
  return {
    schemaVersion: 2,
    product: PRODUCT_ID,
    recordCount: records.length,
    firstDrawId: records[0]?.id ?? null,
    firstDrawDate: records[0]?.date ?? null,
    latestDrawId: records.at(-1)?.id ?? null,
    latestDrawDate: records.at(-1)?.date ?? null,
    lastAttemptedSync: "2026-09-13T00:00:00.000Z",
    lastSuccessfulSync: "2026-09-13T00:00:00.000Z",
    source: { primary: { id: "vietlott-data", url: "https://example.test", license: "MIT" }, secondary: null },
    sourceEtag: null,
    datasetSha256: hash,
    validation: { valid: true, duplicates: 0, conflicts: 0, rejected: 0, missingIds: [] },
    crossCheck: { status: "NOT_RUN", sampleSize: 0, checkedAt: null },
  };
}

const validLock = {
  protocolVersion: "2.0",
  protocolHash: "a".repeat(64),
  protocolLockedAt: "2026-01-01T00:00:00.000Z",
  protocolDatasetHash: "b".repeat(64),
  prospectiveStartDrawId: "01562",
};

async function baseDeps(): Promise<ReadinessDeps> {
  const text = serializeDrawsJsonl(draws);
  const hash = await sha256Hex(text);
  return {
    fetchDataset: async () => text,
    fetchManifest: async () => manifestFor(draws, hash),
    fetchProtocolLock: async () => validLock,
    fetchRequiredArtifact: async () => ({ some: "artifact" }),
  };
}

test("checkReadiness: mọi dependency healthy => ok:true, 4 checks đều pass", async () => {
  const report = await checkReadiness(await baseDeps());
  assert.equal(report.ok, true);
  assert.equal(report.checks.length, 4);
  assert.ok(report.checks.every((c) => c.ok));
  assert.ok(!Number.isNaN(Date.parse(report.checkedAt)));
});

test("checkReadiness: dataset unreachable => ok:false, check 'dataset' fail, không throw", async () => {
  const deps = await baseDeps();
  deps.fetchDataset = async () => null;
  const report = await checkReadiness(deps);
  assert.equal(report.ok, false);
  const datasetCheck = report.checks.find((c) => c.name === "dataset")!;
  assert.equal(datasetCheck.ok, false);
  assert.match(datasetCheck.detail, /không tải được/);
});

test("checkReadiness: dataset hỏng (bản ghi lỗi) => check 'dataset' fail với lý do rõ ràng", async () => {
  const deps = await baseDeps();
  deps.fetchDataset = async () => "{not-json}\n";
  const report = await checkReadiness(deps);
  const datasetCheck = report.checks.find((c) => c.name === "dataset")!;
  assert.equal(datasetCheck.ok, false);
});

test("checkReadiness: manifest hash không khớp dataset => check 'manifest' fail", async () => {
  const deps = await baseDeps();
  deps.fetchManifest = async () => manifestFor(draws, "0".repeat(64));
  const report = await checkReadiness(deps);
  assert.equal(report.ok, false);
  const manifestCheck = report.checks.find((c) => c.name === "manifest")!;
  assert.equal(manifestCheck.ok, false);
  assert.match(manifestCheck.detail, /hash không khớp/);
});

test("checkReadiness: manifest unreachable => check 'manifest' fail", async () => {
  const deps = await baseDeps();
  deps.fetchManifest = async () => null;
  const report = await checkReadiness(deps);
  const manifestCheck = report.checks.find((c) => c.name === "manifest")!;
  assert.equal(manifestCheck.ok, false);
});

test("checkReadiness: protocol lock thiếu hoặc sai schema => check 'protocolLock' fail", async () => {
  const deps = await baseDeps();
  deps.fetchProtocolLock = async () => ({ not: "a lock" });
  const report = await checkReadiness(deps);
  const lockCheck = report.checks.find((c) => c.name === "protocolLock")!;
  assert.equal(lockCheck.ok, false);
});

test("checkReadiness: required artifact unreachable => check 'requiredArtifact' fail", async () => {
  const deps = await baseDeps();
  deps.fetchRequiredArtifact = async () => null;
  const report = await checkReadiness(deps);
  const artifactCheck = report.checks.find((c) => c.name === "requiredArtifact")!;
  assert.equal(artifactCheck.ok, false);
});

test("checkReadiness: một dependency throw exception => vẫn trả report ok:false, không crash", async () => {
  const deps = await baseDeps();
  deps.fetchDataset = async () => {
    throw new Error("network exploded");
  };
  const report = await checkReadiness(deps);
  assert.equal(report.ok, false);
  const datasetCheck = report.checks.find((c) => c.name === "dataset")!;
  assert.match(datasetCheck.detail, /network exploded/);
});
