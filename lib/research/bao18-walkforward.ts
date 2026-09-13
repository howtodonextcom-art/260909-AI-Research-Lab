/**
 * Bao-18 "reverse proof" walk-forward audit (Master Prompt v2.0).
 *
 * Research question: does a rule that builds an 18-number pool from purely
 * historical data raise P(R_t ⊆ P_t) above the fair-null hypergeometric rate,
 * once look-ahead is structurally impossible? Two protocols answer this:
 *
 * - Protocol A ("reverse peek"): the pool is seeded with the *real* winning
 *   numbers of the target draw. This is a deliberate, labeled negative
 *   control — a tautology that must score 100% — proving the harness can
 *   detect a real leak, exactly like `negative-controls.ts`'s Control F.
 * - Protocol B (walk-forward): the pool for target index `t` is built from
 *   `draws.slice(0, t)` only — the target's own array slot is structurally
 *   excluded from the input the builder ever sees, not merely a promise not
 *   to read it. `runRuleWalkForward`/`runProtocolA` are the only places that
 *   perform this slicing, so anti-leak tests exercise them directly rather
 *   than trusting `buildPool18`'s internals in isolation.
 *
 * Pure logic only — no filesystem, no console — mirroring the split used
 * throughout this codebase (see `prospective.ts`'s header). CLI orchestration,
 * provenance, and artifact writing live in `scripts/audit-bao18-walkforward.ts`.
 *
 * Never enumerates the 18,564 Bao-18 tickets for the primary endpoint — the
 * exact lower-tier match-count formula `N_j(m) = C(m,j) * C(18-m, 6-j)`
 * (`exactMatchTierCount`) answers the same question in O(1). The one place
 * this codebase *does* enumerate is a test fixture in
 * `bao18-walkforward.test.ts` that proves the closed form against brute force
 * once, per Master Prompt v2.0 §29.
 */
import { calculateFrequency } from "../analytics";
import { holmBonferroni } from "../analytics";
import { baoCost, baoJackpotProbability, baoTickets } from "./bao";
import { createRng } from "./rng";
import { choose } from "../profit";
import { FIXED_PRIZE, MEGA_645 } from "../mega645";
import { sha256Hex } from "../data/hash";
import type { DrawRecord } from "../data/types";

export const POOL_SIZE = 18 as const;

export const BAO18_NON_RANDOM_RULES = ["HOT18", "COLD18", "OVERDUE18", "BALANCED18"] as const;
export type Bao18NonRandomRule = (typeof BAO18_NON_RANDOM_RULES)[number];
export type Bao18Rule = "RANDOM18" | Bao18NonRandomRule;
export const BAO18_RULES: Bao18Rule[] = ["RANDOM18", ...BAO18_NON_RANDOM_RULES];

export type Bao18Context = {
  /** Index of the draw being predicted, in the caller's full `draws` array. */
  targetIndex: number;
  /** Global experiment seed. RANDOM18's stream depends only on this + targetIndex, never on history. */
  seed: number;
  /** Historical window size used by every history-based rule (HOT18/COLD18/OVERDUE18/BALANCED18). */
  lookback: number;
};

