# Exact Random vs Projective Benchmark

Master prompt §8 (HIGH priority). All numbers below are exact, closed-form
probabilities — no Monte Carlo, no simulation. Computed by
`lib/research/exact-benchmark.ts`'s `computeExactBenchmark`, which is covered
by `lib/research/exact-benchmark.test.ts` (8 tests, wired into
`npm run test:business`).

## What is being compared

Two ways to pick N Mega 6/45 tickets for one draw, at the SAME N (same cost):

1. **Projective** — N tickets from `optimizePortfolio`'s projective-plane
   construction (pairwise ticket-overlap ≤ 1). `lib/portfolio.ts` proves that
   under this construction, "ticket_i matches ≥4" and "ticket_j matches ≥4"
   are mutually exclusive for every pair, so `P(at least one ticket matches
   ≥4)` is an EXACT linear sum, not an approximation.
2. **Independent random** — N tickets drawn independently at random
   (repeats allowed, the same model `lib/research/bao.ts`'s
   `randomSameNJackpotEstimate` already uses for the jackpot case). Here
   ticket outcomes are independent, so
   `P(at least one of N matches >= k) = 1 - (1 - p_k)^N`, where `p_k` is the
   exact hypergeometric probability that one random ticket matches ≥k
   numbers (from `lib/profit.ts`'s `outcomes` table).

**Lift** = Projective − Independent random, reported both as absolute
percentage points (đpt) and as a relative ratio (%) of the independent-random
value.

## Worked example: N = 10 (default portfolio size)

Per-ticket exact probabilities (hypergeometric, `choose(45,6) = 8,145,060`):

- `p(match >= 4)` = (C(6,4)·C(39,2) + C(6,5)·C(39,1) + C(6,6)·C(39,0)) / 8,145,060
  = (15·741 + 6·39 + 1·1) / 8,145,060 = 11,350 / 8,145,060 ≈ **0.13934827%**
- `p(match >= 5)` = (6·39 + 1) / 8,145,060 = 235 / 8,145,060 ≈ **0.00288518%**
- `p(jackpot)` = 1 / 8,145,060 ≈ **0.00001228%**

Projective (N=10, exact linear sum from `calculatePortfolioOdds(10)`):

| Tier | Projective | Independent random `1-(1-p)^10` | Lift (abs) | Lift (rel) |
|---|---|---|---|---|
| ≥4 | 1.393483% | 1.384777% | +0.0087 đpt | +0.629% |
| ≥5 | 0.028852% | 0.028848% | +0.0000037 đpt | +0.013% |
| Jackpot | 0.00012277% | 0.00012277% | +0.00000000068 đpt | +0.00006% |

(Independent-random ≥4 = `1 - (1-0.0013934827)^10 = 0.01384777`; the
projective value is exactly `10 × 0.0013934827 = 0.013934827` — matches the
table.)

## N = 20 and N = 30 (also shown live in the UI)

| N | Projective ≥4 / ≥5 / Jackpot | Random ≥4 / ≥5 / Jackpot | Lift ≥4 (abs / rel) | Lift ≥5 (abs / rel) | Lift Jackpot (abs / rel) |
|---|---|---|---|---|---|
| 20 | 2.786965% / 0.057704% / 0.00024555% | 2.750378% / 0.057688% / 0.00024555% | +0.0366 đpt / +1.330% | +0.0000158 đpt / +0.027% | +0.0000000029 đpt / +0.00012% |
| 30 | 4.180448% / 0.086556% / 0.00036832% | 4.097068% / 0.086519% / 0.00036832% | +0.0834 đpt / +2.035% | +0.0000362 đpt / +0.042% | +0.0000000066 đpt / +0.00018% |

## Honesty framing (required copy, §8)

> Projective giúp chủ yếu bằng cách giảm chồng lặp giữa các vé (loại bỏ việc
> hai vé cùng chiếm một kết quả trúng từ 4 số trở lên). Nó KHÔNG làm một vé
> riêng lẻ nào có xác suất trúng cao hơn — xác suất trúng của mỗi vé đơn lẻ
> giống hệt một vé ngẫu nhiên. Mức chênh lệch (lift) dưới đây phản ánh đúng
> con số tính toán được, kể cả khi rất nhỏ.

(Exported as `EXACT_BENCHMARK_CAVEAT` from `lib/research/exact-benchmark.ts`
and rendered verbatim in `components/portfolio-lab.tsx`.)

## Interpretation — report the true number, do not dress it up

- The lift is real, exact, and **provably non-negative for every N** (proof:
  Bernoulli's inequality gives `(1-p)^N >= 1-Np`, so
  `1-(1-p)^N <= Np = projective`, with equality only at N=1 — this is also
  asserted as a test invariant).
- The lift is **small in absolute terms** at every N in the 1–30 range this
  app supports: at N=30 the ≥4 lift is 0.08 percentage points (≈2% relative
  improvement over independent random), and the ≥5/jackpot lifts are smaller
  still (jackpot lift is a fraction of a millionth of a percentage point).
- At N=1 the two arms are mathematically identical (no portfolio structure
  exists for a single ticket) — verified as an explicit test.
- This is the expected, correct scientific finding for this project:
  Projective portfolio structure gives a small, real, exact reduction in
  ticket-to-ticket overlap for the ≥4/≥5 tiers. It does **not** change any
  single ticket's own probability of winning, and it does not create a large
  predictive edge. Scientific grade remains **C — NO DEMONSTRATED EDGE**.

## Where this lives in the app

- Engine + tests: `lib/research/exact-benchmark.ts`, `lib/research/exact-benchmark.test.ts`
- UI: `components/portfolio-lab.tsx` — new "Projective vs Random độc lập — cùng số vé"
  table, placed directly after the budget/odds card and before the ticket
  list, so it is at least as prominent as any other panel on the Portfolio
  tab (there is no Monte Carlo panel on this tab to demote — the existing
  `CostFrontierPanel` below it is also exact, not simulated).
- Rows shown: N=10, the currently selected N (if different), N=20, N=30.
