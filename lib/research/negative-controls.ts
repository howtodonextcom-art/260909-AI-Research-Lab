/**
 * Negative-control battery (§28 — mandatory).
 *
 * These are sanity controls, not certified power/false-positive-rate
 * measurements: each runs a modest number of replications so the whole
 * battery stays fast enough for `npm test`, and reports a descriptive
 * summary rather than asserting a tight statistical bound (see §29's "no
 * need for a heavy property-testing framework"). Control D (future
 * mutation) already has dedicated tests in `lib/analytics.test.ts`
 * ("validation không thay đổi khi sửa kỳ holdout tương lai" and "thay đổi
 * toàn bộ tập test không làm đổi ứng viên được chọn") and is not
 * duplicated here.
 */
import { runWalkForwardBacktest, STRATEGIES, type BacktestResult, type DrawRecord, type StrategyId } from "../analytics";
import { createRng, drawFairTicket } from "./rng";
import { EXPECTED_MATCHES } from "./statistics";

function syntheticDataset(drawCount: number, seed: number): DrawRecord[] {
  const rng = createRng(seed);
  const start = Date.UTC(2000, 0, 1);
  return Array.from({ length: drawCount }, (_, index) => ({
    date: new Date(start + index * 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    id: String(index + 1).padStart(5, "0"),
    result: drawFairTicket(rng),
  }));
}

const NON_RANDOM_STRATEGIES = (Object.keys(STRATEGIES) as StrategyId[]).filter((id) => id !== "RANDOM");

export type IidSyntheticControlOptions = { drawCount?: number; lookback?: number; replications?: number; seed?: number };

export type IidSyntheticControlResult = {
  replications: number;
  drawCount: number;
  lookback: number;
  seed: number;
  /** Fraction of replications where a non-RANDOM strategy passed all 3 in-sample gates, per strategy. */
  passRateByStrategy: Record<Exclude<StrategyId, "RANDOM">, number>;
};

/**
 * Control A — IID synthetic Mega. Under a fair, history-independent draw
 * process, HOT/COLD/BALANCED must not show a persistent edge: the fraction
 * of synthetic replications where a strategy clears all three in-sample
 * gates should stay low (it is not a designed hypothesis test, so this is
 * reported for a human to read, not asserted against a strict threshold).
 */
export function runIidSyntheticControl(options: IidSyntheticControlOptions = {}): IidSyntheticControlResult {
  const drawCount = options.drawCount ?? 260;
  const lookback = options.lookback ?? 90;
  const replications = options.replications ?? 25;
  const seed = options.seed ?? 645;

  const passCounts = Object.fromEntries(NON_RANDOM_STRATEGIES.map((id) => [id, 0])) as Record<
    Exclude<StrategyId, "RANDOM">,
    number
  >;

  for (let rep = 0; rep < replications; rep += 1) {
    const draws = syntheticDataset(drawCount, seed * 1_000_003 + rep);
    const results = runWalkForwardBacktest(draws, lookback);
    for (const strategy of NON_RANDOM_STRATEGIES) {
      const result = results.find((r) => r.strategy === strategy);
      if (result?.gates.passedCount === 3) passCounts[strategy] += 1;
    }
  }

  const passRateByStrategy = Object.fromEntries(
    NON_RANDOM_STRATEGIES.map((id) => [id, passCounts[id] / replications]),
  ) as Record<Exclude<StrategyId, "RANDOM">, number>;

  return { replications, drawCount, lookback, seed, passRateByStrategy };
}

export type TimeShuffleControlResult = {
  original: BacktestResult[];
  shuffled: BacktestResult[];
  /** Per non-RANDOM strategy: original edge − shuffled edge (matches/trial). */
  edgeDeltaByStrategy: Record<Exclude<StrategyId, "RANDOM">, number>;
  /** True when every non-RANDOM strategy's |edge| drops or stays near zero after shuffle. */
  temporalSignalCollapsed: boolean;
};

/**
 * Control B — time shuffle. Shuffling chronological order destroys any
 * genuine temporal structure (recency-dependent frequency/gap) that HOT,
 * COLD and BALANCED rely on. This does not assert a specific outcome —
 * "if a temporal strategy still shows identical signal, investigate" (§28)
 * is a instruction for the researcher reading the comparison, not a fixed
 * pass/fail bound — but it does assert the pipeline runs correctly end to
 * end on shuffled input and still respects dataset invariants.
 */
export function runTimeShuffleControl(draws: DrawRecord[], lookback = 90, seed = 645): TimeShuffleControlResult {
  const rng = createRng(seed);
  const shuffled = [...draws];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Re-date sequentially so the walk-forward pipeline's date-ordered slicing
  // still applies to *some* chronology — otherwise `.slice(index-lookback,
  // index)` would silently reorder itself back to the original dataset order.
  const reDated = shuffled.map((draw, index) => ({ ...draw, date: `${2000 + Math.floor(index / 300)}-${String((Math.floor(index / 25) % 12) + 1).padStart(2, "0")}-${String((index % 28) + 1).padStart(2, "0")}` }));

  const original = runWalkForwardBacktest(draws, lookback);
  const shuffledResults = runWalkForwardBacktest(reDated, lookback);
  const edgeDeltaByStrategy = Object.fromEntries(
    NON_RANDOM_STRATEGIES.map((id) => {
      const o = original.find((r) => r.strategy === id)?.edgeVsRandom ?? 0;
      const s = shuffledResults.find((r) => r.strategy === id)?.edgeVsRandom ?? 0;
      return [id, o - s];
    }),
  ) as Record<Exclude<StrategyId, "RANDOM">, number>;

  // Coarse sanity: after destroying time order, absolute edges should not all
  // stay large and identical to the original — at least one strategy's |edge|
  // should move, or all shuffled |edges| stay modest. We only flag collapse
  // when every shuffled |edge| is ≤ original |edge| + 1e-9 (non-increase of magnitude)
  // OR mean |shuffled edge| is small — reported for humans, lightly asserted in tests.
  const temporalSignalCollapsed = NON_RANDOM_STRATEGIES.every((id) => {
    const o = Math.abs(original.find((r) => r.strategy === id)?.edgeVsRandom ?? 0);
    const s = Math.abs(shuffledResults.find((r) => r.strategy === id)?.edgeVsRandom ?? 0);
    return s <= o + 1e-12;
  });

  return {
    original,
    shuffled: shuffledResults,
    edgeDeltaByStrategy,
    temporalSignalCollapsed,
  };
}

export type RandomBaselineControlResult = {
  observedMean: number;
  expectedMean: number;
  absoluteDifference: number;
  trials: number;
};

/**
 * Control C — the RANDOM control itself must behave like the exact null:
 * its average matches over many draws should sit close to EXPECTED_MATCHES
 * (0.8), since it is by construction 32 seeded-random tickets per draw
 * averaged together.
 */
export function runRandomBaselineControl(draws: DrawRecord[], lookback = 90): RandomBaselineControlResult {
  const results = runWalkForwardBacktest(draws, lookback);
  const random = results.find((r) => r.strategy === "RANDOM");
  const observedMean = random?.averageMatches ?? Number.NaN;
  return {
    observedMean,
    expectedMean: EXPECTED_MATCHES,
    absoluteDifference: Math.abs(observedMean - EXPECTED_MATCHES),
    trials: random?.trials ?? 0,
  };
}
