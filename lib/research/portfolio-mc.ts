/**
 * Same-budget portfolio Monte Carlo (blueprint B4 / capability C15).
 *
 * Design choice (documented, not just implied): this compares SAME-BUDGET
 * coverage — the projective-plane portfolio (`optimizePortfolio`) versus n
 * independent random tickets — against a synthetic FAIR draw distribution
 * (`drawFairTicket`, the same fair-draw primitive `negative-controls.ts`
 * and `statistics.ts` already use). It is deliberately NOT a backtest
 * against real draw history: that question ("does a strategy beat RANDOM
 * on real history") is already answered by `runWalkForwardBacktest` /
 * `research:experiment`, with Holm correction and HAC standard errors. This
 * module answers a narrower, purely combinatorial question instead: "for a
 * fixed ticket budget n, under a TRULY fair game, does the pairwise-≤1
 * construction find a better best-matching ticket on average, or hit ≥4
 * more often, than n independent random tickets?" Mixing the two questions
 * (real-history edge vs same-budget coverage under a fair null) would blur
 * exactly the distinction `lib/portfolio.ts`'s big doc comment warns about:
 * the exact-probability claim in `calculatePortfolioOdds` only holds
 * because of the pairwise-≤1 guarantee, and this MC is here to show — with
 * simulation rather than a courtroom argument — that the same guarantee
 * does NOT translate into a large mean-best-match advantage over
 * independent random tickets at the same budget.
 */
import { intersectionSize, optimizePortfolio } from "../portfolio";
import { createRng, drawFairTicket } from "./rng";

/**
 * UI-only Monte Carlo budget, mirroring the separation already used by
 * `INTERACTIVE_FAIRNESS_SIMULATION_COUNT` vs `CURRENT_PROTOCOL.fairnessSimulationCount`
 * in `statistics.ts` / `protocol.ts`. This module has no UI hook in this
 * pass (CLI-only), but the constant exists so a future interactive surface
 * follows the same interactive/canonical split instead of inventing a new
 * pattern. Distinct from, and never assigned into, `fairnessSimulationCount`.
 */
export const INTERACTIVE_PORTFOLIO_MC_COUNT = 600;

/** CLI / canonical precision default — deterministic given the same seed. */
export const CANONICAL_PORTFOLIO_MC_COUNT = 3000;

export type PortfolioMcOptions = {
  /** Number of simulated fair draws. Default: `CANONICAL_PORTFOLIO_MC_COUNT`. */
  simulationCount?: number;
  /** Seed for the simulated draws (and the random-arm tickets drawn alongside them). */
  seed?: number;
  /** Seed passed to `optimizePortfolio` for the projective arm's ticket set. */
  portfolioSeed?: number;
};

export type PortfolioMcSummary = {
  ticketCount: number;
  simulationCount: number;
  seed: number;
  portfolioSeed: number;
  /** Mean, over simulated fair draws, of the BEST single-ticket match count in the projective portfolio. */
  projectiveMeanBestMatch: number;
  /** Same statistic for n independent random tickets, redrawn every simulation. */
  randomMeanBestMatch: number;
  projectiveHitAtLeast4Rate: number;
  randomHitAtLeast4Rate: number;
  projectiveHitAtLeast5Rate: number;
  randomHitAtLeast5Rate: number;
};

/**
 * Best single-ticket match count of a fixed portfolio against one draw.
 * Exported and separately tested so "does the MC actually look at every
 * ticket in the portfolio, not just ticket[0] repeated n times" has a
 * direct, isolated assertion instead of only an indirect one via the full
 * simulation loop.
 */
export function bestMatchInPortfolio(tickets: number[][], draw: number[]): number {
  let best = 0;
  for (const ticket of tickets) {
    const matches = intersectionSize(ticket, draw);
    if (matches > best) best = matches;
  }
  return best;
}

export function runPortfolioSameBudgetMonteCarlo(
  ticketCount: number,
  options: PortfolioMcOptions = {},
): PortfolioMcSummary {
  const {
    simulationCount = CANONICAL_PORTFOLIO_MC_COUNT,
    seed = 645,
    portfolioSeed = 645,
  } = options;
  if (!Number.isInteger(simulationCount) || simulationCount < 1) {
    throw new Error("simulationCount phải là số nguyên dương.");
  }

  // Reuses optimizePortfolio's own bounds check (1..30) — no duplicate validation here.
  const portfolio = optimizePortfolio(ticketCount, portfolioSeed);

  const rng = createRng(seed);
  let projectiveBestSum = 0;
  let randomBestSum = 0;
  let projectiveHit4 = 0;
  let randomHit4 = 0;
  let projectiveHit5 = 0;
  let randomHit5 = 0;

  for (let i = 0; i < simulationCount; i += 1) {
    const draw = drawFairTicket(rng);

    const projectiveBest = bestMatchInPortfolio(portfolio, draw);

    // Independent random arm: n freshly drawn fair tickets per simulation,
    // scored against the SAME draw — same budget (n tickets), same null.
    let randomBest = 0;
    for (let t = 0; t < ticketCount; t += 1) {
      const matches = intersectionSize(drawFairTicket(rng), draw);
      if (matches > randomBest) randomBest = matches;
    }

    projectiveBestSum += projectiveBest;
    randomBestSum += randomBest;
    if (projectiveBest >= 4) projectiveHit4 += 1;
    if (randomBest >= 4) randomHit4 += 1;
    if (projectiveBest >= 5) projectiveHit5 += 1;
    if (randomBest >= 5) randomHit5 += 1;
  }

  return {
    ticketCount,
    simulationCount,
    seed,
    portfolioSeed,
    projectiveMeanBestMatch: projectiveBestSum / simulationCount,
    randomMeanBestMatch: randomBestSum / simulationCount,
    projectiveHitAtLeast4Rate: projectiveHit4 / simulationCount,
    randomHitAtLeast4Rate: randomHit4 / simulationCount,
    projectiveHitAtLeast5Rate: projectiveHit5 / simulationCount,
    randomHitAtLeast5Rate: randomHit5 / simulationCount,
  };
}
