/**
 * Bao combinatorics + cost–coverage frontier (blueprint B5 / capability C14).
 *
 * "Bao n" means: fix a pool of n numbers and buy every 6-number ticket drawn
 * from that pool — C(n,6) tickets total, guaranteeing the jackpot iff the
 * real draw's 6 numbers all happen to lie inside the chosen n-pool.
 *
 * Combinatorial derivation for `baoJackpotProbability` (verified here, not
 * just asserted): the official draw is one of the `choose(45,6)` equally
 * likely 6-subsets of {1..45}. A bao-n ticket set contains a ticket that
 * exactly equals the draw iff the draw is entirely contained in the n-pool
 * (draw ⊆ pool) — if so, the draw itself is one of the pool's `choose(n,6)`
 * 6-subsets, so the bao set already owns it as one of its tickets; if not,
 * no ticket in the bao set (all of which are subsets of the n-pool) can
 * equal a draw that reaches outside the pool. The number of 6-subsets of
 * the full 45 numbers that lie entirely inside a fixed n-pool is exactly
 * `choose(n,6)`. Therefore:
 *
 *   P(jackpot | bao-n) = choose(n,6) / choose(45,6)
 *
 * Sanity check: n=45 (pool = every number) must give P=1 exactly, since
 * every draw trivially lies inside "all 45 numbers" — this is asserted in
 * `bao.test.ts`, not just claimed here.
 */
import { formatVnd, MEGA_645 } from "../mega645";
import { calculatePortfolioOdds, type PortfolioOdds } from "../portfolio";
import { choose } from "../profit";

const TOTAL_COMBINATIONS = choose(45, 6);
const MAX_PROJECTIVE_TICKETS = 30;

function assertPoolSize(poolSize: number): void {
  if (!Number.isInteger(poolSize) || poolSize < 6 || poolSize > 45) {
    throw new Error("Kích thước pool bao phải là số nguyên từ 6 đến 45.");
  }
}

/** Number of tickets in a full "bao n" cover: every 6-subset of an n-number pool. */
export function baoTickets(poolSize: number): number {
  assertPoolSize(poolSize);
  return choose(poolSize, 6);
}

/** Total cost (VND) of a full "bao n" cover at the standard ticket price. */
export function baoCost(poolSize: number): number {
  return baoTickets(poolSize) * MEGA_645.ticketPrice;
}

/** Exact P(jackpot) for a full "bao n" cover — see module doc comment for the proof. */
export function baoJackpotProbability(poolSize: number): number {
  return baoTickets(poolSize) / TOTAL_COMBINATIONS;
}

export type RandomSameNEstimate = {
  ticketCount: number;
  /**
   * Approximation, not exact: independent random tickets can repeat, so the
   * true P(at least one exact match) via inclusion-exclusion is
   * `1 - (1 - 1/C(45,6))^n` only when tickets are drawn independently WITH
   * possible repeats (as this codebase's random generators do). At the n
   * used here (<=30 against C(45,6)=8,145,060) the gap between this and a
   * without-repeats exact union bound is far below floating-point display
   * precision, so labeling it an approximation is a documentation nicety,
   * not a hidden error margin that matters at this scale.
   */
  approxProbabilityJackpot: number;
};

export function randomSameNJackpotEstimate(ticketCount: number): RandomSameNEstimate {
  if (!Number.isInteger(ticketCount) || ticketCount < 1) {
    throw new Error("Số vé phải là số nguyên dương.");
  }
  return {
    ticketCount,
    approxProbabilityJackpot: 1 - (1 - 1 / TOTAL_COMBINATIONS) ** ticketCount,
  };
}

/** Largest pool size whose full bao cover costs no more than `budget` VND. */
export function baoPoolSizeForBudget(budget: number): number {
  const minCost = baoCost(6);
  if (!Number.isFinite(budget) || budget < minCost) {
    throw new Error(`Ngân sách phải >= ${minCost} VND (giá bao nhỏ nhất, bao-6 = 1 vé).`);
  }
  let best = 6;
  for (let poolSize = 7; poolSize <= 45; poolSize += 1) {
    if (baoCost(poolSize) <= budget) best = poolSize;
    else break; // baoCost(n) is strictly increasing in n, so no later n can fit either.
  }
  return best;
}

export type CostCoverageFrontierRow = {
  budget: number;
  bao: { poolSize: number; tickets: number; cost: number; jackpotProbability: number };
  projective: {
    tickets: number;
    cost: number;
    odds: PortfolioOdds | null;
    /** True when the budget would buy more than 30 tickets — `optimizePortfolio` caps at 30 (§30/§31). */
    cappedAt30: boolean;
  };
  randomSameN: RandomSameNEstimate;
  /**
   * Hard requirement (blueprint B5): a frontier row must never be read as
   * "projective/random beats bao" purely because it costs less — lower
   * cost at proportionally lower coverage is a budget choice, not an
   * algorithmic win. This string is printed directly by the CLI, not just
   * left as a code comment.
   */
  caveat: string;
};

const FRONTIER_CAVEAT =
  "Chi phí thấp hơn không phải là chiến thắng thuật toán: bao phủ trọn bộ pool (bao) đổi ngân sách lớn " +
  "lấy xác suất jackpot cao hơn tương ứng; projective/ngẫu nhiên giữ ngân sách thấp nhưng xác suất jackpot " +
  "thấp tương ứng. So sánh công bằng là CÙNG một ngân sách — rẻ hơn một mình không chứng minh thuật toán tốt hơn.";

/**
 * For each budget, juxtapose: (a) the largest bao-n full cover that fits,
 * (b) the equivalent number of projective-portfolio tickets at that same
 * budget with its exact P(>=4)/P(>=5)/jackpot (reusing
 * `calculatePortfolioOdds`, not recomputed here), and (c) the same-n
 * independent-random jackpot estimate — all at matched cost.
 */
export function costCoverageFrontier(budgets: number[]): CostCoverageFrontierRow[] {
  return budgets.map((budget) => {
    const poolSize = baoPoolSizeForBudget(budget);
    const projectiveTicketsRaw = Math.floor(budget / MEGA_645.ticketPrice);
    const cappedAt30 = projectiveTicketsRaw > MAX_PROJECTIVE_TICKETS;
    const projectiveTickets = Math.max(0, Math.min(projectiveTicketsRaw, MAX_PROJECTIVE_TICKETS));

    return {
      budget,
      bao: {
        poolSize,
        tickets: baoTickets(poolSize),
        cost: baoCost(poolSize),
        jackpotProbability: baoJackpotProbability(poolSize),
      },
      projective: {
        tickets: projectiveTickets,
        cost: projectiveTickets * MEGA_645.ticketPrice,
        odds: projectiveTickets >= 1 ? calculatePortfolioOdds(projectiveTickets) : null,
        cappedAt30,
      },
      randomSameN: randomSameNJackpotEstimate(Math.max(1, projectiveTickets)),
      caveat: FRONTIER_CAVEAT,
    };
  });
}

/** Re-exported so CLIs don't need a second import line just to print costs. */
export { formatVnd };
