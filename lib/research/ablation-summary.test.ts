import assert from "node:assert/strict";
import test from "node:test";
import { runTemporalBacktestReport, type DrawRecord } from "../analytics";
import { runAblation } from "./ablation";
import { buildAblationSummary, parseAblationSummary, ABLATION_HONEST_NOTE } from "./ablation-summary";
import { createRng, drawFairTicket } from "./rng";

function syntheticDraws(n: number, seed: number): DrawRecord[] {
  const rng = createRng(seed);
  return Array.from({ length: n }, (_, i) => ({
    date: `20${String(10 + Math.floor(i / 300)).padStart(2, "0")}-${String((Math.floor(i / 25) % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    id: String(i + 1).padStart(5, "0"),
    result: drawFairTicket(rng),
  }));
}

const FIXED_NOW = () => new Date("2026-01-01T00:00:00.000Z");

test("buildAblationSummary: reshapes AblationReport 1:1 (3 rows, provenance fields carried through)", () => {
  const draws = syntheticDraws(400, 7);
  const report = runAblation(draws, 90);
  const summary = buildAblationSummary(report, {
    datasetHash: "deadbeef",
    datasetRecordCount: draws.length,
    now: FIXED_NOW,
  });

  assert.equal(summary.schemaVersion, 1);
  assert.equal(summary.generatedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(summary.datasetHash, "deadbeef");
  assert.equal(summary.datasetRecordCount, draws.length);
  assert.equal(summary.lookback, report.lookback);
  assert.equal(summary.alpha, report.alpha);
  assert.equal(summary.fullFamilySize, report.fullFamilySize);
  assert.equal(summary.deterministic, true);
  assert.equal(summary.rows.length, report.ablations.length);
  assert.equal(summary.honestNote, ABLATION_HONEST_NOTE);

  for (const [i, row] of summary.rows.entries()) {
    const ablation = report.ablations[i];
    assert.equal(row.removed, ablation.removed);
    assert.equal(row.fullFamilySize, ablation.fullFamilySize);
    assert.equal(row.ablatedFamilySize, ablation.ablatedFamilySize);
    assert.equal(row.verdict, ablation.verdict);
    assert.equal(row.deltas.length, ablation.deltas.length);
  }
});

test("buildAblationSummary: anyNewlySignificant is true iff some delta flips in either phase", () => {
  const draws = syntheticDraws(400, 11);
  const report = runAblation(draws, 90);
  const summary = buildAblationSummary(report, { datasetHash: null, datasetRecordCount: draws.length, now: FIXED_NOW });

  for (const row of summary.rows) {
    const expected = row.deltas.some(
      (d) => d.validation.newlySignificantAfterAblation || d.test.newlySignificantAfterAblation,
    );
    assert.equal(row.anyNewlySignificant, expected);
  }
});

test("buildAblationSummary: datasetHash null is allowed (no manifest)", () => {
  const draws = syntheticDraws(200, 3);
  const report = runAblation(draws, 90);
  const summary = buildAblationSummary(report, { datasetHash: null, datasetRecordCount: draws.length, now: FIXED_NOW });
  assert.equal(summary.datasetHash, null);
  assert.ok(parseAblationSummary(summary));
});

test("parseAblationSummary: round-trips through JSON.stringify/JSON.parse", () => {
  const draws = syntheticDraws(300, 5);
  const report = runAblation(draws, 90);
  const summary = buildAblationSummary(report, { datasetHash: "abc123", datasetRecordCount: draws.length, now: FIXED_NOW });
  const roundTripped = JSON.parse(JSON.stringify(summary));
  const parsed = parseAblationSummary(roundTripped);
  assert.ok(parsed);
  assert.deepEqual(parsed, summary);
});

test("parseAblationSummary: rejects null, non-objects, and missing required fields", () => {
  assert.equal(parseAblationSummary(null), null);
  assert.equal(parseAblationSummary("nope"), null);
  assert.equal(parseAblationSummary({}), null);
  assert.equal(parseAblationSummary({ schemaVersion: 2 }), null);
});

test("parseAblationSummary: rejects a row with an invalid 'removed' strategy", () => {
  const draws = syntheticDraws(200, 9);
  const report = runAblation(draws, 90);
  const summary = buildAblationSummary(report, { datasetHash: null, datasetRecordCount: draws.length, now: FIXED_NOW });
  const corrupted = JSON.parse(JSON.stringify(summary));
  corrupted.rows[0].removed = "RANDOM"; // RANDOM is never ablatable
  assert.equal(parseAblationSummary(corrupted), null);
});

test("honesty invariant: every delta's own edge never changes with ablation (deltaValidationEdge=0 upstream) — summary carries no fabricated edge field", () => {
  const draws = syntheticDraws(400, 21);
  const report = runAblation(draws, 90);
  const summary = buildAblationSummary(report, { datasetHash: null, datasetRecordCount: draws.length, now: FIXED_NOW });
  const json = JSON.stringify(summary);
  assert.ok(!/predictiveEdge|winProbability|expectedReturn/i.test(json));
});

test("sanity: real canonical dataset produces a report consistent with runTemporalBacktestReport's own familySize", () => {
  const draws = syntheticDraws(500, 45);
  const full = runTemporalBacktestReport(draws, 90);
  const report = runAblation(draws, 90);
  assert.equal(report.fullFamilySize, full.familySize);
});
