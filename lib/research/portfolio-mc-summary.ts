/**
 * Portfolio same-budget Monte Carlo *summary* (GAP-01), derived read-only
 * from `runPortfolioSameBudgetMonteCarlo`'s `PortfolioMcSummary`
 * (`lib/research/portfolio-mc.ts`).
 *
 * Same fs/pure split as `ablation-summary.ts`: pure reshaping only, no
 * filesystem, no RNG. `scripts/export-portfolio-mc-summary.ts` is the only
 * place that calls the real simulation and writes
 * `public/data/portfolio-mc-summary.json`.
 *
 * IMPORTANT — what this diagnostic is and is not: this compares the
 * projective-plane portfolio against n independent random tickets under a
 * SYNTHETIC FAIR draw distribution (`drawFairTicket`) — it is not a backtest
 * against real draw history and does not use the canonical dataset at all
 * (see the design-rationale comment at the top of `portfolio-mc.ts`). It
 * answers a narrow combinatorial fairness/coverage question, not a
 * predictive-edge question. This module reports exactly the fields
 * `runPortfolioSameBudgetMonteCarlo` computes (mean best-match, hit>=4/hit>=5
 * rates) — it does NOT fabricate a hypothesis-test statistic or p-value that
 * the underlying function does not produce.
 */
import type { PortfolioMcSummary as RawPortfolioMcResult } from "./portfolio-mc";

export type PortfolioMcSummaryRow = {
  ticketCount: number;
  simulationCount: number;
  seed: number;
  portfolioSeed: number;
  projectiveMeanBestMatch: number;
  randomMeanBestMatch: number;
  meanBestMatchDelta: number;
  projectiveHitAtLeast4Rate: number;
  randomHitAtLeast4Rate: number;
  projectiveHitAtLeast5Rate: number;
  randomHitAtLeast5Rate: number;
};

export type PortfolioMcSummaryDoc = {
  schemaVersion: 1;
  generatedAt: string;
  rows: PortfolioMcSummaryRow[];
  honestNote: string;
};

export const PORTFOLIO_MC_HONEST_NOTE =
  "Chẩn đoán độ công bằng / độ phủ danh mục (Monte Carlo trên giả lập kỳ quay CÔNG BẰNG tổng hợp), " +
  "KHÔNG PHẢI chỉ báo dự đoán và KHÔNG dùng dữ liệu kỳ quay thật. So sánh danh mục projective (cặp số ≤1 lần) " +
  "với n vé ngẫu nhiên độc lập cùng ngân sách vé. Chênh lệch số trùng khớp tốt nhất trung bình thường nhỏ và " +
  "không nhất quán theo n — đây là bằng chứng về độ phủ cặp số, không phải một lợi thế thắng cược.";

export function buildPortfolioMcSummary(
  results: RawPortfolioMcResult[],
  meta: { now?: () => Date } = {},
): PortfolioMcSummaryDoc {
  const now = meta.now ?? (() => new Date());
  const rows: PortfolioMcSummaryRow[] = results.map((result) => ({
    ticketCount: result.ticketCount,
    simulationCount: result.simulationCount,
    seed: result.seed,
    portfolioSeed: result.portfolioSeed,
    projectiveMeanBestMatch: result.projectiveMeanBestMatch,
    randomMeanBestMatch: result.randomMeanBestMatch,
    meanBestMatchDelta: result.projectiveMeanBestMatch - result.randomMeanBestMatch,
    projectiveHitAtLeast4Rate: result.projectiveHitAtLeast4Rate,
    randomHitAtLeast4Rate: result.randomHitAtLeast4Rate,
    projectiveHitAtLeast5Rate: result.projectiveHitAtLeast5Rate,
    randomHitAtLeast5Rate: result.randomHitAtLeast5Rate,
  }));

  return {
    schemaVersion: 1,
    generatedAt: now().toISOString(),
    rows,
    honestNote: PORTFOLIO_MC_HONEST_NOTE,
  };
}

function num(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Fail-closed client-side parse: malformed/missing shape -> `null`, mirroring
 * `parseAblationSummary` / `parseProspectiveSummary` / `parseBao18Summary`.
 */
export function parsePortfolioMcSummary(value: unknown): PortfolioMcSummaryDoc | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.schemaVersion !== 1) return null;
  if (typeof raw.generatedAt !== "string") return null;
  if (typeof raw.honestNote !== "string" || raw.honestNote.length === 0) return null;
  if (!Array.isArray(raw.rows)) return null;

  const rows: PortfolioMcSummaryRow[] = [];
  for (const item of raw.rows) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (
      !num(row.ticketCount) ||
      !num(row.simulationCount) ||
      !num(row.seed) ||
      !num(row.portfolioSeed) ||
      !num(row.projectiveMeanBestMatch) ||
      !num(row.randomMeanBestMatch) ||
      !num(row.meanBestMatchDelta) ||
      !num(row.projectiveHitAtLeast4Rate) ||
      !num(row.randomHitAtLeast4Rate) ||
      !num(row.projectiveHitAtLeast5Rate) ||
      !num(row.randomHitAtLeast5Rate)
    ) {
      return null;
    }
    rows.push({
      ticketCount: row.ticketCount as number,
      simulationCount: row.simulationCount as number,
      seed: row.seed as number,
      portfolioSeed: row.portfolioSeed as number,
      projectiveMeanBestMatch: row.projectiveMeanBestMatch as number,
      randomMeanBestMatch: row.randomMeanBestMatch as number,
      meanBestMatchDelta: row.meanBestMatchDelta as number,
      projectiveHitAtLeast4Rate: row.projectiveHitAtLeast4Rate as number,
      randomHitAtLeast4Rate: row.randomHitAtLeast4Rate as number,
      projectiveHitAtLeast5Rate: row.projectiveHitAtLeast5Rate as number,
      randomHitAtLeast5Rate: row.randomHitAtLeast5Rate as number,
    });
  }

  return {
    schemaVersion: 1,
    generatedAt: raw.generatedAt,
    rows,
    honestNote: raw.honestNote,
  };
}
