/**
 * Exact null model, Monte Carlo null engine, and the fairness diagnostic
 * that replaces the naive chi-square framing (§18–§21).
 */
import { calculateFrequency, chiSquareStatistic, type DrawRecord, type FrequencyRow } from "../analytics";
import { outcomes } from "../profit";
import { createRng, drawFairTicket } from "./rng";

/**
 * §18: the primary statistical endpoint for every experiment in this lab.
 * Chosen because its null distribution (a fair ticket against a fair draw)
 * is exact and known in closed form — see `EXPECTED_MATCHES` below — unlike
 * payout or ROI, which are dominated by rare high-tier prizes and have a
 * heavy-tailed, analytically inconvenient null distribution.
 *
 * This must not change after a protocol is frozen (§18, §26); changing it
 * after observing results is exactly the kind of researcher-degree-of-freedom
 * this lab is built to make harder.
 */
export const PRIMARY_ENDPOINT = {
  id: "mean_matched_numbers_per_ticket",
  label: "Trung bình số trùng khớp mỗi vé",
  description:
    "Trung bình số lượng (trong 6 số của vé) trùng với kết quả quay, trên một tập vé/kỳ đánh giá. " +
    "Phân phối null (vé công bằng so với quay công bằng) là chính xác và biết trước — xem EXPECTED_MATCHES.",
} as const;

/** E[X] = 6 * 6/45 = 0.8, derived from the exact hypergeometric distribution rather than hard-coded. */
export const EXPECTED_MATCHES = outcomes.reduce((sum, o) => sum + o.matches * o.probability, 0);

/** Var[X] under a fair draw, same derivation. */
export const MATCH_VARIANCE = outcomes.reduce((sum, o) => sum + o.probability * (o.matches - EXPECTED_MATCHES) ** 2, 0);

/** Exact P(X = k) for a single fair ticket against a single fair draw, 0 <= k <= 6. */
export function matchProbability(k: number): number {
  const outcome = outcomes.find((o) => o.matches === k);
  if (!outcome) throw new Error(`Số trùng khớp phải trong khoảng 0..6, nhận ${k}.`);
  return outcome.probability;
}

/** Exact P(X >= k), the standard "at least a k-match" tail used for prize-tier framing. */
export function tailProbabilityAtLeast(k: number): number {
  return outcomes.filter((o) => o.matches >= k).reduce((sum, o) => sum + o.probability, 0);
}

/** Expected number of tickets landing in each match tier, for `ticketCount` independent fair tickets. */
export function expectedPrizeFrequency(ticketCount: number): Record<number, number> {
  return Object.fromEntries(outcomes.map((o) => [o.matches, o.probability * ticketCount]));
}

/**
 * UI-only Monte Carlo budget for the ResearchLab fairness metric.
 * Kept separate from `CURRENT_PROTOCOL.fairnessSimulationCount` (canonical /
 * artifact precision, typically ≥2000) so interactive pages stay responsive.
 */
export const INTERACTIVE_FAIRNESS_SIMULATION_COUNT = 300;

export type MonteCarloNullOptions = {
  simulationCount?: number;
  seed?: number;
};

export function simulateFairDataset(drawCount: number, rng: () => number): number[][] {
  return Array.from({ length: drawCount }, () => drawFairTicket(rng));
}

/**
 * §20: reproducible Monte Carlo null. Deterministic given (drawCount, seed,
 * simulationCount, statistic) — rerunning produces byte-identical samples,
 * which is what lets an experiment artifact simply record the seed instead
 * of the simulated data itself.
 */
export function runMonteCarloNull<T>(
  drawCount: number,
  statistic: (simulatedResults: number[][]) => T,
  { simulationCount = 2000, seed = 645 }: MonteCarloNullOptions = {},
): { seed: number; simulationCount: number; samples: T[] } {
  const rng = createRng(seed);
  const samples: T[] = [];
  for (let i = 0; i < simulationCount; i += 1) {
    samples.push(statistic(simulateFairDataset(drawCount, rng)));
  }
  return { seed, simulationCount, samples };
}

function frequencyRowsFromResults(results: number[][]): FrequencyRow[] {
  const asDraws: DrawRecord[] = results.map((result, index) => ({ date: "", id: String(index), result }));
  return calculateFrequency(asDraws);
}

export type FairnessDiagnostic = {
  observedStatistic: number;
  monteCarloPValue: number;
  simulationCount: number;
  seed: number;
};

/**
 * §21: replaces the naive "Q ~ chi-square(44), expected Q ~ 44" framing.
 * Mega 6/45 samples six numbers without replacement per draw, so per-number
 * counts are negatively correlated across the 45 categories and the
 * classical independent-category chi-square reference distribution does not
 * strictly apply. Instead of asserting a theoretical df, this calibrates the
 * exact same observed statistic (`chiSquareStatistic`, unchanged) against an
 * empirical null built from simulated fair datasets of the same size.
 *
 * The result is a "fairness diagnostic", not a predictive signal: a low
 * Monte Carlo p-value means the observed number distribution is unusual
 * under a fair-draw null, nothing more.
 */
export function monteCarloFairnessDiagnostic(draws: DrawRecord[], options: MonteCarloNullOptions = {}): FairnessDiagnostic {
  const observedStatistic = chiSquareStatistic(calculateFrequency(draws));
  const { seed, simulationCount, samples } = runMonteCarloNull(
    draws.length,
    (results) => chiSquareStatistic(frequencyRowsFromResults(results)),
    options,
  );
  const atLeastAsExtreme = samples.filter((s) => s >= observedStatistic).length;
  // +1/+1 smoothing: a Monte Carlo p-value of exactly 0 is never reportable — the
  // truth is "less than 1/(simulationCount+1)", not "certainly zero".
  const monteCarloPValue = (atLeastAsExtreme + 1) / (simulationCount + 1);
  return { observedStatistic, monteCarloPValue, simulationCount, seed };
}
