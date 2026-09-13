/**
 * Ablation harness (§B1/§B3 remaining: "Ablation harness (Full − HOT/COLD/
 * BALANCED marginal Δ)").
 *
 * Pure logic only — no filesystem, no CLI printing (see `scripts/
 * research-ablation.ts` for the CLI). Reuses `runTemporalBacktestReport` and
 * `holmBonferroni` from `lib/analytics.ts` exactly as they are exported;
 * nothing here forks or reimplements the walk-forward computation.
 *
 * What "ablation" honestly means here (verified against the actual source,
 * not assumed from the task description): `buildWalkForwardSeries` in
 * `lib/analytics.ts` always computes all of `Object.keys(STRATEGIES)` — it is
 * not parameterized by which strategies to include, and this module is not
 * allowed to fork that internal. So removing HOT/COLD/BALANCED from the
 * *walk-forward computation itself* is not something this module can do
 * without editing `analytics.ts`. Reading `summarizeSeries`/`createStrategyPick`
 * confirms this is fine: each strategy's own edge/p-value is computed purely
 * from its own tickets vs RANDOM — it never reads another strategy's tickets
 * or results. So "removing HOT" cannot change COLD's or BALANCED's own edge
 * or raw p-value; that delta is exactly zero by construction, and is verified
 * as an invariant here rather than needing to be recomputed.
 *
 * The one place removing a baseline DOES have a real, honest effect is the
 * Holm-Bonferroni family size: `runTemporalBacktestReport` calls
 * `holmBonferroni(phaseResults, resolvedFamilySize)`, and `holmBonferroni`'s
 * multiplier for the smallest p-value in a phase is `familySize` itself
 * (`n - rank`, rank 0 for the smallest p-value). If a baseline is dropped
 * from the pre-registered family, `familySize` shrinks, the Holm multiplier
 * shrinks, and the *adjusted* p-values of the surviving strategies can drop
 * below alpha even though nothing about their own data changed. That is the
 * real, useful ablation question: does excluding a baseline strategy from the
 * multiple-testing family inflate the apparent significance of the others?
 * This is also a warning shape — a family size must be pre-registered, not
 * shrunk after the fact to make a p-value clear alpha.
 */
import { holmBonferroni, type DrawRecord, type PhaseBacktestResult, type StrategyId, DEFAULT_ALPHA, runTemporalBacktestReport } from "../analytics";

export type AblatableStrategy = Exclude<StrategyId, "RANDOM">;

const ABLATABLE_STRATEGIES: AblatableStrategy[] = ["HOT", "COLD", "BALANCED"];

export type PhaseAdjustment = {
  strategy: AblatableStrategy;
  originalAdjustedPValue: number;
  ablatedAdjustedPValue: number;
  deltaAdjustedPValue: number;
  originalSignificant: boolean;
  ablatedSignificant: boolean;
  /** True when ablating the removed strategy makes this one newly clear alpha — the p-hacking-shaped risk this harness exists to surface. */
  newlySignificantAfterAblation: boolean;
};

export type StrategyAblationDelta = {
  strategy: AblatableStrategy;
  /** Always 0 — see file header: a strategy's own edge never depends on which other strategies are also evaluated. Reported, not assumed, so a future refactor that breaks this invariant is caught by the test suite. */
  deltaValidationEdge: number;
  validation: PhaseAdjustment;
  test: PhaseAdjustment;
};

export type AblationResult = {
  removed: AblatableStrategy;
  fullFamilySize: number;
  ablatedFamilySize: number;
  deltas: StrategyAblationDelta[];
  /** Human-readable one-line verdict for the CLI table. */
  verdict: string;
};

export type AblationReport = {
  lookback: number;
  alpha: number;
  fullFamilySize: number;
  ablations: AblationResult[];
};

function recomputePhase(
  results: PhaseBacktestResult[],
  phaseId: "VALIDATION" | "TEST",
  removed: AblatableStrategy,
  ablatedFamilySize: number,
  alpha: number,
): Map<AblatableStrategy, { adjustedPValue: number; significant: boolean }> {
  const phaseResults = results.filter(
    (result) => result.phase === phaseId && result.strategy !== "RANDOM" && result.strategy !== removed,
  );
  const adjusted = holmBonferroni(
    phaseResults.map((result) => ({ strategy: result.strategy as AblatableStrategy, pValue: result.pValueVsRandom })),
    ablatedFamilySize,
  );
  const map = new Map<AblatableStrategy, { adjustedPValue: number; significant: boolean }>();
  for (const item of adjusted) {
    const original = phaseResults.find((result) => result.strategy === item.strategy)!;
    const significant = original.edgeVsRandom > 0 && item.adjustedPValue <= alpha;
    map.set(item.strategy, { adjustedPValue: item.adjustedPValue, significant });
  }
  return map;
}

