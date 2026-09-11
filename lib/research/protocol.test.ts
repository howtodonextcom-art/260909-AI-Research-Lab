import assert from "node:assert/strict";
import test from "node:test";
import { PROTOCOL_VERSION } from "../analytics";
import { CURRENT_PROTOCOL, canonicalProtocolJson, classifyEvidence, computeProtocolHash, type ProtocolLock } from "./protocol";

test("CURRENT_PROTOCOL.version khớp analytics.ts PROTOCOL_VERSION (giữ đồng bộ thủ công, §26)", () => {
  assert.equal(CURRENT_PROTOCOL.version, PROTOCOL_VERSION);
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
