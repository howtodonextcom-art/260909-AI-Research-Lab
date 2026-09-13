/**
 * Ablation *summary* (GAP-01), derived read-only from `runAblation`'s
 * `AblationReport` (`lib/research/ablation.ts`).
 *
 * Mirrors the fs/pure split already used by `prospective-summary.ts` and
 * `bao18-summary.ts`: this module is pure (no filesystem, no RNG) and only
 * reshapes an already-computed `AblationReport` plus a few provenance fields
 * into a browser-fetchable, browser-parseable shape.
 * `scripts/export-ablation-summary.ts` is the only place that calls
 * `runAblation` against the real canonical dataset and writes the result to
 * `public/data/ablation-summary.json`.
 *
 * IMPORTANT — what this diagnostic is and is not: ablation here never
 * re-runs the walk-forward backtest (a strategy's own edge/p-value never
 * depends on which other strategies are also evaluated — see the header
 * comment in `ablation.ts`). The only real effect of "removing" a baseline
 * is on the Holm-Bonferroni family size, and therefore on the *adjusted*
 * p-values of the survivors. This is a multiple-testing-hygiene diagnostic
 * ("does shrinking the pre-registered family after the fact let a survivor
 * cross alpha that would not have crossed it otherwise") — it is NOT a
 * predictive-edge measurement and must never be presented as one.
 */
import type { AblatableStrategy, AblationReport } from "./ablation";

export type AblationSummaryPhase = {
  originalAdjustedPValue: number;
  ablatedAdjustedPValue: number;
  originalSignificant: boolean;
  ablatedSignificant: boolean;
  newlySignificantAfterAblation: boolean;
};

export type AblationSummaryDelta = {
  strategy: AblatableStrategy;
  validation: AblationSummaryPhase;
  test: AblationSummaryPhase;
};

export type AblationSummaryRow = {
  removed: AblatableStrategy;
  fullFamilySize: number;
  ablatedFamilySize: number;
  verdict: string;
  anyNewlySignificant: boolean;
  deltas: AblationSummaryDelta[];
};

export type AblationSummary = {
  schemaVersion: 1;
  generatedAt: string;
  datasetHash: string | null;
  datasetRecordCount: number;
  lookback: number;
  alpha: number;
  fullFamilySize: number;
  /** Ablation itself has no RNG — it is a deterministic recomputation of the Holm family over the real, already-computed walk-forward results. */
  deterministic: true;
  rows: AblationSummaryRow[];
  honestNote: string;
};

export const ABLATION_HONEST_NOTE =
  "Chẩn đoán độ nhạy của kích thước họ kiểm định Holm-Bonferroni (multiple-testing hygiene), KHÔNG PHẢI một phép đo lợi thế dự đoán (predictive edge). " +
  "Edge/p-value riêng của mỗi chiến lược không đổi khi bỏ chiến lược khác (bằng chứng: deltaValidationEdge luôn = 0). " +
  "Bảng dưới chỉ cho thấy: nếu bỏ một baseline khỏi họ kiểm định ĐÃ ĐĂNG KÝ TRƯỚC, các chiến lược còn lại có \"vượt alpha\" một cách giả tạo hay không — " +
  "một cảnh báo về p-hacking hình thức (family size phải cố định trước khi nhìn dữ liệu), không phải một khuyến nghị chọn chiến lược.";

function toPhase(phase: {
  originalAdjustedPValue: number;
  ablatedAdjustedPValue: number;
  originalSignificant: boolean;
  ablatedSignificant: boolean;
  newlySignificantAfterAblation: boolean;
}): AblationSummaryPhase {
  return {
    originalAdjustedPValue: phase.originalAdjustedPValue,
    ablatedAdjustedPValue: phase.ablatedAdjustedPValue,
    originalSignificant: phase.originalSignificant,
    ablatedSignificant: phase.ablatedSignificant,
    newlySignificantAfterAblation: phase.newlySignificantAfterAblation,
  };
}

