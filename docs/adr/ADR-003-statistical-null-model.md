# ADR-003: Exact null model, Monte Carlo engine, and the fairness diagnostic fix

## Status
Accepted, implemented.

## Context
`lib/profit.ts` already computed the exact hypergeometric match-count
distribution (`outcomes`, conserving all 8,145,060 combinations, tested).
What was missing was (a) exposing it as a documented, reusable "exact null"
API, (b) a reproducible Monte Carlo engine for statistics without a
convenient closed form, and (c) fixing the chi-square "fairness" diagnostic
the UI displayed, which asserted a `chi-square(44)` reference distribution
("44 bậc tự do · giá trị gần 44 nghĩa là dữ liệu phù hợp quay công bằng").
That assertion is not strictly correct: Mega 6/45 samples six numbers
*without replacement* per draw, so the 45 per-number counts are negatively
correlated, and the classical independent-category chi-square reference
distribution does not strictly apply to them.

## Decision
- `lib/research/statistics.ts` exposes `matchProbability`,
  `tailProbabilityAtLeast`, `expectedPrizeFrequency`, `EXPECTED_MATCHES`
  (0.8) and `MATCH_VARIANCE`, all *derived from* `profit.ts`'s existing
  `outcomes` table rather than re-implemented, so there is one source of
  truth for the exact distribution.
- `PRIMARY_ENDPOINT` (§18) is documented explicitly: mean matched numbers
  per ticket, chosen because its null distribution is exact and tractable,
  unlike payout/ROI (dominated by rare high-tier prizes).
- `lib/research/rng.ts` + `runMonteCarloNull()` (§20): a seeded
  (mulberry32), deterministic Monte Carlo engine. Same `(drawCount, seed,
  simulationCount, statistic)` always produces byte-identical samples —
  verified by a reproducibility test — so an experiment artifact can record
  just the seed instead of the simulated data.
- `monteCarloFairnessDiagnostic()` (§21) replaces the naive framing: it
  computes the *same* `chiSquareStatistic` (unchanged, still used) on the
  real data, then calibrates it against an empirical null built from
  simulated fair datasets of the same size, reporting a Monte Carlo
  p-value with its seed and simulation count instead of a df claim. The UI
  metric tile was changed from "Chi-square mô tả / 44 bậc tự do…" to
  "Chẩn đoán độ công bằng (Monte Carlo)" showing `Q`, `p`, simulation
  count and seed together — verified rendering correctly against the live
  1561-record dataset (screenshot-checked, no console errors).

## Consequences
- The UI's per-render Monte Carlo simulation count is capped at 300 (vs.
  2000+ default elsewhere) to stay responsive on the largest ("Toàn bộ")
  window; this trades some precision in the displayed p-value for
  interactivity. CLI/test usage can request higher counts.
- §22 (bootstrap/permutation as an alternative to the z-test for CI/testing)
  and the deeper §23 rework (family-aware multiple testing across the full
  registry history, not just the currently-visible strategy set) were not
  implemented in this pass — the existing paired z-test on per-draw
  differences already satisfies §22's "prefer paired procedures" guidance,
  and a bootstrap/permutation alternative is listed as deferred work in the
  final report rather than rushed.
