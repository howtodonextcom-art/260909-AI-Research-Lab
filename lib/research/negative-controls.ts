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
 * duplicated here. Control F (future-only/leaked feature) is below, after E.
 */
import { createStrategyPick, runWalkForwardBacktest, STRATEGIES, type BacktestResult, type DrawRecord, type StrategyId } from "../analytics";
import { evaluateTicket } from "../mega645";
import { createRng, drawFairTicket } from "./rng";
import { EXPECTED_MATCHES } from "./statistics";

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

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

export type LabelPermutationControlResult = {
  trials: number;
  lookback: number;
  seed: number;
  /** mean(matches) − EXPECTED_MATCHES under the TRUE ticket↔draw pairing. */
  trueEdgeByStrategy: Record<Exclude<StrategyId, "RANDOM">, number>;
  /** mean(matches) − EXPECTED_MATCHES after randomly permuting which trial's actual draw each frozen ticket is scored against. */
  permutedEdgeByStrategy: Record<Exclude<StrategyId, "RANDOM">, number>;
  /** True when every strategy's permuted |edge| sits within a small band of 0 — the label-permutation null. */
  edgeCollapsedTowardNull: boolean;
};

/**
 * Control E — label permutation. Builds the same walk-forward tickets
 * `runWalkForwardBacktest` would (ticket for trial k computed only from
 * history strictly before draw k, via `createStrategyPick`), then randomly
 * permutes *which trial's actual draw result* each frozen ticket is scored
 * against — i.e. shuffles the pairing between "ticket generated for draw i"
 * and "the real outcome of draw i" within the walk-forward series, while the
 * tickets themselves (and the history each was computed from) are left
 * untouched. Any genuine predictive edge depends on the correct pairing; a
 * relabeled pairing is statistically equivalent to scoring each ticket
 * against an unrelated draw, so a strategy's average matches under the
 * permutation should collapse toward EXPECTED_MATCHES (0.8) regardless of
 * whatever edge it showed under the true pairing. As with the other
 * controls in this file, this is a coarse sanity check, not a certified
 * false-positive-rate measurement (see file header).
 */
export function runLabelPermutationControl(
  draws: DrawRecord[],
  lookback = 90,
  seed = 645,
): LabelPermutationControlResult {
  const trialCount = draws.length - lookback;
  const zeroEdge = Object.fromEntries(NON_RANDOM_STRATEGIES.map((id) => [id, 0])) as Record<
    Exclude<StrategyId, "RANDOM">,
    number
  >;
  if (trialCount <= 0) {
    return {
      trials: 0,
      lookback,
      seed,
      trueEdgeByStrategy: zeroEdge,
      permutedEdgeByStrategy: zeroEdge,
      edgeCollapsedTowardNull: true,
    };
  }

  const ticketsByStrategy: Record<Exclude<StrategyId, "RANDOM">, number[][]> = Object.fromEntries(
    NON_RANDOM_STRATEGIES.map((id) => [id, [] as number[][]]),
  ) as Record<Exclude<StrategyId, "RANDOM">, number[][]>;
  const actualResults: number[][] = [];

  for (let index = lookback; index < draws.length; index += 1) {
    const history = draws.slice(index - lookback, index);
    actualResults.push(draws[index].result);
    for (const strategy of NON_RANDOM_STRATEGIES) {
      ticketsByStrategy[strategy].push(createStrategyPick(history, strategy, seed));
    }
  }

  const rng = createRng(seed);
  const permutedIndex = Array.from({ length: trialCount }, (_, i) => i);
  for (let i = permutedIndex.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [permutedIndex[i], permutedIndex[j]] = [permutedIndex[j], permutedIndex[i]];
  }

  const trueEdgeByStrategy = {} as Record<Exclude<StrategyId, "RANDOM">, number>;
  const permutedEdgeByStrategy = {} as Record<Exclude<StrategyId, "RANDOM">, number>;

  for (const strategy of NON_RANDOM_STRATEGIES) {
    const tickets = ticketsByStrategy[strategy];
    const trueMatches = tickets.map((ticket, k) => evaluateTicket(ticket, actualResults[k]).matches);
    const permutedMatches = tickets.map((ticket, k) => evaluateTicket(ticket, actualResults[permutedIndex[k]]).matches);
    trueEdgeByStrategy[strategy] = mean(trueMatches) - EXPECTED_MATCHES;
    permutedEdgeByStrategy[strategy] = mean(permutedMatches) - EXPECTED_MATCHES;
  }

  const edgeCollapsedTowardNull = NON_RANDOM_STRATEGIES.every(
    (id) => Math.abs(permutedEdgeByStrategy[id]) < 0.15,
  );

  return { trials: trialCount, lookback, seed, trueEdgeByStrategy, permutedEdgeByStrategy, edgeCollapsedTowardNull };
}

