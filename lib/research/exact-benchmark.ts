/**
 * Exact Random vs Projective Benchmark (master prompt §8, HIGH priority).
 *
 * Two arms compared at identical ticket count N, BOTH using exact closed-form
 * probabilities — no simulation anywhere in this module (§12: exact
 * available -> use exact; any Monte Carlo cross-check lives elsewhere as a
 * secondary diagnostic).
 *
 * 1. "projective" — N tickets from `optimizePortfolio`'s pairwise-
 *    intersection-<=1 construction. `calculatePortfolioOdds` (lib/portfolio.ts)
 *    already proves that "ticket_i matches >=4" and "ticket_j matches >=4"
 *    are mutually exclusive for every pair in this construction, so the
 *    linear sum it returns for P(>=4)/P(>=5) IS the exact union probability
 *    (not an approximation, not a union bound). We reuse it verbatim.
 *
 * 2. "independentRandom" — N tickets drawn independently at random, exactly
 *    the model `lib/research/bao.ts`'s `randomSameNJackpotEstimate` already
 *    uses for the jackpot case: independent draws WITH possible repeats.
 *    Under that model, "none of the N tickets reaches >=k" has probability
 *    `(1 - p_k)^N` (each ticket's outcome is independent of the others), so
 *    the complement — "at least one of N independent tickets matches >=k" —
 *    is exactly:
 *
 *      P(at least one of N independent tickets matches >= k) = 1 - (1 - p_k)^N
 *
 *    where `p_k` = P(a single random ticket matches >= k against one fixed
 *    draw), computed exactly from the same hypergeometric `outcomes` table
 *    (lib/profit.ts) every other exact-probability calculation in this
 *    codebase already uses. This is exact under the independent-with-repeats
 *    model, not an approximation — the same modeling choice
 *    `randomSameNJackpotEstimate` documents for jackpot; we extend the
 *    identical reasoning to >=4 and >=5 instead of re-deriving it ad hoc.
 *
 *    We do not add a "distinct tickets, no repeats" baseline: at N<=30
 *    against C(45,6)=8,145,060 possible tickets, the probability that an
 *    independent random draw ever repeats a previous ticket is negligible
 *    (this is exactly the argument `randomSameNJackpotEstimate` already
 *    makes for the jackpot case), so a with-repeats vs without-repeats
 *    distinction would not change any displayed number at the precision
 *    this UI shows.
 *
 * Design choice: this lives in its own module rather than being folded into
 * `lib/portfolio.ts` or `lib/research/bao.ts` because it is neither — it
 * consumes both as read-only references and adds a genuinely new concept
 * (the >=4/>=5 independent-random arm, which does not exist yet in either
 * file) plus the lift/caveat framing. Keeping it separate avoids widening
 * either file's already-documented, precondition-sensitive public surface.
 */
import { calculatePortfolioOdds } from "../portfolio";
import { choose, outcomes } from "../profit";
import { randomSameNJackpotEstimate } from "./bao";

const TOTAL_COMBINATIONS = choose(45, 6);

/** P(a single random ticket matches >= k numbers) against one fixed draw — exact hypergeometric. */
function singleTicketProbabilityAtLeast(k: number): number {
  return outcomes.slice(k).reduce((sum, outcome) => sum + outcome.combinations, 0) / TOTAL_COMBINATIONS;
}

const SINGLE_TICKET_P_AT_LEAST_4 = singleTicketProbabilityAtLeast(4);
const SINGLE_TICKET_P_AT_LEAST_5 = singleTicketProbabilityAtLeast(5);

/**
 * P(at least one of `ticketCount` independent random tickets matches >= k),
 * exact under the independent-with-repeats model documented above.
 */
function independentRandomAtLeast(ticketCount: number, singleTicketProbability: number): number {
  return 1 - (1 - singleTicketProbability) ** ticketCount;
}

export type ExactBenchmarkArm = {
  probAtLeast4: number;
  probAtLeast5: number;
  probJackpot: number;
};

