import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { hacBandwidth, runTemporalBacktestReport, type DrawRecord } from "../analytics";
import { MEGA_645 } from "../mega645";
import { createRng, drawFairTicket } from "./rng";
import {
  FALLBACK_HOLM_FAMILY_SIZE,
  buildExperimentArtifactsFromReport,
  buildExperimentFamilySummary,
  buildExperimentId,
  buildLegacyExperimentId,
  countFamilyExperiments,
  countFamilyHypotheses,
  countFamilyLooks,
  findExperimentIdProtocolHashConflict,
  parseExperimentFamilySummary,
  parseExperimentRegistry,
  primaryStrategyFamilyId,
  registerExperiment,
  registryHasExperiment,
  resolveHolmFamilySize,
  transitionExperiment,
  type ExperimentRecord,
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

test("parseExperimentRegistry: object rỗng hoặc thiếu field bắt buộc bị từ chối", () => {
  assert.throws(() => parseExperimentRegistry("{}"), /experimentId/);
  assert.throws(
    () =>
      parseExperimentRegistry(
        JSON.stringify({
          experimentId: "x",
          hypothesisId: "h",
          familyId: "f",
          strategyId: "HOT",
          strategyVersion: "v1",
          parameters: {},
          seed: 1,
          datasetHash: "d",
          protocolVersion: "v1",
          protocolHash: "p",
          registeredAt: "not-a-date",
          status: "COMPLETED",
        }),
      ),
    /registeredAt/,
  );
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
  const base = {
    experimentId: "exp-bad",
    hypothesisId: "HOT-vs-random",
    familyId: "family-1",
    strategyId: "HOT",
    strategyVersion: "v1",
    parameters: {},
    seed: 1,
    datasetHash: "d",
    protocolVersion: "v1",
    protocolHash: "p",
    registeredAt: "2026-09-12T00:00:00.000Z",
    status: "COMPLETED",
  };
  assert.throws(() => parseExperimentRegistry(JSON.stringify({ ...base, budgetTickets: "not a number" })), /budgetTickets/);
  assert.throws(() => parseExperimentRegistry(JSON.stringify({ ...base, predictionKind: "quantum" })), /predictionKind/);
  assert.throws(() => parseExperimentRegistry(JSON.stringify({ ...base, predictions: [1, 2, 3] })), /predictions/);
  assert.throws(() => parseExperimentRegistry(JSON.stringify({ ...base, preRegistered: "yes" })), /preRegistered/);
  assert.throws(() => parseExperimentRegistry(JSON.stringify({ ...base, rankingScoreVersion: 123 })), /rankingScoreVersion/);
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

// --- Pre-registration fields wired into scripts/run-experiment.ts's writes (§B4) ---

test("registerExperiment: một bản ghi mới đăng ký (giống scripts/run-experiment.ts) có đủ 8 trường pre-registration với giá trị hợp lý", () => {
  const now = () => new Date("2026-09-13T00:00:00Z");
  const record = registerExperiment(
    {
      experimentId: "protocol-x-hot-abcdef01",
      hypothesisId: "HOT-vs-random",
      familyId: "protocol-x-primary-strategies",
      strategyId: "HOT",
      strategyVersion: "2026-09-10.1",
      parameters: { lookback: 90 },
      seed: 645,
      datasetHash: "abcdef0123456789",
      protocolVersion: "2026-09-10.1",
      protocolHash: "protocolhash",
      budgetTickets: 1,
      budgetVnd: MEGA_645.ticketPrice,
      predictionKind: "single_ticket",
      predictions: ["06", "16", "22", "31", "36", "44"],
      preRegistered: false,
      dataCutoffDrawId: "01561",
      dataCutoffDate: "2026-09-11",
      rankingScoreVersion: null,
    },
    now,
  );

  assert.equal(record.budgetTickets, 1);
  assert.equal(record.budgetVnd, 10_000);
  assert.equal(record.predictionKind, "single_ticket");
  assert.deepEqual(record.predictions, ["06", "16", "22", "31", "36", "44"]);
  // Honest, not an oversight: registered against already-known data, so this
  // is a retrospective registration, never a pre-registered bet.
  assert.equal(record.preRegistered, false);
  assert.equal(record.dataCutoffDrawId, "01561");
  assert.equal(record.dataCutoffDate, "2026-09-11");
  assert.equal(record.rankingScoreVersion, null);

  // Must also round-trip through the same fail-closed parser the registry file uses.
  const line = JSON.stringify(record);
  const parsed = parseExperimentRegistry(line);
  assert.equal(parsed.length, 1);
  assert.deepEqual(parsed[0], record);
});

test("registerExperiment: predictions bị bỏ trống (không set) vẫn là một registration hợp lệ — không bịa giá trị khi không có dữ liệu", () => {
  const now = () => new Date("2026-09-13T00:00:00Z");
  const record = registerExperiment(
    {
      experimentId: "protocol-x-cold-abcdef01",
      hypothesisId: "COLD-vs-random",
      familyId: "protocol-x-primary-strategies",
      strategyId: "COLD",
      strategyVersion: "2026-09-10.1",
      parameters: { lookback: 90 },
      seed: 645,
      datasetHash: "abcdef0123456789",
      protocolVersion: "2026-09-10.1",
      protocolHash: "protocolhash",
      budgetTickets: 1,
      budgetVnd: MEGA_645.ticketPrice,
      predictionKind: "single_ticket",
      preRegistered: false,
      rankingScoreVersion: null,
    },
    now,
  );
  assert.equal(record.predictions, undefined);
  assert.equal(record.dataCutoffDrawId, undefined);
  const parsed = parseExperimentRegistry(JSON.stringify(record));
  assert.equal(parsed.length, 1);
});

// --- buildExperimentId / findExperimentIdProtocolHashConflict (§GAP-02, Round 5) ---

test("buildExperimentId: cùng familyId/strategy/datasetHash nhưng protocolHash khác nhau -> id khác nhau (không còn va chạm định danh)", () => {
  const familyId = primaryStrategyFamilyId("2026-09-10.1");
  const datasetHash = "aaaaaaaa11112222"; // shared 16-char dataset hash for both
  const idA = buildExperimentId(familyId, "HOT", datasetHash, "hash-aaaa-first");
  const idB = buildExperimentId(familyId, "HOT", datasetHash, "hash-bbbb-second");
  assert.notEqual(idA, idB);
  // Both still carry the same familyId/strategy/datasetHash-prefix segment —
  // only the trailing protocolHash-prefix segment differs.
  const sharedPrefix = `${familyId}-hot-${datasetHash.slice(0, 8)}-`;
  assert.ok(idA.startsWith(sharedPrefix));
  assert.ok(idB.startsWith(sharedPrefix));
  assert.equal(idA.slice(sharedPrefix.length), "hash-aaa");
  assert.equal(idB.slice(sharedPrefix.length), "hash-bbb");
});

test("buildExperimentId: cùng protocolHash -> id ổn định, idempotent (re-run không đổi id)", () => {
  const familyId = primaryStrategyFamilyId("2026-09-10.1");
  const idA = buildExperimentId(familyId, "COLD", "aaaaaaaaZZZZ", "hashvalue00000000");
  const idB = buildExperimentId(familyId, "COLD", "aaaaaaaaZZZZ", "hashvalue00000000");
  assert.equal(idA, idB);
});

test("findExperimentIdProtocolHashConflict: id mới hoàn toàn -> không có xung đột", () => {
  const records: ExperimentRecord[] = [];
  assert.equal(findExperimentIdProtocolHashConflict(records, "exp-new", "hash-a"), null);
});

test("findExperimentIdProtocolHashConflict: id trùng và protocolHash trùng -> không có xung đột (re-run bình thường)", () => {
  const records = [
    {
      experimentId: "exp-1",
      hypothesisId: "HOT-vs-random",
      familyId: "family-1",
      strategyId: "HOT",
      strategyVersion: "v1",
      parameters: {},
      seed: 1,
      datasetHash: "d",
      protocolVersion: "v1",
      protocolHash: "hash-a",
      registeredAt: "2026-09-12T00:00:00.000Z",
      status: "COMPLETED",
    } as ExperimentRecord,
  ];
  assert.equal(findExperimentIdProtocolHashConflict(records, "exp-1", "hash-a"), null);
});

test("findExperimentIdProtocolHashConflict: id trùng nhưng protocolHash KHÁC -> trả về bản ghi xung đột (xung đột định danh)", () => {
  const conflicting: ExperimentRecord = {
    experimentId: "exp-1",
    hypothesisId: "HOT-vs-random",
    familyId: "family-1",
    strategyId: "HOT",
    strategyVersion: "v1",
    parameters: {},
    seed: 1,
    datasetHash: "d",
    protocolVersion: "v1",
    protocolHash: "hash-a",
    registeredAt: "2026-09-12T00:00:00.000Z",
    status: "COMPLETED",
  };
  const conflict = findExperimentIdProtocolHashConflict([conflicting], "exp-1", "hash-b-different");
  assert.notEqual(conflict, null);
  assert.equal(conflict?.protocolHash, "hash-a");
  assert.equal(conflict?.experimentId, "exp-1");
});

test("buildLegacyExperimentId: khớp CHÍNH XÁC 3 id thật đã commit trong registry.jsonl (scheme cũ, không có hậu tố protocolHash)", () => {
  const familyId = primaryStrategyFamilyId("2026-09-10.1");
  const datasetHash = "8e26f348a8b241865facc7cfe690fbc428615b9b45ffc9732709a6267039c24e";
  assert.equal(buildLegacyExperimentId(familyId, "HOT", datasetHash), "protocol-2026-09-10.1-primary-strategies-hot-8e26f348");
  assert.equal(buildLegacyExperimentId(familyId, "COLD", datasetHash), "protocol-2026-09-10.1-primary-strategies-cold-8e26f348");
  assert.equal(buildLegacyExperimentId(familyId, "BALANCED", datasetHash), "protocol-2026-09-10.1-primary-strategies-balanced-8e26f348");
});

test("scripts/run-experiment.ts vẫn no-op cho 3 chiến lược thật đã đăng ký: legacy id trùng registry thật, dù protocolHash hiện tại khác protocolHash lúc đăng ký", async () => {
  // Regression guard for the exact real-world scenario Round 5 hit live: the
  // registry's 3 real rows were registered under protocolHash 089e16b90b1d…
  // but CURRENT_PROTOCOL now computes 9b864bec07e3… (documented protocol
  // drift, reports/26-09-13-16-40-research-provenance-integrity.md). Naively
  // checking only the new (hash-bound) experimentId would treat these as
  // brand-new and double-register them. `buildLegacyExperimentId` must
  // still match the real committed ids so run-experiment.ts's skip-check
  // fires before any new-scheme registration is attempted.
  const registryPath = fileURLToPath(new URL("../../reports/experiments/registry.jsonl", import.meta.url));
  const text = await readFile(registryPath, "utf8");
  const records = parseExperimentRegistry(text);
  const familyId = primaryStrategyFamilyId("2026-09-10.1");
  for (const record of records) {
    const legacyId = buildLegacyExperimentId(familyId, record.strategyId, record.datasetHash);
    assert.equal(legacyId, record.experimentId, `legacy id phải khớp experimentId thật đã commit: ${record.experimentId}`);
    assert.equal(registryHasExperiment(records, legacyId), true);
    // The NEW scheme id (bound to whatever protocolHash is live today) is
    // deliberately a DIFFERENT string — proving the skip must be driven by
    // the legacy check, not by registryHasExperiment on the new id.
    const newSchemeIdWithCurrentHash = buildExperimentId(familyId, record.strategyId, record.datasetHash, "9b864bec07e355e042029cff3553716ba454e89b01d0860773ea47de772dfe52");
    assert.notEqual(newSchemeIdWithCurrentHash, record.experimentId);
  }
});

test("registry.jsonl thật (3 dòng đã commit) vẫn parse nguyên vẹn, không bị các trường mới ép buộc", async () => {
  const registryPath = fileURLToPath(new URL("../../reports/experiments/registry.jsonl", import.meta.url));
  const text = await readFile(registryPath, "utf8");
  const records = parseExperimentRegistry(text);
  assert.equal(records.length, 3);
  for (const record of records) {
    // These 3 lines predate the pre-registration fields — must still be undefined, not backfilled or coerced.
    assert.equal(record.budgetTickets, undefined);
    assert.equal(record.budgetVnd, undefined);
    assert.equal(record.predictionKind, undefined);
    assert.equal(record.predictions, undefined);
    assert.equal(record.preRegistered, undefined);
    assert.equal(record.dataCutoffDrawId, undefined);
    assert.equal(record.dataCutoffDate, undefined);
    assert.equal(record.rankingScoreVersion, undefined);
    assert.equal(record.status, "COMPLETED");
  }
});