// ---------------------------------------------------------------------------
// Deterministic seed mixing (avoids two rules ever sharing an RNG stream by
// accident; not cryptographic, just a standard integer hash mix).
// ---------------------------------------------------------------------------
export function combineSeed(seed: number, salt: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ salt, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

function shuffleCopy<T>(items: readonly T[], rng: () => number): T[] {
  const pool = items.slice();
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

const ALL_NUMBERS: readonly number[] = Array.from({ length: MEGA_645.max }, (_, i) => i + 1);

// ---------------------------------------------------------------------------
// Pool builders — Protocol B (valid walk-forward, history-only)
// ---------------------------------------------------------------------------

/**
 * Builds an 18-number pool for `context.targetIndex` using ONLY `history`
 * (already the caller's `draws.slice(0, targetIndex)` — the target's own
 * result is never in this array, structurally, not by discipline).
 *
 * RANDOM18 ignores `history` entirely by design (§11: "Không phụ thuộc R_t",
 * and — to be an unconditional empirical baseline — not on any other history
 * either; its stream depends only on `seed` and `targetIndex`).
 *
 * HOT18/COLD18/OVERDUE18/BALANCED18 all use the SAME `lookback`-sized window
 * (`history.slice(-lookback)`) — a single pre-registered choice applied
 * uniformly across the rule family, not tuned per rule.
 */
export function buildPool18(history: readonly DrawRecord[], rule: Bao18Rule, context: Bao18Context): number[] {
  if (rule === "RANDOM18") {
    const rng = createRng(combineSeed(context.seed, context.targetIndex));
    return shuffleCopy(ALL_NUMBERS, rng).slice(0, POOL_SIZE).sort((a, b) => a - b);
  }

  const windowDraws = history.slice(Math.max(0, history.length - context.lookback));
  const rows = calculateFrequency(windowDraws as DrawRecord[]);

  if (rule === "HOT18") {
    return rows
      .slice()
      .sort((a, b) => b.count - a.count || a.number - b.number)
      .slice(0, POOL_SIZE)
      .map((r) => r.number)
      .sort((a, b) => a - b);
  }

  if (rule === "COLD18") {
    return rows
      .slice()
      .sort((a, b) => a.count - b.count || b.gap - a.gap || a.number - b.number)
      .slice(0, POOL_SIZE)
      .map((r) => r.number)
      .sort((a, b) => a - b);
  }

  if (rule === "OVERDUE18") {
    return rows
      .slice()
      .sort((a, b) => b.gap - a.gap || a.number - b.number)
      .slice(0, POOL_SIZE)
      .map((r) => r.number)
      .sort((a, b) => a - b);
  }

  // BALANCED18: generalizes the repo's existing BALANCED strategy (2 picks per
  // band of 15, chosen by |deltaPercent| ascending then number ascending) to
  // 6 picks per band — 18 / 3 bands divides exactly, so the split is forced,
  // not a free parameter chosen after seeing results. Same tie-break, same
  // window as every other history-based rule.
  const perBand = POOL_SIZE / 3;
  const picks = [0, 1, 2].flatMap((band) =>
    rows
      .filter((row) => Math.floor((row.number - 1) / 15) === band)
      .sort((a, b) => Math.abs(a.deltaPercent) - Math.abs(b.deltaPercent) || a.number - b.number)
      .slice(0, perBand)
      .map((row) => row.number),
  );
  return picks.sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Protocol A — reverse peek / circular oracle (INVALID_AS_EVIDENCE_OF_EDGE)
// ---------------------------------------------------------------------------

/**
 * Seeds the pool with the real winning numbers, then fills the remaining 12
 * slots from the complement via seeded RNG. This is a tautology by
 * construction: `poolHit6` MUST be true 100% of the time. It exists solely to
 * prove the audit harness can detect a real leak (mirrors negative-controls
 * Control F) — never used as evidence of predictive edge.
 */
export function buildProtocolAPool(targetResult: readonly number[], seed: number, targetIndex: number): number[] {
  const resultSet = new Set(targetResult);
  const complement = ALL_NUMBERS.filter((n) => !resultSet.has(n));
  const rng = createRng(combineSeed(seed, targetIndex) ^ 0x5a5a5a5a);
  const extra = shuffleCopy(complement, rng).slice(0, POOL_SIZE - targetResult.length);
  return [...targetResult, ...extra].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export function intersectionCount(pool: readonly number[], result: readonly number[]): number {
  const poolSet = new Set(pool);
  return result.filter((n) => poolSet.has(n)).length;
}

export function poolHit6(pool: readonly number[], result: readonly number[]): boolean {
  return intersectionCount(pool, result) === MEGA_645.pickCount;
}

function assertValidPool(pool: readonly number[], rule: string, targetIndex: number): void {
  if (pool.length !== POOL_SIZE || new Set(pool).size !== POOL_SIZE) {
    throw new Error(`Rule ${rule} tại t=${targetIndex} trả pool không đúng 18 số duy nhất (§35 fail-closed).`);
  }
  if (pool.some((n) => !Number.isInteger(n) || n < MEGA_645.min || n > MEGA_645.max)) {
    throw new Error(`Rule ${rule} tại t=${targetIndex} trả pool chứa số ngoài 1..45 (§35 fail-closed).`);
  }
}

// ---------------------------------------------------------------------------
// Evaluation window (§14)
// ---------------------------------------------------------------------------

export type EvaluationRange = { start: number; end: number; evaluatedCount: number; skippedWarmup: number };

export function evaluationRange(totalDraws: number, lookback: number): EvaluationRange {
  const start = lookback;
  const end = totalDraws - 1;
  const evaluatedCount = Math.max(0, end - start + 1);
  return { start, end, evaluatedCount, skippedWarmup: Math.min(totalDraws, lookback) };
}

// ---------------------------------------------------------------------------
// Walk-forward runners
// ---------------------------------------------------------------------------

export type Bao18Observation = {
  targetIndex: number;
  drawId: string;
  drawDate: string;
  k: number;
  hit6: boolean;
};

/**
 * The pool a rule would produce for `targetIndex`, given the FULL `draws`
 * array. Slices to `draws.slice(0, targetIndex)` internally — this is the one
 * place that slicing happens, so anti-leak tests exercise this function
 * (or `runRuleWalkForward`, which calls it) rather than trusting `buildPool18`
 * in isolation.
 */
export function poolForTarget(
  draws: readonly DrawRecord[],
  rule: Bao18Rule,
  seed: number,
  lookback: number,
  targetIndex: number,
): number[] {
  return buildPool18(draws.slice(0, targetIndex), rule, { targetIndex, seed, lookback });
}

/** Runs one non-random or RANDOM18 rule across the full evaluation range. Fail-closed on any malformed pool. */
export function runRuleWalkForward(
  draws: readonly DrawRecord[],
  rule: Bao18Rule,
  seed: number,
  lookback: number,
): Bao18Observation[] {
  const { start, end } = evaluationRange(draws.length, lookback);
  const observations: Bao18Observation[] = [];
  for (let t = start; t <= end; t += 1) {
    const pool = poolForTarget(draws, rule, seed, lookback, t);
    assertValidPool(pool, rule, t);
    const draw = draws[t];
    const k = intersectionCount(pool, draw.result);
    observations.push({ targetIndex: t, drawId: draw.id, drawDate: draw.date, k, hit6: k === MEGA_645.pickCount });
  }
  return observations;
}

/** Runs Protocol A (reverse peek) across the SAME evaluation range as Protocol B, for a fair side-by-side. */
export function runProtocolA(draws: readonly DrawRecord[], seed: number, lookback: number): Bao18Observation[] {
  const { start, end } = evaluationRange(draws.length, lookback);
  const observations: Bao18Observation[] = [];
  for (let t = start; t <= end; t += 1) {
    const draw = draws[t];
    const pool = buildProtocolAPool(draw.result, seed, t);
    assertValidPool(pool, "PROTOCOL_A", t);
    const k = intersectionCount(pool, draw.result);
    observations.push({ targetIndex: t, drawId: draw.id, drawDate: draw.date, k, hit6: k === MEGA_645.pickCount });
  }
  return observations;
}

// ---------------------------------------------------------------------------
// Exact lower-tier combinatorics (§5) — no ticket enumeration in production paths
// ---------------------------------------------------------------------------

/** N_j(m) = C(m,j) × C(poolSize-m, 6-j): exact count of full-Bao tickets matching exactly j numbers, given m = |pool ∩ result|. */
export function exactMatchTierCount(poolSize: number, m: number, j: number): number {
  return choose(m, j) * choose(poolSize - m, MEGA_645.pickCount - j);
}

export type Tier = "THIRD" | "SECOND" | "FIRST" | "JACKPOT";

/** Fixed-prize-only gross payout (VND) for the WHOLE Bao-poolSize cover, given m = |pool ∩ result|. Jackpot excluded (variable, §5/§20). */
export function fixedPrizePayoutForDraw(poolSize: number, m: number): number {
  const third = exactMatchTierCount(poolSize, m, 3) * FIXED_PRIZE.THIRD;
  const second = exactMatchTierCount(poolSize, m, 4) * FIXED_PRIZE.SECOND;
  const first = exactMatchTierCount(poolSize, m, 5) * FIXED_PRIZE.FIRST;
  return third + second + first;
}

/** Number of the poolSize-cover's tickets that are the exact winning ticket, given m. Nonzero only when m=6. */
export function exactJackpotTicketCount(poolSize: number, m: number): number {
  return exactMatchTierCount(poolSize, m, MEGA_645.pickCount);
}

// ---------------------------------------------------------------------------
// Exact binomial statistics (§16) — dependency-free, log-space for stability
// ---------------------------------------------------------------------------

/** Lanczos approximation to ln(Γ(x)), g=7 n=9 — standard, textbook coefficients. */
export function logGamma(x: number): number {
  const g = 7;
  const coefficients = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  const xm1 = x - 1;
  let a = coefficients[0];
  const t = xm1 + g + 0.5;
  for (let i = 1; i < g + 2; i += 1) a += coefficients[i] / (xm1 + i);
  return 0.5 * Math.log(2 * Math.PI) + (xm1 + 0.5) * Math.log(t) - t + Math.log(a);
}

export function logChoose(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  if (k === 0 || k === n) return 0;
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

export function binomialPmf(n: number, k: number, p: number): number {
  if (k < 0 || k > n || !Number.isInteger(k)) return 0;
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  return Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

/** Exact P(X >= x | X~Binomial(n,p)) — the primary one-sided p-value for `poolHit6` (§16). */
export function binomialTailAtLeast(n: number, x: number, p: number): number {
  if (x <= 0) return 1;
  if (x > n) return 0;
  let sum = 0;
  for (let k = x; k <= n; k += 1) sum += binomialPmf(n, k, p);
  return Math.min(1, Math.max(0, sum));
}

export function binomialCdf(n: number, x: number, p: number): number {
  return 1 - binomialTailAtLeast(n, x + 1, p);
}

function bisect(f: (p: number) => number, lo: number, hi: number, iterations = 100): number {
  let a = lo;
  let b = hi;
  for (let i = 0; i < iterations; i += 1) {
    const mid = (a + b) / 2;
    if (f(mid) < 0) a = mid;
    else b = mid;
  }
  return (a + b) / 2;
}

export type BinomialCI = { lower: number; upper: number };

/**
 * Exact Clopper–Pearson 95% CI, obtained by bisecting the SAME exact binomial
 * tail function used for the primary p-value (not a Wilson/normal
 * approximation) — solving `P(X>=x|p=L)=alpha/2` and `P(X<=x|p=U)=alpha/2` to
 * double-precision via bisection is mathematically exact Clopper-Pearson, just
 * computed without a closed-form incomplete-beta quantile.
 */
export function clopperPearsonCI(n: number, x: number, alpha = 0.05): BinomialCI {
  const lower = x <= 0 ? 0 : bisect((p) => binomialTailAtLeast(n, x, p) - alpha / 2, 0, 1);
  const upper = x >= n ? 1 : bisect((p) => binomialTailAtLeast(n, x + 1, p) - (1 - alpha / 2), 0, 1);
  return { lower, upper };
}

/** Smallest k with P(X<=k) >= q, for X~Binomial(n,p) — used for the null count's predictive interval (§19). */
export function binomialQuantile(n: number, p: number, q: number): number {
  let cumulative = 0;
  for (let k = 0; k <= n; k += 1) {
    cumulative += binomialPmf(n, k, p);
    if (cumulative >= q) return k;
  }
  return n;
}

export { holmBonferroni };

// ---------------------------------------------------------------------------
// Paired comparison vs RANDOM18 (§18)
// ---------------------------------------------------------------------------

export type McNemarResult = { kind: "exact"; discordant: number; pValue: number } | { kind: "insufficient" };

/** McNemar's exact test (two-sided) via the same binomial machinery — b,c are the two discordant-cell counts. */
export function exactMcNemar(b: number, c: number, minDiscordant = 6): McNemarResult {
  const discordant = b + c;
  if (discordant < minDiscordant) return { kind: "insufficient" };
  const smaller = Math.min(b, c);
  const oneSided = binomialCdf(discordant, smaller, 0.5);
  return { kind: "exact", discordant, pValue: Math.min(1, 2 * oneSided) };
}

export type PairedSignFlipResult = {
  meanDelta: number;
  /**
   * NOT a confidence interval for the true effect ΔK. These are the 2.5th/97.5th
   * percentiles of the sign-flip NULL RANDOMIZATION distribution (deltas with
   * random signs applied, i.e. what ΔK would look like if rule and RANDOM18
   * were exchangeable). A null-randomization interval is centered on the
   * null's behavior, not on the estimator's sampling distribution, so it does
   * NOT have valid coverage for the true mean ΔK — do not present it as "CI95"
   * anywhere downstream. Use `pairedBootstrapCI` for an actual CI on ΔK.
   */
  nullRandomizationLower: number;
  nullRandomizationUpper: number;
  twoSidedPValue: number;
  iterations: number;
};

/**
 * Deterministic seeded sign-flip permutation test for the paired mean
 * intersection difference ΔK = K_rule - K_random. No closed form exists for
 * this comparator, so Monte Carlo is the permitted use per §7 — always
 * reseeded from the experiment's own global seed, never `Math.random`.
 *
 * `twoSidedPValue` is a valid exact(-ish) permutation p-value. The
 * `nullRandomizationLower/Upper` percentiles are NOT a valid confidence
 * interval for the true ΔK — see `PairedSignFlipResult` doc comment and
 * `pairedBootstrapCI` for the actual CI.
 */
export function pairedSignFlipTest(deltas: readonly number[], seed: number, iterations = 10000): PairedSignFlipResult {
  const observedMean = deltas.reduce((s, d) => s + d, 0) / Math.max(1, deltas.length);
  const rng = createRng(seed);
  const samples: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    let sum = 0;
    for (const d of deltas) sum += (rng() < 0.5 ? -1 : 1) * d;
    samples.push(sum / Math.max(1, deltas.length));
  }
  samples.sort((a, b) => a - b);
  const lowerIndex = Math.max(0, Math.floor(0.025 * iterations));
  const upperIndex = Math.min(iterations - 1, Math.ceil(0.975 * iterations) - 1);
  const extremeCount = samples.filter((s) => Math.abs(s) >= Math.abs(observedMean)).length;
  return {
    meanDelta: observedMean,
    nullRandomizationLower: samples[lowerIndex],
    nullRandomizationUpper: samples[upperIndex],
    twoSidedPValue: Math.min(1, extremeCount / iterations),
    iterations,
  };
}

export type PairedBootstrapCI95 = { lower: number; upper: number; iterations: number };

/**
 * Paired (case) bootstrap 95% CI for the true mean ΔK = K_rule - K_random.
 * Resamples the n paired observations WITH REPLACEMENT (deterministic seeded
 * RNG, never `Math.random`) and takes the 2.5th/97.5th percentiles of the
 * resampled-mean distribution. Unlike `pairedSignFlipTest`'s null-randomization
 * interval — which describes the null's behavior — this resamples the
 * OBSERVED data itself, so it has valid (approximate) coverage for the true
 * effect. Resampling the deltas array with replacement is equivalent to
 * resampling the (K_rule, K_random) pairs with replacement, since
 * ΔK_i = K_rule_i - K_random_i is fixed per original pair index i.
 */
export function pairedBootstrapCI(deltas: readonly number[], seed: number, iterations = 10000): PairedBootstrapCI95 {
  const n = deltas.length;
  if (n === 0) return { lower: 0, upper: 0, iterations };
  const rng = createRng(seed);
  const resampledMeans: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    let sum = 0;
    for (let j = 0; j < n; j += 1) {
      const pick = Math.min(n - 1, Math.floor(rng() * n));
      sum += deltas[pick];
    }
    resampledMeans.push(sum / n);
  }
  resampledMeans.sort((a, b) => a - b);
  const lowerIndex = Math.max(0, Math.floor(0.025 * iterations));
  const upperIndex = Math.min(iterations - 1, Math.ceil(0.975 * iterations) - 1);
  return { lower: resampledMeans[lowerIndex], upper: resampledMeans[upperIndex], iterations };
}

// ---------------------------------------------------------------------------
// Theoretical null (§7) — closed-form hypergeometric, no Monte Carlo needed
// ---------------------------------------------------------------------------

export function hypergeometricPmf(poolSize: number, k: number): number {
  return (choose(poolSize, k) * choose(MEGA_645.max - poolSize, MEGA_645.pickCount - k)) / choose(MEGA_645.max, MEGA_645.pickCount);
}

export function hypergeometricExpectedK(poolSize: number): number {
  return MEGA_645.pickCount * (poolSize / MEGA_645.max);
}

// ---------------------------------------------------------------------------
// Scientific identity vs build provenance — mirrors `protocol.ts`'s
// `canonicalProtocolJson`/`computeProtocolHash` pattern exactly. A commit
// (gitHead), a branch, or a wall-clock timestamp must NEVER change what
// counts as "the same experiment" — only genuine research-defining inputs
// may. Build/runtime provenance (gitHead, branch, workingTreeStatus,
// generatedAt, runtimeVersion) is a SEPARATE, unhashed-here concern that the
// CLI attaches to the artifact alongside this hash, never inside it.
// ---------------------------------------------------------------------------

export type Bao18ScientificSpec = {
  experiment: string;
  version: string;
  datasetSha256: string;
  lookback: number;
  seed: number;
  rules: readonly Bao18Rule[];
  primaryEndpoint: string;
  null: string;
  alpha: number;
  holmFamily: readonly Bao18NonRandomRule[];
};

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, val]) => [key, sortKeysDeep(val)]),
    );
  }
  return value;
}

export function canonicalScientificSpecJson(spec: Bao18ScientificSpec): string {
  return JSON.stringify(sortKeysDeep(spec));
}

/** Hash of ONLY the scientific spec — excludes gitHead/branch/timestamps by construction (they are not fields of `Bao18ScientificSpec`). */
export function computeScientificSpecHash(spec: Bao18ScientificSpec): Promise<string> {
  return sha256Hex(canonicalScientificSpecJson(spec));
}

export { baoCost, baoJackpotProbability, baoTickets };