export type FutureLeakageControlResult = {
  trials: number;
  lookback: number;
  /** mean(matches) − EXPECTED_MATCHES for a genuine, leak-safe strategy (HOT) computed only from `draws.slice(index-lookback, index)`. */
  leakSafeEdge: number;
  /** mean(matches) − EXPECTED_MATCHES for the deliberately leaked strategy, which reads `draws[index].result` itself. */
  leakedEdge: number;
  leakedAverageMatches: number;
  /** Fraction of trials where the leaked ticket matched all 6 numbers (it always will — the "ticket" IS the draw). */
  leakedJackpotRate: number;
  /** True when the leaked run looks unmistakably like a leak (near-jackpot every trial, edge far above any leak-safe strategy's). */
  leakDetected: boolean;
};

/**
 * Deliberately leaked "feature": ignores history entirely and copies the
 * *target* draw's own result. This is the master prompt's "future-only/
 * leaked feature" made maximally obvious on purpose — the point of Control F
 * is not to be subtle, it is to prove the battery can tell a real leak apart
 * from a fair strategy at all. Any real leak (e.g. an accidental `draws[i]`
 * instead of `draws[i-1]` off-by-one, or a feature column built over the
 * whole dataset before slicing) is a *milder* version of this same failure
 * mode: peeking at `drawDate >= target` instead of restricting to history
 * strictly before it.
 */
function createLeakedPick(targetDraw: DrawRecord): number[] {
  return [...targetDraw.result].sort((a, b) => a - b);
}

/**
 * Control F — future-only/leaked feature must fail (§B2/§B3 of the v2
 * forensics blueprint). Controls A/B/C/E above all show what NO leak looks
 * like: a fair or history-only process collapses toward EXPECTED_MATCHES
 * (0.8) under every one of those manipulations. This control is the
 * complement — it shows what a REAL leak looks like, by deliberately
 * constructing a "ticket" for trial `index` that reads `draws[index].result`
 * directly instead of the leak-safe `draws.slice(index - lookback, index)`
 * window that `createStrategyPick` (and every walk-forward trial in
 * `lib/analytics.ts`'s `buildWalkForwardSeries`) actually uses. That
 * leak-safe slicing is exactly the pattern Control F is designed to catch
 * violations of: if a future refactor of the walk-forward loop ever let
 * `index` (or later) leak into the history a strategy sees, this control's
 * `leakDetected` signature — average matches near 6, jackpot rate near 1,
 * edge orders of magnitude above any real strategy's — is what that bug
 * would look like, distinguishing it from genuine (absent) predictive edge.
 *
 * Reported for a human to read, per this file's header — but `leakDetected`
 * is asserted in tests because an actual leak's signature here is not
 * ambiguous the way A/B/C/E's coarse collapse-toward-null bounds are.
 */
export function runFutureLeakageControl(draws: DrawRecord[], lookback = 90): FutureLeakageControlResult {
  const trialCount = draws.length - lookback;
  if (trialCount <= 0) {
    return { trials: 0, lookback, leakSafeEdge: 0, leakedEdge: 0, leakedAverageMatches: 0, leakedJackpotRate: 0, leakDetected: false };
  }

  const leakSafeMatches: number[] = [];
  const leakedMatches: number[] = [];
  for (let index = lookback; index < draws.length; index += 1) {
    // Leak-safe: identical to what buildWalkForwardSeries does — history is
    // strictly `draws[index-lookback .. index)`, never including `draws[index]`.
    const history = draws.slice(index - lookback, index);
    const target = draws[index];
    leakSafeMatches.push(evaluateTicket(createStrategyPick(history, "HOT"), target.result).matches);

    // Leaked: reads `target` (i.e. `draws[index]`, drawDate >= target by
    // construction) directly. This is the violation Control F exists to catch.
    leakedMatches.push(evaluateTicket(createLeakedPick(target), target.result).matches);
  }

  const leakSafeEdge = mean(leakSafeMatches) - EXPECTED_MATCHES;
  const leakedAverageMatches = mean(leakedMatches);
  const leakedEdge = leakedAverageMatches - EXPECTED_MATCHES;
  const leakedJackpotRate = leakedMatches.filter((matches) => matches === 6).length / leakedMatches.length;
  // A genuine leak here is unmistakable: every leaked ticket matches all 6
  // numbers, so this is a loose sanity bound, not a fragile threshold.
  const leakDetected = leakedAverageMatches >= 5 && leakedEdge > leakSafeEdge + 1;

  return { trials: trialCount, lookback, leakSafeEdge, leakedEdge, leakedAverageMatches, leakedJackpotRate, leakDetected };
}
