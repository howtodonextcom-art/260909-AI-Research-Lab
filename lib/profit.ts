// Exact hypergeometric model: six distinct numbers, fair 6/45 draw.
export function choose(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0) throw new Error("Invalid combination");
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= Math.min(k, n - k); i++) result = result * (n - i + 1) / i;
  return Math.round(result);
}

export const outcomes = Array.from({ length: 7 }, (_, matches) => ({
  matches,
  combinations: choose(6, matches) * choose(39, 6 - matches),
  probability: choose(6, matches) * choose(39, 6 - matches) / choose(45, 6),
  payout: matches === 6 ? null : matches === 5 ? 10_000_000 : matches === 4 ? 300_000 : matches === 3 ? 30_000 : 0,
}));

export function profitLedger(previousLosses: number, payout: number) {
  if (!Number.isInteger(previousLosses) || previousLosses < 0 || previousLosses > 10000 ||
      !Number.isFinite(payout) || payout < 0) throw new Error("Invalid ledger");
  const cost = (previousLosses + 1) * 10000;
  return { cost, payout, net: payout - cost, requiredFor20k: cost + 20000 };
}

export function fixedPrizeExpectation() {
  return outcomes.reduce((sum, outcome) => sum + outcome.probability * (outcome.payout ?? 0), 0);
}
