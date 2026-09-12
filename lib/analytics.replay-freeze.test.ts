/**
 * Golden-drift guard for `scripts/audit-replay-2026-09-11.ts`.
 *
 * That script is a frozen, already-run historical replay: it locked history
 * to draws strictly before 2026-09-11 (cutoff #01560), computed one ticket
 * per strategy from the trailing 90-draw window via `createStrategyPick`,
 * then scored those tickets against the real draw #01561 — all recorded in
 * `reports/audit-replay-2026-09-11.json`. That JSON file is not re-run here;
 * it is treated as ground truth ("golden") and this test reproduces the same
 * computation from the same bundled dataset and asserts byte-for-byte
 * agreement.
 *
 * The point: if `createStrategyPick`'s internal logic — or the temporal
 * freeze rule itself — ever changes in a way that silently changes what this
 * specific historical replay would have produced, this test fails loudly
 * instead of the drift going unnoticed. `protocolHash`/`algorithmVersion`
 * are pinned too, so a protocol bump that forgets to regenerate this golden
 * artifact is caught as well.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createStrategyPick, PROTOCOL_VERSION, type DrawRecord, type StrategyId } from "./analytics.ts";
import { evaluateTicket, formatBall } from "./mega645.ts";
import { parseDrawsJsonl } from "./data/jsonl.ts";
import { sha256Hex } from "./data/hash.ts";
import { CURRENT_PROTOCOL, computeProtocolHash } from "./research/protocol.ts";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
// The committed artifact carries a leading UTF-8 BOM; strip it before parsing
// (JSON.parse rejects a BOM outright).
const goldenText = readFileSync(path.join(root, "reports/audit-replay-2026-09-11.json"), "utf8").replace(/^﻿/, "");
const golden = JSON.parse(goldenText) as {
  t0: {
    cutoffDrawId: string;
    cutoffDrawDate: string;
    historyCount: number;
    datasetHashFrozenHistory: string;
    algorithmVersion: string;
    protocolHash: string;
    seed: number;
    lookback: number;
  };
  frozenTickets: Record<string, string>;
  official: { id: string; date: string; result: number[] };
  strategyScores: Array<{ strategy: string; ticket: string; matches: number; tier: string }>;
};

const TARGET_DATE = "2026-09-11";
const TARGET_ID = "01561";
const STRATEGIES: StrategyId[] = ["HOT", "COLD", "BALANCED", "RANDOM"];

function loadAllDraws(): DrawRecord[] {
  const text = readFileSync(path.join(root, "public/data/power645.jsonl"), "utf8");
  const parsed = parseDrawsJsonl(text);
  assert.equal(parsed.issues.length, 0, "bundled snapshot phải parse sạch, không lỗi");
  return parsed.records;
}

test("golden freeze #01561: mốc cắt lịch sử tái lập đúng #01560 / 2026-09-09", () => {
  const allDraws = loadAllDraws();
  const history = allDraws.filter((d) => d.date < TARGET_DATE);
  const cutoff = history.at(-1);
  assert.equal(cutoff?.id, golden.t0.cutoffDrawId);
  assert.equal(cutoff?.id, "01560");
  assert.equal(cutoff?.date, golden.t0.cutoffDrawDate);
  assert.equal(cutoff?.date, "2026-09-09");
  assert.equal(history.length, golden.t0.historyCount);
  assert.ok(!history.some((d) => d.id === TARGET_ID), "history không được rò rỉ kỳ mục tiêu");
});

test("golden freeze #01561: datasetHash của lịch sử đóng băng khớp bản ghi gốc", async () => {
  const allDraws = loadAllDraws();
  const history = allDraws.filter((d) => d.date < TARGET_DATE);
  const payload = JSON.stringify(history.map((d) => ({ date: d.date, id: d.id, result: d.result })));
  const hash = await sha256Hex(payload);
  assert.equal(hash, golden.t0.datasetHashFrozenHistory);
});

test("golden freeze #01561: protocolVersion/protocolHash được ghim, phát hiện âm thầm nâng version", async () => {
  assert.equal(PROTOCOL_VERSION, golden.t0.algorithmVersion);
  assert.equal(CURRENT_PROTOCOL.version, golden.t0.algorithmVersion);
  const hash = await computeProtocolHash(CURRENT_PROTOCOL);
  assert.equal(hash, golden.t0.protocolHash);
});

test("golden freeze #01561: vé đóng băng mỗi chiến lược khớp CHÍNH XÁC ticket đã ghi (chống trôi thuật toán)", () => {
  const allDraws = loadAllDraws();
  const history = allDraws.filter((d) => d.date < TARGET_DATE);
  const window = history.slice(-golden.t0.lookback);
  assert.equal(window.length, golden.t0.lookback);

  for (const strategy of STRATEGIES) {
    const ticket = createStrategyPick(window, strategy, golden.t0.seed);
    const goldenTicket = golden.frozenTickets[strategy].split(" ").map((n) => Number(n));
    assert.deepEqual(
      ticket,
      goldenTicket,
      `Vé ${strategy} phải khớp golden (createStrategyPick đã đổi hành vi trên dữ liệu lịch sử thật?)`,
    );
    assert.equal(ticket.map(formatBall).join(" "), golden.frozenTickets[strategy]);
  }
});

test("golden freeze #01561: điểm số so với kết quả thật #01561 tái lập đúng matches/tier đã ghi", () => {
  const allDraws = loadAllDraws();
  const target = allDraws.find((d) => d.id === TARGET_ID);
  assert.ok(target);
  assert.equal(target?.date, TARGET_DATE);
  assert.deepEqual(target?.result, golden.official.result);
  assert.deepEqual(target?.result, [14, 18, 20, 21, 26, 27]);

  const history = allDraws.filter((d) => d.date < TARGET_DATE);
  const window = history.slice(-golden.t0.lookback);

  for (const strategy of STRATEGIES) {
    const ticket = createStrategyPick(window, strategy, golden.t0.seed);
    const scored = evaluateTicket(ticket, target!.result);
    const goldenScore = golden.strategyScores.find((s) => s.strategy === strategy);
    assert.ok(goldenScore, `thiếu golden score cho ${strategy}`);
    assert.equal(scored.matches, goldenScore!.matches);
    assert.equal(scored.tier, goldenScore!.tier);
    assert.equal(ticket.map(formatBall).join(" "), goldenScore!.ticket);
  }
});