export function buildAblationSummary(
  report: AblationReport,
  meta: { datasetHash: string | null; datasetRecordCount: number; now?: () => Date },
): AblationSummary {
  const now = meta.now ?? (() => new Date());
  const rows: AblationSummaryRow[] = report.ablations.map((ablation) => {
    const deltas: AblationSummaryDelta[] = ablation.deltas.map((delta) => ({
      strategy: delta.strategy,
      validation: toPhase(delta.validation),
      test: toPhase(delta.test),
    }));
    return {
      removed: ablation.removed,
      fullFamilySize: ablation.fullFamilySize,
      ablatedFamilySize: ablation.ablatedFamilySize,
      verdict: ablation.verdict,
      anyNewlySignificant: deltas.some(
        (delta) => delta.validation.newlySignificantAfterAblation || delta.test.newlySignificantAfterAblation,
      ),
      deltas,
    };
  });

  return {
    schemaVersion: 1,
    generatedAt: now().toISOString(),
    datasetHash: meta.datasetHash,
    datasetRecordCount: meta.datasetRecordCount,
    lookback: report.lookback,
    alpha: report.alpha,
    fullFamilySize: report.fullFamilySize,
    deterministic: true,
    rows,
    honestNote: ABLATION_HONEST_NOTE,
  };
}

const ABLATABLE_STRATEGIES: AblatableStrategy[] = ["HOT", "COLD", "BALANCED"];

function parsePhase(value: unknown): AblationSummaryPhase | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.originalAdjustedPValue !== "number" || !Number.isFinite(raw.originalAdjustedPValue)) return null;
  if (typeof raw.ablatedAdjustedPValue !== "number" || !Number.isFinite(raw.ablatedAdjustedPValue)) return null;
  if (typeof raw.originalSignificant !== "boolean") return null;
  if (typeof raw.ablatedSignificant !== "boolean") return null;
  if (typeof raw.newlySignificantAfterAblation !== "boolean") return null;
  return {
    originalAdjustedPValue: raw.originalAdjustedPValue,
    ablatedAdjustedPValue: raw.ablatedAdjustedPValue,
    originalSignificant: raw.originalSignificant,
    ablatedSignificant: raw.ablatedSignificant,
    newlySignificantAfterAblation: raw.newlySignificantAfterAblation,
  };
}

/**
 * Fail-closed client-side parse: malformed/missing shape -> `null` (render
 * an honest "not available" state), mirroring `parseProspectiveSummary` /
 * `parseBao18Summary`.
 */
export function parseAblationSummary(value: unknown): AblationSummary | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.schemaVersion !== 1) return null;
  if (typeof raw.generatedAt !== "string") return null;
  if (raw.datasetHash !== null && typeof raw.datasetHash !== "string") return null;
  if (typeof raw.datasetRecordCount !== "number" || !Number.isFinite(raw.datasetRecordCount)) return null;
  if (typeof raw.lookback !== "number" || !Number.isFinite(raw.lookback)) return null;
  if (typeof raw.alpha !== "number" || !Number.isFinite(raw.alpha)) return null;
  if (typeof raw.fullFamilySize !== "number" || !Number.isFinite(raw.fullFamilySize)) return null;
  if (raw.deterministic !== true) return null;
  if (typeof raw.honestNote !== "string" || raw.honestNote.length === 0) return null;
  if (!Array.isArray(raw.rows)) return null;

  const rows: AblationSummaryRow[] = [];
  for (const item of raw.rows) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (!ABLATABLE_STRATEGIES.includes(row.removed as AblatableStrategy)) return null;
    if (typeof row.fullFamilySize !== "number") return null;
    if (typeof row.ablatedFamilySize !== "number") return null;
    if (typeof row.verdict !== "string") return null;
    if (typeof row.anyNewlySignificant !== "boolean") return null;
    if (!Array.isArray(row.deltas)) return null;

    const deltas: AblationSummaryDelta[] = [];
    for (const deltaItem of row.deltas) {
      if (!deltaItem || typeof deltaItem !== "object") return null;
      const delta = deltaItem as Record<string, unknown>;
      if (!ABLATABLE_STRATEGIES.includes(delta.strategy as AblatableStrategy)) return null;
      const validation = parsePhase(delta.validation);
      const test = parsePhase(delta.test);
      if (!validation || !test) return null;
      deltas.push({ strategy: delta.strategy as AblatableStrategy, validation, test });
    }

    rows.push({
      removed: row.removed as AblatableStrategy,
      fullFamilySize: row.fullFamilySize,
      ablatedFamilySize: row.ablatedFamilySize,
      verdict: row.verdict,
      anyNewlySignificant: row.anyNewlySignificant,
      deltas,
    });
  }

  return {
    schemaVersion: 1,
    generatedAt: raw.generatedAt,
    datasetHash: (raw.datasetHash as string | null) ?? null,
    datasetRecordCount: raw.datasetRecordCount,
    lookback: raw.lookback,
    alpha: raw.alpha,
    fullFamilySize: raw.fullFamilySize,
    deterministic: true,
    rows,
    honestNote: raw.honestNote,
  };
}
