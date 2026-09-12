import assert from "node:assert/strict";
import test from "node:test";
import { runTemporalBacktestReport, type DrawRecord } from "../analytics";
import { createRng, drawFairTicket } from "./rng";
import {
  buildExperimentArtifactsFromReport,
  countFamilyExperiments,
  parseExperimentRegistry,
  registerExperiment,
  registryHasExperiment,
  transitionExperiment,
} from "./experiments";
import { classifyEvidence, type ProtocolLock } from "./protocol";

test("registerExperiment gắn registeredAt và status = REGISTERED", () => {
  const now = () => new Date("2026-09-12T00:00:00Z");
  const record = registerExperiment(
    {
      experimentId: "exp-1",
      hypothesisId: "hyp-1",
      familyId: "family-1",
      strategyId: "HOT",
      strategyVersion: "2026-09-10.1",
      parameters: { lookback: 90 },
      seed: 645,
      datasetHash: "abc",
      protocolVersion: "2026-09-10.1",
      protocolHash: "def",
    },
    now,
  );
  assert.equal(record.status, "REGISTERED");
  assert.equal(record.registeredAt, "2026-09-12T00:00:00.000Z");
});

test("transitionExperiment chỉ đổi status, giữ nguyên các trường khác", () => {
  const now = () => new Date("2026-09-12T00:00:00Z");
  const registered = registerExperiment(
    {
      experimentId: "exp-1",
      hypothesisId: "hyp-1",
      familyId: "family-1",
      strategyId: "HOT",
      strategyVersion: "v1",
      parameters: {},
      seed: 1,
      datasetHash: "abc",
      protocolVersion: "v1",
      protocolHash: "def",
    },
    now,
  );
  const completed = transitionExperiment(registered, "COMPLETED");
  assert.equal(completed.status, "COMPLETED");
  assert.equal(completed.experimentId, registered.experimentId);
  assert.equal(completed.registeredAt, registered.registeredAt);
});

function syntheticDraws(n: number, seed: number): DrawRecord[] {
  const rng = createRng(seed);
  return Array.from({ length: n }, (_, i) => ({
    date: `2020-${String((Math.floor(i / 28) % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    id: String(i + 1).padStart(5, "0"),
    result: drawFairTicket(rng),
  }));
}

test("buildExperimentArtifactsFromReport tạo một artifact mỗi chiến lược không phải RANDOM, gắn đủ provenance", () => {
  const draws = syntheticDraws(400, 645);
  const report = runTemporalBacktestReport(draws, 90, 0.05);
  const artifacts = buildExperimentArtifactsFromReport({
    report,
    datasetSha256: "sha-abc",
    gitCommit: "commit-abc",
    seed: 645,
    experimentIdFor: (strategy) => `exp-${strategy}`,
    runtime: { startedAt: "2026-09-12T00:00:00.000Z", finishedAt: "2026-09-12T00:00:01.000Z" },
    protocolHash: "hash-abc",
  });

  assert.equal(artifacts.length, 3); // HOT, COLD, BALANCED
  assert.ok(artifacts.every((a) => a.strategy.id !== "RANDOM"));
  for (const artifact of artifacts) {
    assert.equal(artifact.datasetSha256, "sha-abc");
    assert.equal(artifact.gitCommit, "commit-abc");
    assert.equal(artifact.protocolHash, "hash-abc");
    assert.equal(artifact.seed, 645);
    assert.equal(artifact.runtime.durationMs, 1000);
    assert.ok(Array.isArray(artifact.statistics.confidenceInterval));
    assert.ok(artifact.temporalSplit.development.trials >= 0);
    assert.ok(artifact.temporalSplit.validation.trials >= 0);
    assert.ok(artifact.temporalSplit.test.trials >= 0);
  }
});

test("registry parse + idempotent lookup theo experimentId", () => {
  const line = JSON.stringify({
    experimentId: "exp-1",
    familyId: "family-1",
    status: "COMPLETED",
  });
  const records = parseExperimentRegistry(`${line}\n${line}\n`);
  assert.equal(records.length, 2);
  assert.equal(registryHasExperiment(records, "exp-1"), true);
  assert.equal(registryHasExperiment(records, "exp-missing"), false);
  assert.equal(countFamilyExperiments(records, "family-1"), 1);
  assert.equal(countFamilyExperiments(records, "other"), 0);
});

test("artifact gắn classifyEvidence từ protocol lock", () => {
  const draws = syntheticDraws(400, 645);
  const report = runTemporalBacktestReport(draws, 90, 0.05);
  const lock: ProtocolLock = {
    protocolVersion: "x",
    protocolHash: "x",
    protocolLockedAt: "2026-09-12T00:00:00Z",
    protocolDatasetHash: "x",
    prospectiveStartDrawId: "01562",
  };
  const artifacts = buildExperimentArtifactsFromReport({
    report,
    datasetSha256: "sha-abc",
    gitCommit: null,
    seed: 1,
    experimentIdFor: (strategy) => `exp-${strategy}`,
    runtime: { startedAt: "2026-09-12T00:00:00.000Z", finishedAt: "2026-09-12T00:00:01.000Z" },
    protocolHash: "hash-abc",
    protocolLock: lock,
    latestDrawId: "01561",
  });
  assert.equal(artifacts[0]?.controls.latestDrawEvidence, classifyEvidence("01561", lock));
  assert.equal(artifacts[0]?.controls.latestDrawEvidence, "RETROSPECTIVE");
  assert.equal(artifacts[0]?.controls.primaryEndpoint, "mean_matched_numbers_per_ticket");
});
