import assert from "node:assert/strict";
import test from "node:test";
import { PROTOCOL_VERSION } from "../analytics";
import { CURRENT_PROTOCOL, buildProtocolLock, canonicalProtocolJson, classifyEvidence, computeProtocolHash, nextDrawId, parseProtocolLock, type ProtocolLock } from "./protocol";

test("CURRENT_PROTOCOL.version khớp analytics.ts PROTOCOL_VERSION (giữ đồng bộ thủ công, §26)", () => {
  assert.equal(CURRENT_PROTOCOL.version, PROTOCOL_VERSION);
});

test("CURRENT_PROTOCOL.fairnessSimulationCount mặc định ≥ 2000", () => {
  assert.ok(CURRENT_PROTOCOL.fairnessSimulationCount >= 2000);
});

test("computeProtocolHash tái lập được và đổi khi bất kỳ trường nào đổi", async () => {
  const a = await computeProtocolHash(CURRENT_PROTOCOL);
  const b = await computeProtocolHash(CURRENT_PROTOCOL);
  assert.equal(a, b);
  assert.equal(a.length, 64);

  const changed = await computeProtocolHash({ ...CURRENT_PROTOCOL, alpha: 0.1 });
  assert.notEqual(a, changed);

  const changedLookback = await computeProtocolHash({ ...CURRENT_PROTOCOL, lookback: 60 });
  assert.notEqual(a, changedLookback);

  const changedStrategies = await computeProtocolHash({ ...CURRENT_PROTOCOL, strategies: [...CURRENT_PROTOCOL.strategies, "NEW"] });
  assert.notEqual(a, changedStrategies);
});

test("canonicalProtocolJson không phụ thuộc thứ tự khai báo field", () => {
  const a = canonicalProtocolJson(CURRENT_PROTOCOL);
  const reordered = {
    multipleTestingMethod: CURRENT_PROTOCOL.multipleTestingMethod,
    version: CURRENT_PROTOCOL.version,
    selectionRule: CURRENT_PROTOCOL.selectionRule,
    alpha: CURRENT_PROTOCOL.alpha,
    primaryEndpoint: CURRENT_PROTOCOL.primaryEndpoint,
    lookback: CURRENT_PROTOCOL.lookback,
    strategies: CURRENT_PROTOCOL.strategies,
    temporalSplitRule: CURRENT_PROTOCOL.temporalSplitRule,
    fairnessSimulationCount: CURRENT_PROTOCOL.fairnessSimulationCount,
  };
  const b = canonicalProtocolJson(reordered as typeof CURRENT_PROTOCOL);
  assert.equal(a, b);
});

test("classifyEvidence: chưa khoá prospectiveStartDrawId → luôn RETROSPECTIVE", () => {
  const lock: ProtocolLock = {
    protocolVersion: "x",
    protocolHash: "x",
    protocolLockedAt: "2026-01-01T00:00:00Z",
    protocolDatasetHash: "x",
    prospectiveStartDrawId: null,
  };
  assert.equal(classifyEvidence("01561", lock), "RETROSPECTIVE");
});

test("buildProtocolLock persist ranh giới prospective kế tiếp", async () => {
  const protocolHash = await computeProtocolHash(CURRENT_PROTOCOL);
  const lock = buildProtocolLock({
    protocolHash,
    lockedAt: "2026-09-12T00:00:00.000Z",
    datasetHash: "a".repeat(64),
    latestDrawId: "01561",
  });

  assert.equal(nextDrawId("01561"), "01562");
  assert.equal(lock.protocolVersion, CURRENT_PROTOCOL.version);
  assert.equal(lock.protocolHash, protocolHash);
  assert.equal(lock.protocolDatasetHash, "a".repeat(64));
  assert.equal(lock.prospectiveStartDrawId, "01562");
});

test("parseProtocolLock từ chối JSON thiếu trường bắt buộc", () => {
  assert.equal(parseProtocolLock(null), null);
  assert.equal(parseProtocolLock({ protocolVersion: "x" }), null);
});

test("classifyEvidence: kỳ trước mốc khoá là RETROSPECTIVE, từ mốc trở đi là PROSPECTIVE", () => {
  const lock: ProtocolLock = {
    protocolVersion: "x",
    protocolHash: "x",
    protocolLockedAt: "2026-09-12T00:00:00Z",
    protocolDatasetHash: "x",
    prospectiveStartDrawId: "01562",
  };
  assert.equal(classifyEvidence("01561", lock), "RETROSPECTIVE");
  assert.equal(classifyEvidence("01562", lock), "PROSPECTIVE");
  assert.equal(classifyEvidence("01600", lock), "PROSPECTIVE");
});

test("reports/protocol-lock.json khớp hash CURRENT_PROTOCOL hiện tại", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { join } = await import("node:path");
  const root = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
  const raw = JSON.parse(readFileSync(join(root, "reports/protocol-lock.json"), "utf8"));
  const lock = parseProtocolLock(raw);
  assert.ok(lock, "protocol-lock.json phải parse được");
  const current = await computeProtocolHash(CURRENT_PROTOCOL);
  assert.equal(lock!.protocolHash, current);
  assert.equal(lock!.protocolVersion, CURRENT_PROTOCOL.version);
});
