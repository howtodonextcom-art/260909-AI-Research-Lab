import assert from "node:assert/strict";
import test from "node:test";
import { runPortfolioSameBudgetMonteCarlo } from "./portfolio-mc";
import {
  buildPortfolioMcSummary,
  parsePortfolioMcSummary,
  PORTFOLIO_MC_HONEST_NOTE,
} from "./portfolio-mc-summary";

const FIXED_NOW = () => new Date("2026-01-01T00:00:00.000Z");

test("buildPortfolioMcSummary: one row per input result, fields carried through plus derived delta", () => {
  const results = [10, 20].map((n) => runPortfolioSameBudgetMonteCarlo(n, { simulationCount: 200, seed: 7 }));
  const summary = buildPortfolioMcSummary(results, { now: FIXED_NOW });

  assert.equal(summary.schemaVersion, 1);
  assert.equal(summary.generatedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(summary.honestNote, PORTFOLIO_MC_HONEST_NOTE);
  assert.equal(summary.rows.length, 2);

  for (const [i, row] of summary.rows.entries()) {
    const raw = results[i];
    assert.equal(row.ticketCount, raw.ticketCount);
    assert.equal(row.simulationCount, raw.simulationCount);
    assert.equal(row.seed, raw.seed);
    assert.equal(row.portfolioSeed, raw.portfolioSeed);
    assert.equal(row.projectiveMeanBestMatch, raw.projectiveMeanBestMatch);
    assert.equal(row.randomMeanBestMatch, raw.randomMeanBestMatch);
    assert.ok(Math.abs(row.meanBestMatchDelta - (raw.projectiveMeanBestMatch - raw.randomMeanBestMatch)) < 1e-12);
    assert.equal(row.projectiveHitAtLeast4Rate, raw.projectiveHitAtLeast4Rate);
    assert.equal(row.randomHitAtLeast4Rate, raw.randomHitAtLeast4Rate);
    assert.equal(row.projectiveHitAtLeast5Rate, raw.projectiveHitAtLeast5Rate);
    assert.equal(row.randomHitAtLeast5Rate, raw.randomHitAtLeast5Rate);
  }
});

test("parsePortfolioMcSummary: round-trips through JSON.stringify/JSON.parse", () => {
  const results = [10, 20, 30].map((n) => runPortfolioSameBudgetMonteCarlo(n, { simulationCount: 150, seed: 645 }));
  const summary = buildPortfolioMcSummary(results, { now: FIXED_NOW });
  const roundTripped = JSON.parse(JSON.stringify(summary));
  const parsed = parsePortfolioMcSummary(roundTripped);
  assert.ok(parsed);
  assert.deepEqual(parsed, summary);
});

test("parsePortfolioMcSummary: rejects null, non-objects, wrong schemaVersion, missing rows", () => {
  assert.equal(parsePortfolioMcSummary(null), null);
  assert.equal(parsePortfolioMcSummary("nope"), null);
  assert.equal(parsePortfolioMcSummary({}), null);
  assert.equal(parsePortfolioMcSummary({ schemaVersion: 2, generatedAt: "x", honestNote: "y", rows: [] }), null);
});

test("parsePortfolioMcSummary: rejects a row missing a required numeric field", () => {
  const results = [runPortfolioSameBudgetMonteCarlo(10, { simulationCount: 100, seed: 1 })];
  const summary = buildPortfolioMcSummary(results, { now: FIXED_NOW });
  const corrupted = JSON.parse(JSON.stringify(summary));
  delete corrupted.rows[0].seed;
  assert.equal(parsePortfolioMcSummary(corrupted), null);
});

test("honesty invariant: this diagnostic never fabricates a p-value/Q-statistic the underlying engine does not compute", () => {
  const results = [runPortfolioSameBudgetMonteCarlo(10, { simulationCount: 100, seed: 1 })];
  const summary = buildPortfolioMcSummary(results, { now: FIXED_NOW });
  const json = JSON.stringify(summary);
  assert.ok(!/pValue|qStatistic|predictiveEdge/i.test(json));
});

test("sanity: an empty results array yields an empty, still-valid summary", () => {
  const summary = buildPortfolioMcSummary([], { now: FIXED_NOW });
  assert.equal(summary.rows.length, 0);
  assert.ok(parsePortfolioMcSummary(summary));
});
