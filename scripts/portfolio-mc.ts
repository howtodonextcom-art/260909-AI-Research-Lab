/**
 * `npm run research:portfolio-mc` — same-budget Monte Carlo: projective
 * portfolio (`optimizePortfolio`) vs n independent random tickets, both
 * scored against simulated FAIR draws.
 *
 * This is deliberately NOT a backtest against real draw history — that
 * question is already covered by `runWalkForwardBacktest` /
 * `research:experiment` with Holm correction. This answers a narrower,
 * purely combinatorial question: under a truly fair game, does the
 * pairwise-≤1 construction beat n independent random tickets on mean
 * best-match or hit>=4 rate, at the same ticket budget? See
 * `lib/research/portfolio-mc.ts` for the full design rationale.
 */
import { CANONICAL_PORTFOLIO_MC_COUNT, runPortfolioSameBudgetMonteCarlo } from "../lib/research/portfolio-mc";

const TICKET_COUNTS = [10, 20, 30] as const;
const SEED = 645;

console.log("\nSAME-BUDGET PORTFOLIO MONTE CARLO (fair-draw null — not a real-history backtest)");
console.log(`  simulationCount=${CANONICAL_PORTFOLIO_MC_COUNT} seed=${SEED}\n`);
console.log("  n  | proj mean best | random mean best | proj hit>=4%  | random hit>=4% | proj hit>=5% | random hit>=5%");

for (const n of TICKET_COUNTS) {
  const s = runPortfolioSameBudgetMonteCarlo(n, { simulationCount: CANONICAL_PORTFOLIO_MC_COUNT, seed: SEED });
  console.log(
    `  ${String(n).padStart(2)} | ${s.projectiveMeanBestMatch.toFixed(3).padStart(14)} | ${s.randomMeanBestMatch.toFixed(3).padStart(17)} | ` +
      `${(s.projectiveHitAtLeast4Rate * 100).toFixed(2).padStart(12)}% | ${(s.randomHitAtLeast4Rate * 100).toFixed(2).padStart(13)}% | ` +
      `${(s.projectiveHitAtLeast5Rate * 100).toFixed(3).padStart(11)}% | ${(s.randomHitAtLeast5Rate * 100).toFixed(3).padStart(13)}%`,
  );
}

console.log("\n  Diễn giải (HYPOTHESIS, không phải khuyến nghị mua): chênh lệch giữa projective và ngẫu nhiên");
console.log("  cùng ngân sách thường nhỏ và không nhất quán theo n. Projective chủ yếu cải thiện độ phủ cặp số");
console.log("  và loại trừ lẫn nhau ở ngưỡng >=4 (xem lib/portfolio.ts), KHÔNG phải một lợi thế MC lớn về số");
console.log("  trùng khớp tốt nhất trung bình so với ngẫu nhiên cùng ngân sách.");
console.log("\n  Xong.");
