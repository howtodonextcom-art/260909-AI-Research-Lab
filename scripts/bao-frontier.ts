/**
 * `npm run research:bao-frontier` — cost/coverage frontier: bao-n full
 * cover vs projective portfolio vs independent random, at matched cost.
 *
 * Hard requirement (blueprint B5): never print or imply "projective/random
 * beats bao" from cost alone — the caveat below is printed, not just left
 * as a code comment.
 */
import { baoCost, costCoverageFrontier, formatVnd } from "../lib/research/bao";

const BUDGETS = [100_000, 200_000, 300_000, 1_000_000, baoCost(18)];

console.log("\nCOST / COVERAGE FRONTIER — bao vs projective vs random, CÙNG NGÂN SÁCH\n");

const rows = costCoverageFrontier(BUDGETS);

for (const row of rows) {
  console.log(`  Ngân sách: ${formatVnd(row.budget)}`);
  console.log(
    `    bao-${row.bao.poolSize}       : ${row.bao.tickets.toLocaleString("vi-VN")} vé, ${formatVnd(row.bao.cost)}, ` +
      `P(jackpot)=${row.bao.jackpotProbability.toExponential(3)}`,
  );
  console.log(
    `    projective   : ${row.projective.tickets} vé${row.projective.cappedAt30 ? " [đã giới hạn 30 — §30/§31]" : ""}, ${formatVnd(row.projective.cost)}, ` +
      `P(>=4)=${row.projective.odds ? row.projective.odds.exactProbabilityAtLeast4.toExponential(3) : "—"}, ` +
      `P(>=5)=${row.projective.odds ? row.projective.odds.exactProbabilityAtLeast5.toExponential(3) : "—"}, ` +
      `P(jackpot)=${row.projective.odds ? row.projective.odds.exactProbabilityJackpot.toExponential(3) : "—"}`,
  );
  console.log(
    `    random cùng n: ${row.randomSameN.ticketCount} vé, P(jackpot)≈${row.randomSameN.approxProbabilityJackpot.toExponential(3)}`,
  );
  console.log("");
}

console.log(`  ${rows[0]?.caveat ?? ""}`);
console.log("\n  Xong.");
