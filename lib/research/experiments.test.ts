import assert from "node:assert/strict";
import test from "node:test";
import { hacBandwidth, runTemporalBacktestReport, type DrawRecord } from "../analytics";
import { createRng, drawFairTicket } from "./rng";
import {
  FALLBACK_HOLM_FAMILY_SIZE,
  buildExperimentArtifactsFromReport,
  buildExperimentFamilySummary,
  countFamilyExperiments,
  countFamilyHypotheses,
  countFamilyLooks,
  parseExperimentFamilySummary,
  parseExperimentRegistry,
  primaryStrategyFamilyId,
  registerExperiment,
  registryHasExperiment,
  resolveHolmFamilySize,
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

test("buildExperimentArtifactsFromReport ghim varianceMethod/hacLag/familySize/lookCount/spentAlpha từ report, không tính lại", () => {
  const draws = syntheticDraws(400, 645);
  const familySize = 5; // deliberately different from the visible 3, to prove it's threaded through, not recomputed
  const lookCount = 2;
  const report = runTemporalBacktestReport(draws, 90, 0.05, familySize, lookCount);
  const artifacts = buildExperimentArtifactsFromReport({
    report,
    datasetSha256: "sha-abc",
    gitCommit: "commit-abc",
    seed: 645,
    experimentIdFor: (strategy) => `exp-${strategy}`,
    runtime: { startedAt: "2026-09-12T00:00:00.000Z", finishedAt: "2026-09-12T00:00:01.000Z" },
    protocolHash: "hash-abc",
  });

  assert.ok(artifacts.length > 0);
  for (const artifact of artifacts) {
    assert.equal(artifact.statistics.varianceMethod, "newey-west-hac");
    assert.equal(artifact.statistics.varianceMethod, report.varianceMethod);
    const testTrials = artifact.temporalSplit.test.trials;
    const expectedLag = testTrials > 0 ? hacBandwidth(testTrials, report.lookback) : null;
    assert.equal(artifact.statistics.hacLag, expectedLag);
    assert.equal(artifact.controls.familySize, familySize);
    assert.equal(artifact.controls.familySize, report.familySize);
    assert.equal(artifact.controls.lookCount, lookCount);
    assert.equal(artifact.controls.nominalAlpha, 0.05);
    assert.equal(artifact.controls.spentAlpha, report.alpha);
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

test("parseExperimentRegistry: dòng kiểu cũ không có trường pre-registration vẫn parse bình thường", () => {
  const line = JSON.stringify({
    experimentId: "exp-old",
    hypothesisId: "HOT-vs-random",
    familyId: "family-1",
    strategyId: "HOT",
    strategyVersion: "v1",
    parameters: { lookback: 90 },
    seed: 645,
    datasetHash: "abc",
    protocolVersion: "v1",
    protocolHash: "def",
    registeredAt: "2026-09-12T00:00:00.000Z",
    status: "COMPLETED",
  });
  const records = parseExperimentRegistry(line);
  assert.equal(records.length, 1);
  assert.equal(records[0].budgetTickets, undefined);
  assert.equal(records[0].preRegistered, undefined);
});

test("parseExperimentRegistry: dòng kiểu mới với trường pre-registration hợp lệ parse và round-trip đúng", () => {
  const record = {
    experimentId: "exp-new",
    hypothesisId: "HOT-vs-random",
    familyId: "family-1",
    strategyId: "HOT",
    strategyVersion: "v1",
    parameters: { lookback: 90 },
    seed: 645,
    datasetHash: "abc",
    protocolVersion: "v1",
    protocolHash: "def",
    registeredAt: "2026-09-12T00:00:00.000Z",
    status: "REGISTERED",
    budgetTickets: 30,
    budgetVnd: 300000,
    predictionKind: "portfolio",
    predictions: ["01 02 03 04 05 06", "02 03 04 05 06 07"],
    preRegistered: true,
    dataCutoffDrawId: "01561",
    dataCutoffDate: "2026-09-11",
    rankingScoreVersion: null,
  };
  const records = parseExperimentRegistry(JSON.stringify(record));
  assert.equal(records.length, 1);
  assert.deepEqual(records[0], record);
});

test("parseExperimentRegistry: trường pre-registration sai kiểu bị từ chối rõ ràng, không âm thầm chấp nhận hay rơi rớt", () => {
  const badBudget = JSON.stringify({ experimentId: "exp-bad", familyId: "family-1", budgetTickets: "not a number" });
  assert.throws(() => parseExperimentRegistry(badBudget), /budgetTickets/);

  const badKind = JSON.stringify({ experimentId: "exp-bad-2", familyId: "family-1", predictionKind: "quantum" });
  assert.throws(() => parseExperimentRegistry(badKind), /predictionKind/);

  const badPredictions = JSON.stringify({ experimentId: "exp-bad-3", familyId: "family-1", predictions: [1, 2, 3] });
  assert.throws(() => parseExperimentRegistry(badPredictions), /predictions/);

  const badPreRegistered = JSON.stringify({ experimentId: "exp-bad-4", familyId: "family-1", preRegistered: "yes" });
  assert.throws(() => parseExperimentRegistry(badPreRegistered), /preRegistered/);

  const badRankingVersion = JSON.stringify({ experimentId: "exp-bad-5", familyId: "family-1", rankingScoreVersion: 123 });
  assert.throws(() => parseExperimentRegistry(badRankingVersion), /rankingScoreVersion/);
});

test("resolveHolmFamilySize đếm giả thuyết, không đếm experimentId", () => {
  const familyId = primaryStrategyFamilyId("2026-09-10.1");
  assert.equal(familyId, "protocol-2026-09-10.1-primary-strategies");
  assert.equal(resolveHolmFamilySize([], familyId), FALLBACK_HOLM_FAMILY_SIZE);
  const grown = [
    { experimentId: "a", familyId },
    { experimentId: "b", familyId },
    { experimentId: "c", familyId },
    { experimentId: "d", familyId },
  ] as never;
  assert.equal(countFamilyExperiments(grown, familyId), 4);
  assert.equal(resolveHolmFamilySize(grown, familyId), FALLBACK_HOLM_FAMILY_SIZE);
  assert.equal(parseExperimentFamilySummary(null), null);
  assert.equal(parseExperimentFamilySummary({ familyId, familySize: 4, fallbackFamilySize: 3 }), null);
});

test("cùng 3 giả thuyết, 2 datasetHash → Holm familySize = 3, lookCount = 2", () => {
  const familyId = primaryStrategyFamilyId("2026-09-10.1");
  const look = (experimentId: string, hypothesisId: string, datasetHash: string) =>
    ({
      experimentId,
      hypothesisId,
      familyId,
      strategyId: hypothesisId.split("-")[0],
      datasetHash,
    }) as never;
  const twoLooks = [
    look("exp-hot-aaa", "HOT-vs-random", "hash-aaa"),
    look("exp-cold-aaa", "COLD-vs-random", "hash-aaa"),
    look("exp-bal-aaa", "BALANCED-vs-random", "hash-aaa"),
    look("exp-hot-bbb", "HOT-vs-random", "hash-bbb"),
    look("exp-cold-bbb", "COLD-vs-random", "hash-bbb"),
    look("exp-bal-bbb", "BALANCED-vs-random", "hash-bbb"),
  ];
  assert.equal(countFamilyExperiments(twoLooks, familyId), 6);
  assert.equal(countFamilyHypotheses(twoLooks, familyId), 3);
  assert.equal(countFamilyLooks(twoLooks, familyId), 2);
  assert.equal(resolveHolmFamilySize(twoLooks, familyId), 3);
  const summary = buildExperimentFamilySummary(twoLooks, familyId);
  assert.equal(summary.familySize, 3);
  assert.equal(summary.hypothesisCount, 3);
  assert.equal(summary.lookCount, 2);
  assert.equal(parseExperimentFamilySummary({ familyId, familySize: 3, fallbackFamilySize: 3 }), null);
  assert.deepEqual(
    parseExperimentFamilySummary({
      familyId,
      familySize: 3,
      hypothesisCount: 3,
      lookCount: 2,
      fallbackFamilySize: 3,
    }),
    summary,
  );
  assert.equal(
    parseExperimentFamilySummary({
      familyId,
      familySize: 6,
      hypothesisCount: 3,
      lookCount: 2,
      fallbackFamilySize: 3,
    }),
    null,
  );
});

test("public/data/experiment-family.json khớp hypothesisCount/lookCount trên registry", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { join } = await import("node:path");
  const root = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
  const records = parseExperimentRegistry(readFileSync(join(root, "reports/experiments/registry.jsonl"), "utf8"));
  const familyId = primaryStrategyFamilyId("2026-09-10.1");
  const expected = buildExperimentFamilySummary(records, familyId);
  const published = parseExperimentFamilySummary(JSON.parse(readFileSync(join(root, "public/data/experiment-family.json"), "utf8")));
  assert.deepEqual(published, expected);
  assert.equal(published?.hypothesisCount, 3);
  assert.equal(published?.lookCount, 1);
  assert.equal(published?.familySize, published?.hypothesisCount);
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
