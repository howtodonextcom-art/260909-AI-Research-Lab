/**
 * `npm run research:portfolio-mc-summary` — publishes a read-only, browser-
 * fetchable summary of `runPortfolioSameBudgetMonteCarlo`'s output under
 * `public/data/portfolio-mc-summary.json`, mirroring
 * `scripts/export-ablation-summary.ts`'s one-stage design: this diagnostic
 * uses only synthetic fair draws (no canonical dataset dependency at all —
 * see `lib/research/portfolio-mc.ts`), so calling the real simulation
 * directly here is the simplest fully-reproducible path (same
 * seed/ticketCounts as `scripts/portfolio-mc.ts`'s CLI table).
 */
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { CANONICAL_PORTFOLIO_MC_COUNT, runPortfolioSameBudgetMonteCarlo } from "../lib/research/portfolio-mc";
import { buildPortfolioMcSummary, parsePortfolioMcSummary } from "../lib/research/portfolio-mc-summary";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const outPath = path.join(projectRoot, "public", "data", "portfolio-mc-summary.json");

const TICKET_COUNTS = [10, 20, 30] as const;
const SEED = 645;

const results = TICKET_COUNTS.map((n) =>
  runPortfolioSameBudgetMonteCarlo(n, { simulationCount: CANONICAL_PORTFOLIO_MC_COUNT, seed: SEED }),
);

const summary = buildPortfolioMcSummary(results);

// Never publish something our own client-side parser would reject.
if (!parsePortfolioMcSummary(summary)) {
  console.error("Summary vừa dựng không qua được parsePortfolioMcSummary — hủy publish (fail-closed).");
  process.exit(1);
}

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

console.log("ĐÃ XUẤT PORTFOLIO MONTE CARLO SUMMARY");
console.log(`  simulationCount=${CANONICAL_PORTFOLIO_MC_COUNT} seed=${SEED}`);
console.log(`  số dòng (ticketCount): ${summary.rows.length}`);
console.log(`  file: ${path.relative(projectRoot, outPath)}`);