export type ExactBenchmarkLift = {
  /** Percentage points: projective - independentRandom (both already probabilities in [0,1]). */
  absolute: number;
  /**
   * Ratio form: (projective - independentRandom) / independentRandom.
   * Multiply by 100 to display as a percentage. 0 when independentRandom is 0
   * (only possible at ticketCount=0, which is not a valid input here).
   */
  relative: number;
};

export type ExactBenchmarkRow = {
  ticketCount: number;
  projective: ExactBenchmarkArm;
  independentRandom: ExactBenchmarkArm;
  liftAtLeast4: ExactBenchmarkLift;
  liftAtLeast5: ExactBenchmarkLift;
  liftJackpot: ExactBenchmarkLift;
};

function computeLift(projectiveValue: number, independentRandomValue: number): ExactBenchmarkLift {
  return {
    absolute: projectiveValue - independentRandomValue,
    relative: independentRandomValue === 0 ? 0 : (projectiveValue - independentRandomValue) / independentRandomValue,
  };
}

/**
 * Required honesty caveat (§8): projective structure helps mainly by
 * removing ticket-to-ticket overlap in the high-tier outcome space — it does
 * NOT raise any single ticket's own match probability. Mirrors
 * `lib/research/bao.ts`'s `FRONTIER_CAVEAT` pattern (a caveat baked into the
 * exported data, not left as a code comment only) and this codebase's
 * existing Vietnamese voice.
 */
export const EXACT_BENCHMARK_CAVEAT =
  "Projective giúp chủ yếu bằng cách giảm chồng lặp giữa các vé (loại bỏ việc hai vé cùng chiếm một kết quả " +
  "trúng từ 4 số trở lên). Nó KHÔNG làm một vé riêng lẻ nào có xác suất trúng cao hơn — xác suất trúng của mỗi " +
  "vé đơn lẻ giống hệt một vé ngẫu nhiên. Mức chênh lệch (lift) dưới đây phản ánh đúng con số tính toán được, " +
  "kể cả khi rất nhỏ.";

/**
 * Compute the exact (non-simulated) projective-vs-independent-random
 * benchmark for each requested ticket count. Both arms are closed-form; see
 * the module doc comment for the derivation of each. Throws on any
 * `ticketCount` outside `calculatePortfolioOdds`'s valid 1-30 range, since
 * `optimizePortfolio`/the projective-plane construction only exists in that
 * range (§30/§31).
 */
export function computeExactBenchmark(ticketCounts: number[]): ExactBenchmarkRow[] {
  return ticketCounts.map((ticketCount) => {
    if (!Number.isInteger(ticketCount) || ticketCount < 1 || ticketCount > 30) {
      throw new Error("Số vé phải là số nguyên từ 1 đến 30.");
    }
    const projectiveOdds = calculatePortfolioOdds(ticketCount);
    const projective: ExactBenchmarkArm = {
      probAtLeast4: projectiveOdds.exactProbabilityAtLeast4,
      probAtLeast5: projectiveOdds.exactProbabilityAtLeast5,
      probJackpot: projectiveOdds.exactProbabilityJackpot,
    };
    const independentRandom: ExactBenchmarkArm = {
      probAtLeast4: independentRandomAtLeast(ticketCount, SINGLE_TICKET_P_AT_LEAST_4),
      probAtLeast5: independentRandomAtLeast(ticketCount, SINGLE_TICKET_P_AT_LEAST_5),
      probJackpot: randomSameNJackpotEstimate(ticketCount).approxProbabilityJackpot,
    };
    return {
      ticketCount,
      projective,
      independentRandom,
      liftAtLeast4: computeLift(projective.probAtLeast4, independentRandom.probAtLeast4),
      liftAtLeast5: computeLift(projective.probAtLeast5, independentRandom.probAtLeast5),
      liftJackpot: computeLift(projective.probJackpot, independentRandom.probJackpot),
    };
  });
}
