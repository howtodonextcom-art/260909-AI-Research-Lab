/**
 * Sequential alpha-spending for unplanned re-looks at accumulating data.
 *
 * Lan–DeMets (1983) spending with the Pocock (1977) function:
 *   α*(t) = α · ln(1 + (e − 1) · t),  t ∈ [0, 1]
 *
 * A new `datasetHash` is one look. The current look is treated as the last of
 * K = lookCount equally spaced looks (t_k = k/K). The alpha used at this look
 * is the incremental spend α*(k/K) − α*((k−1)/K). Holm still runs inside the
 * look on the hypothesis family; this module only spends across looks.
 *
 * lookCount === 1 → alpha unchanged. No CURRENT_PROTOCOL fields are added.
 */

export function pocockCumulativeSpend(informationFraction: number, alpha: number): number {
  if (!Number.isFinite(alpha) || alpha <= 0) return 0;
  const t = Math.min(1, Math.max(0, informationFraction));
  return alpha * Math.log(1 + (Math.E - 1) * t);
}

/** Incremental Pocock spend at look `lookCount` (1-based). */
export function spentAlphaForLook(lookCount: number, alpha = 0.05): number {
  const k = Math.max(1, Math.floor(lookCount));
  if (!Number.isFinite(alpha) || alpha <= 0) return 0;
  if (k === 1) return alpha;
  return pocockCumulativeSpend(1, alpha) - pocockCumulativeSpend((k - 1) / k, alpha);
}