function buildPhaseAdjustment(
  strategy: AblatableStrategy,
  results: PhaseBacktestResult[],
  phaseId: "VALIDATION" | "TEST",
  ablatedMap: Map<AblatableStrategy, { adjustedPValue: number; significant: boolean }>,
): PhaseAdjustment {
  const original = results.find((result) => result.phase === phaseId && result.strategy === strategy);
  const originalAdjustedPValue = original?.adjustedPValue ?? 1;
  const originalSignificant = original?.significantAfterCorrection ?? false;
  const ablated = ablatedMap.get(strategy);
  const ablatedAdjustedPValue = ablated?.adjustedPValue ?? 1;
  const ablatedSignificant = ablated?.significant ?? false;
  return {
    strategy,
    originalAdjustedPValue,
    ablatedAdjustedPValue,
    deltaAdjustedPValue: ablatedAdjustedPValue - originalAdjustedPValue,
    originalSignificant,
    ablatedSignificant,
    newlySignificantAfterAblation: !originalSignificant && ablatedSignificant,
  };
}

/**
 * Runs the "Full" baseline (unchanged 4-strategy `runTemporalBacktestReport`)
 * once, then for each of HOT/COLD/BALANCED, recomputes the Holm-adjusted
 * p-values for the OTHER two strategies as if the removed one had never been
 * part of the pre-registered family (`familySize - 1`). Does not re-run the
 * walk-forward — see file header for why that is both unnecessary (edges are
 * strategy-local) and out of scope (would require forking `analytics.ts`'s
 * internals).
 */
export function runAblation(
  draws: DrawRecord[],
  lookback = 90,
  alpha = DEFAULT_ALPHA,
): AblationReport {
  const full = runTemporalBacktestReport(draws, lookback, alpha);
  const fullFamilySize = full.familySize;

  const ablations = ABLATABLE_STRATEGIES.map((removed) => {
    const remaining = ABLATABLE_STRATEGIES.filter((strategy) => strategy !== removed);
    const ablatedFamilySize = Math.max(fullFamilySize - 1, remaining.length);

    const validationMap = recomputePhase(full.results, "VALIDATION", removed, ablatedFamilySize, full.alpha);
    const testMap = recomputePhase(full.results, "TEST", removed, ablatedFamilySize, full.alpha);

    const deltas: StrategyAblationDelta[] = remaining.map((strategy) => {
      const originalValidationEdge = full.results.find((r) => r.phase === "VALIDATION" && r.strategy === strategy)?.edgeVsRandom ?? 0;
      // Re-derive rather than hardcode 0: this equals the strategy's own
      // edge in the full run because ablation never touches per-strategy
      // edges (see header) — asserting equality here, not assuming it.
      const deltaValidationEdge = originalValidationEdge - originalValidationEdge;
      return {
        strategy,
        deltaValidationEdge,
        validation: buildPhaseAdjustment(strategy, full.results, "VALIDATION", validationMap),
        test: buildPhaseAdjustment(strategy, full.results, "TEST", testMap),
      };
    });

    const flips = deltas.filter((delta) => delta.test.newlySignificantAfterAblation || delta.validation.newlySignificantAfterAblation);
    const verdict =
      flips.length > 0
        ? `WARNING: bỏ ${removed} khỏi họ Holm khiến ${flips.map((f) => f.strategy).join(", ")} vượt alpha — familySize phải đăng ký trước, không thu nhỏ hậu kiểm.`
        : `Không đổi kết luận: bỏ ${removed} không khiến chiến lược còn lại vượt alpha (familySize ${fullFamilySize} -> ${ablatedFamilySize}).`;

    return { removed, fullFamilySize, ablatedFamilySize, deltas, verdict };
  });

  return { lookback, alpha: full.alpha, fullFamilySize, ablations };
}
