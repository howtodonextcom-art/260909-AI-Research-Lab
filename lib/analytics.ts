import { FIXED_PRIZE, MEGA_645, evaluateTicket } from "./mega645";
import { spentAlphaForLook } from "./research/alpha-spending";

export type DrawRecord = {
  date: string;
  id: string;
  result: number[];
  process_time?: string;
};

export type WindowId = "30D" | "90D" | "365D" | "ALL";
export type StrategyId = "RANDOM" | "HOT" | "COLD" | "BALANCED";

/**
 * Phase names describe a *retrospective* temporal split of an existing file.
 * "DEVELOPMENT" rather than "TRAIN" because nothing is fitted on it: the
 * strategies are fixed rules, and this segment only shows how they behaved
 * while the rules were being written.
 *
 * The TEST segment is a holdout in the mechanical sense — the candidate is
 * chosen without it — but it is not a holdout in the strong sense, because a
 * human could already have seen these draws. Only draws that arrive after the
 * protocol is locked are prospective evidence; see `PROTOCOL_VERSION`.
 */
export type EvaluationPhaseId = "DEVELOPMENT" | "VALIDATION" | "TEST";

/** Bumped whenever the strategy set or selection rule changes. */
export const PROTOCOL_VERSION = "2026-09-10.1";

/** In-sample gate and default temporal alpha. Kept here to avoid analytics ↔ protocol cycles. */
export const DEFAULT_ALPHA = 0.05;

/** Winsorize per-draw payout at the 4-match prize so one 5-match cannot dominate the gate. */
export const ROBUST_PAYOUT_CAP = FIXED_PRIZE.SECOND;

export const STRATEGIES: Record<StrategyId, { name: string; description: string }> = {
  RANDOM: { name: "Ngẫu nhiên đối chứng", description: "Trung bình 32 vé ngẫu nhiên có seed ở mỗi kỳ để giảm nhiễu của một chuỗi đơn lẻ." },
  HOT: { name: "Tần suất cao", description: "Chọn 6 số xuất hiện nhiều nhất trong 90 kỳ liền trước." },
  COLD: { name: "Tần suất thấp", description: "Chọn 6 số xuất hiện ít nhất trong 90 kỳ liền trước." },
  BALANCED: { name: "Cân bằng phân bố", description: "Chọn số gần tần suất kỳ vọng, phân bổ đều ba vùng 01–15, 16–30 và 31–45." },
};

export type FrequencyRow = {
  number: number;
  count: number;
  expected: number;
  deltaPercent: number;
  gap: number;
};

/**
 * The three screening gates, reported individually.
 *
 * These replace an earlier tri-state verdict whose "VERIFIED" value was
 * unreachable, which made the UI counter that consumed it permanently read
 * zero. Passing all three is a reason to keep looking, never a confirmation:
 * they are computed in-sample over the whole file.
 */
export type BacktestGates = {
  significant: boolean;
  stableAcrossHalves: boolean;
  outperformsRandomPayout: boolean;
  passedCount: number;
};

/**
 * Whole-history summary. Descriptive only: it is computed over every draw,
 * including the holdout, so it must never drive a recommendation.
 */
export type BacktestResult = {
  strategy: StrategyId;
  trials: number;
  averageMatches: number;
  hit3Rate: number;
  payout: number;
  /** Sum of per-draw payouts capped at `ROBUST_PAYOUT_CAP` (giải Nhì / 4 số). */
  robustPayout: number;
  cost: number;
  roi: number;
  edgeVsRandom: number;
  zScoreVsRandom: number;
  firstHalfEdge: number;
  secondHalfEdge: number;
  gates: BacktestGates;
};

export type EvaluationPhase = {
  id: EvaluationPhaseId;
  label: string;
  startDate: string;
  endDate: string;
  trials: number;
};

export type PhaseBacktestResult = BacktestResult & {
  phase: EvaluationPhaseId;
  pValueVsRandom: number;
  adjustedPValue: number | null;
  ci95Low: number;
  ci95High: number;
  significantAfterCorrection: boolean;
};

export type StrategyReliability = {
  strategy: Exclude<StrategyId, "RANDOM">;
  selectedOnValidation: boolean;
  validationEdge: number;
  validationAdjustedPValue: number;
  testEdge: number;
  testAdjustedPValue: number;
  testCi95Low: number;
  testCi95High: number;
  verdict: "NO_EDGE" | "VALIDATION_ONLY" | "HOLDOUT_SIGNAL";
};

/**
 * A candidate nominated from the validation segment alone. Test-segment
 * numbers never influence this choice; they only confirm or refute it.
 */
export type SelectedCandidate = {
  strategy: Exclude<StrategyId, "RANDOM">;
  validationEdge: number;
  validationAdjustedPValue: number;
  protocolVersion: string;
};

export type TemporalBacktestReport = {
  lookback: number;
  /** Alpha actually used for Holm / selectCandidate after look spending. */
  alpha: number;
  /** Protocol / requested alpha before spending. */
  nominalAlpha: number;
  lookCount: number;
  multipleTestingMethod: "Holm-Bonferroni";
  /** How z / p / CI treat walk-forward dependence. */
  varianceMethod: "newey-west-hac";
  selectionRule: string;
  protocolVersion: string;
  /** Holm family size = hypothesis count, not experimentId / look count. */
  familySize: number;
  /** Null when validation produced no strategy that clears the bar. */
  candidate: SelectedCandidate | null;
  phases: EvaluationPhase[];
  results: PhaseBacktestResult[];
  reliability: StrategyReliability[];
};

export function filterByWindow(draws: DrawRecord[], windowId: WindowId): DrawRecord[] {
  if (windowId === "ALL" || draws.length === 0) return draws;
  const days = windowId === "30D" ? 30 : windowId === "90D" ? 90 : 365;
  const latest = new Date(`${draws.at(-1)!.date}T00:00:00Z`);
  const cutoff = new Date(latest);
  cutoff.setUTCDate(cutoff.getUTCDate() - days + 1);
  return draws.filter((draw) => new Date(`${draw.date}T00:00:00Z`) >= cutoff);
}

export function calculateFrequency(draws: DrawRecord[]): FrequencyRow[] {
  const counts = Array(MEGA_645.max + 1).fill(0) as number[];
  const lastSeen = Array(MEGA_645.max + 1).fill(-1) as number[];

  draws.forEach((draw, index) => {
    draw.result.forEach((number) => {
      counts[number] += 1;
      lastSeen[number] = index;
    });
  });

  const expected = (draws.length * MEGA_645.pickCount) / MEGA_645.max;
  return Array.from({ length: MEGA_645.max }, (_, index) => {
    const number = index + 1;
    return {
      number,
      count: counts[number],
      expected,
      deltaPercent: expected === 0 ? 0 : ((counts[number] - expected) / expected) * 100,
      gap: lastSeen[number] < 0 ? draws.length : draws.length - 1 - lastSeen[number],
    };
  });
}

export function chiSquareStatistic(rows: FrequencyRow[]): number {
  if (!rows.length || rows[0].expected === 0) return 0;
  return rows.reduce((sum, row) => sum + (row.count - row.expected) ** 2 / row.expected, 0);
}

function seededRandom(seed: number) {
  let state = seed || 0x6d2b79f5;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randomPick(seed: number): number[] {
  const random = seededRandom(seed);
  const pool = Array.from({ length: MEGA_645.max }, (_, index) => index + 1);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, 6).sort((a, b) => a - b);
}

export function createStrategyPick(history: DrawRecord[], strategy: StrategyId, seed = 1): number[] {
  if (strategy === "RANDOM") return randomPick(seed);
  const rows = calculateFrequency(history);

  if (strategy === "HOT") {
    return rows.slice().sort((a, b) => b.count - a.count || a.number - b.number).slice(0, 6).map((row) => row.number).sort((a, b) => a - b);
  }
  if (strategy === "COLD") {
    return rows.slice().sort((a, b) => a.count - b.count || b.gap - a.gap || a.number - b.number).slice(0, 6).map((row) => row.number).sort((a, b) => a - b);
  }

  const picks = [0, 1, 2].flatMap((band) =>
    rows
      .filter((row) => Math.floor((row.number - 1) / 15) === band)
      .sort((a, b) => Math.abs(a.deltaPercent) - Math.abs(b.deltaPercent) || a.number - b.number)
      .slice(0, 2)
      .map((row) => row.number),
  );
  return picks.sort((a, b) => a - b);
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function sampleSd(values: number[]): number {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1));
}

/**
 * Newey–West / Bartlett HAC bandwidth:
 *   min(lookback − 1, max(1, ⌊n^{1/3}⌋))
 *
 * Cube-root of n is a standard automatic bandwidth rate for the Bartlett
 * kernel (Newey & West 1994; see also Andrews 1991 on plug-in rules). The
 * lookback cap keeps the lag from exceeding the overlap horizon.
 */
export function hacBandwidth(n: number, lookback: number): number {
  if (!Number.isFinite(n) || n < 2) return 0;
  const cubeRoot = Math.max(1, Math.floor(Math.cbrt(n)));
  const overlap = Math.max(0, lookback - 1);
  return Math.min(overlap, cubeRoot);
}

/**
 * Newey–West HAC standard error of the sample mean (Bartlett kernel).
 */
export function neweyWestStandardError(values: number[], lag: number): number {
  const n = values.length;
  if (n < 2) return 0;
  const average = mean(values);
  const L = Math.max(0, Math.min(Math.floor(lag), n - 1));
  let gamma0 = 0;
  for (let t = 0; t < n; t += 1) gamma0 += (values[t] - average) ** 2;
  gamma0 /= n;
  let longRun = gamma0;
  for (let k = 1; k <= L; k += 1) {
    let gamma = 0;
    for (let t = k; t < n; t += 1) gamma += (values[t] - average) * (values[t - k] - average);
    gamma /= n;
    longRun += 2 * (1 - k / (L + 1)) * gamma;
  }
  return Math.sqrt(Math.max(longRun, 0) / n);
}

/** SE for overlapping walk-forward paired differences: max(HAC, naive) so we never understate uncertainty vs the old estimator. */
export function dependenceAwareStandardError(differences: number[], lookback: number): {
  se: number;
  naiveSe: number;
  hac: number;
  lag: number;
} {
  const n = differences.length;
  const sd = sampleSd(differences);
  const naiveSe = sd === 0 || n === 0 ? 0 : sd / Math.sqrt(n);
  const lag = hacBandwidth(n, lookback);
  const hac = neweyWestStandardError(differences, lag);
  return { se: Math.max(hac, naiveSe), naiveSe, hac, lag };
}

function normalCdf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = sign * (1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
  return 0.5 * (1 + erf);
}

export function oneSidedPValue(zScore: number): number {
  if (!Number.isFinite(zScore)) return 1;
  return Math.max(0, Math.min(1, 1 - normalCdf(zScore)));
}

export function screeningSignificant(zScore: number, alpha: number, isControl: boolean): boolean {
  return !isControl && oneSidedPValue(zScore) <= alpha;
}

export function robustPayoutTotal(payouts: number[], cap = ROBUST_PAYOUT_CAP): number {
  return payouts.reduce((sum, value) => sum + Math.min(Math.max(value, 0), cap), 0);
}

export function outperformsOnRobustPayout(
  strategyPayouts: number[],
  randomPayouts: number[],
  cap = ROBUST_PAYOUT_CAP,
): boolean {
  return robustPayoutTotal(strategyPayouts, cap) > robustPayoutTotal(randomPayouts, cap);
}

export function holmBonferroni<T extends { pValue: number }>(
  items: T[],
  familySize = items.length,
): Array<T & { adjustedPValue: number }> {
  const n = Math.max(familySize, items.length);
  const ordered = items
    .map((item, index) => ({ ...item, originalIndex: index }))
    .sort((a, b) => a.pValue - b.pValue);
  const adjusted = Array(items.length).fill(1) as number[];
  let runningMax = 0;
  ordered.forEach((item, rank) => {
    runningMax = Math.max(runningMax, Math.min(1, item.pValue * (n - rank)));
    adjusted[item.originalIndex] = runningMax;
  });
  return items.map((item, index) => ({ ...item, adjustedPValue: adjusted[index] }));
}

type WalkForwardSeries = {
  dates: string[];
  matches: Record<StrategyId, number[]>;
  hit3: Record<StrategyId, number[]>;
  payouts: Record<StrategyId, number[]>;
};

function buildWalkForwardSeries(draws: DrawRecord[], lookback: number): WalkForwardSeries | null {
  if (draws.length <= lookback) return null;
  const strategyIds = Object.keys(STRATEGIES) as StrategyId[];
  const matches = Object.fromEntries(strategyIds.map((id) => [id, [] as number[]])) as Record<StrategyId, number[]>;
  const hit3 = Object.fromEntries(strategyIds.map((id) => [id, [] as number[]])) as Record<StrategyId, number[]>;
  const payouts = Object.fromEntries(strategyIds.map((id) => [id, [] as number[]])) as Record<StrategyId, number[]>;
  const dates: string[] = [];

  for (let index = lookback; index < draws.length; index += 1) {
    const history = draws.slice(index - lookback, index);
    const draw = draws[index];
    dates.push(draw.date);
    const seed = Number.parseInt(draw.id.replace(/\D/g, ""), 10) || index;
    let randomMatchTotal = 0;
    let randomHit3Total = 0;
    let randomPayoutTotal = 0;
    for (let sample = 0; sample < 32; sample += 1) {
      const result = evaluateTicket(createStrategyPick(history, "RANDOM", seed * 131 + sample), draw.result);
      randomMatchTotal += result.matches;
      randomHit3Total += result.matches >= 3 ? 1 : 0;
      randomPayoutTotal += result.payout ?? 0;
    }
    matches.RANDOM.push(randomMatchTotal / 32);
    hit3.RANDOM.push(randomHit3Total / 32);
    payouts.RANDOM.push(randomPayoutTotal / 32);

    strategyIds.filter((strategy) => strategy !== "RANDOM").forEach((strategy) => {
      const result = evaluateTicket(createStrategyPick(history, strategy, seed), draw.result);
      matches[strategy].push(result.matches);
      hit3[strategy].push(result.matches >= 3 ? 1 : 0);
      payouts[strategy].push(result.payout ?? 0);
    });
  }

  return { dates, matches, hit3, payouts };
}

function summarizeSeries(
  series: WalkForwardSeries,
  strategy: StrategyId,
  start: number,
  end: number,
  lookback: number,
  alpha: number = DEFAULT_ALPHA,
): BacktestResult {
  const randomMatches = series.matches.RANDOM.slice(start, end);
  const values = series.matches[strategy].slice(start, end);
  const randomAverage = mean(randomMatches);
  const midpoint = Math.floor(values.length / 2);
  const differences = values.map((value, index) => value - randomMatches[index]);
  const averageDifference = mean(differences);
  const { se } = dependenceAwareStandardError(differences, lookback);
  const zScore = se === 0 ? 0 : averageDifference / se;
  const firstHalfEdge = mean(values.slice(0, midpoint)) - mean(randomMatches.slice(0, midpoint));
  const secondHalfEdge = mean(values.slice(midpoint)) - mean(randomMatches.slice(midpoint));
  const trials = values.length;
  const cost = trials * MEGA_645.ticketPrice;
  const strategyPayouts = series.payouts[strategy].slice(start, end);
  const randomPayouts = series.payouts.RANDOM.slice(start, end);
  const payout = strategyPayouts.reduce((sum, value) => sum + value, 0);
  const robustPayout = robustPayoutTotal(strategyPayouts);
  const roi = cost === 0 ? 0 : ((payout - cost) / cost) * 100;
  const edgeVsRandom = mean(values) - randomAverage;

  const isControl = strategy === "RANDOM";
  const significant = screeningSignificant(zScore, alpha, isControl);
  const stableAcrossHalves = !isControl && firstHalfEdge > 0 && secondHalfEdge > 0;
  const outperformsRandomPayout = !isControl && outperformsOnRobustPayout(strategyPayouts, randomPayouts);

  return {
    strategy,
    trials,
    averageMatches: mean(values),
    hit3Rate: mean(series.hit3[strategy].slice(start, end)) * 100,
    payout,
    robustPayout,
    cost,
    roi,
    edgeVsRandom,
    zScoreVsRandom: zScore,
    firstHalfEdge,
    secondHalfEdge,
    gates: {
      significant,
      stableAcrossHalves,
      outperformsRandomPayout,
      passedCount: Number(significant) + Number(stableAcrossHalves) + Number(outperformsRandomPayout),
    },
  };
}

function summarizePhase(
  series: WalkForwardSeries,
  strategy: StrategyId,
  phase: EvaluationPhase,
  start: number,
  end: number,
  lookback: number,
  alpha: number = DEFAULT_ALPHA,
): PhaseBacktestResult {
  const result = summarizeSeries(series, strategy, start, end, lookback, alpha);
  const differences = series.matches[strategy].slice(start, end).map((value, index) => value - series.matches.RANDOM[start + index]);
  const { se } = dependenceAwareStandardError(differences, lookback);
  const margin = 1.96 * se;
  return {
    ...result,
    phase: phase.id,
    pValueVsRandom: strategy === "RANDOM" ? 1 : oneSidedPValue(result.zScoreVsRandom),
    adjustedPValue: strategy === "RANDOM" ? null : 1,
    ci95Low: result.edgeVsRandom - margin,
    ci95High: result.edgeVsRandom + margin,
    significantAfterCorrection: false,
  };
}

function splitEvaluationPhases(series: WalkForwardSeries): Array<EvaluationPhase & { start: number; end: number }> {
  const trialCount = series.dates.length;
  if (trialCount < 3) return [];
  const trainEnd = Math.max(1, Math.floor(trialCount * 0.5));
  const validationEnd = Math.max(trainEnd + 1, Math.floor(trialCount * 0.75));
  const boundedValidationEnd = Math.min(validationEnd, trialCount - 1);
  const definitions: Array<{ id: EvaluationPhaseId; label: string; start: number; end: number }> = [
    { id: "DEVELOPMENT", label: "Development", start: 0, end: trainEnd },
    { id: "VALIDATION", label: "Validation", start: trainEnd, end: boundedValidationEnd },
    { id: "TEST", label: "Test (retrospective)", start: boundedValidationEnd, end: trialCount },
  ];
  return definitions
    .filter((phase) => phase.end > phase.start)
    .map((phase) => ({
      ...phase,
      startDate: series.dates[phase.start],
      endDate: series.dates[phase.end - 1],
      trials: phase.end - phase.start,
    }));
}

/** Paired (strategy − RANDOM) match differences for one phase — same series the SE path uses. */
export function walkForwardPairedDifferences(
  draws: DrawRecord[],
  strategy: Exclude<StrategyId, "RANDOM">,
  phaseId: EvaluationPhaseId,
  lookback = 90,
): number[] {
  const series = buildWalkForwardSeries(draws, lookback);
  if (!series) return [];
  const phase = splitEvaluationPhases(series).find((item) => item.id === phaseId);
  if (!phase) return [];
  return series.matches[strategy]
    .slice(phase.start, phase.end)
    .map((value, index) => value - series.matches.RANDOM[phase.start + index]);
}

export function runWalkForwardBacktest(draws: DrawRecord[], lookback = 90, alpha = DEFAULT_ALPHA): BacktestResult[] {
  const series = buildWalkForwardSeries(draws, lookback);
  if (!series) return [];
  const strategyIds = Object.keys(STRATEGIES) as StrategyId[];
  return strategyIds.map((strategy) => summarizeSeries(series, strategy, 0, series.dates.length, lookback, alpha));
}

export const SELECTION_RULE =
  "Ứng viên chỉ được chọn từ validation: cần edge dương VÀ adjusted p-value ≤ alpha. " +
  "Tập test chỉ dùng để xác nhận hoặc bác bỏ, không bao giờ để chọn.";

/**
 * Nominates at most one candidate using validation numbers only.
 *
 * Exported and pure so the selection bar can be tested directly instead of
 * being inferred from an end-to-end run.
 */
export function selectCandidate(
  validationResults: PhaseBacktestResult[],
  alpha = DEFAULT_ALPHA,
): SelectedCandidate | null {
  const eligible = validationResults
    .filter((result) => result.strategy !== "RANDOM")
    .filter((result) => result.edgeVsRandom > 0 && (result.adjustedPValue ?? 1) <= alpha)
    .sort((a, b) => (a.adjustedPValue ?? 1) - (b.adjustedPValue ?? 1) || b.edgeVsRandom - a.edgeVsRandom);

  const best = eligible[0];
  if (!best) return null;
  return {
    strategy: best.strategy as Exclude<StrategyId, "RANDOM">,
    validationEdge: best.edgeVsRandom,
    validationAdjustedPValue: best.adjustedPValue ?? 1,
    protocolVersion: PROTOCOL_VERSION,
  };
}

export function runTemporalBacktestReport(
  draws: DrawRecord[],
  lookback = 90,
  alpha = DEFAULT_ALPHA,
  familySize?: number,
  lookCount = 1,
): TemporalBacktestReport {
  const resolvedLookCount = Math.max(1, Math.floor(lookCount));
  const spentAlpha = spentAlphaForLook(resolvedLookCount, alpha);
  const series = buildWalkForwardSeries(draws, lookback);
  if (!series) {
    return {
      lookback,
      alpha: spentAlpha,
      nominalAlpha: alpha,
      lookCount: resolvedLookCount,
      multipleTestingMethod: "Holm-Bonferroni",
      varianceMethod: "newey-west-hac",
      selectionRule: SELECTION_RULE,
      protocolVersion: PROTOCOL_VERSION,
      familySize: familySize ?? 0,
      candidate: null,
      phases: [],
      results: [],
      reliability: [],
    };
  }

  const phasesWithBounds = splitEvaluationPhases(series);
  const strategyIds = Object.keys(STRATEGIES) as StrategyId[];
  const results = phasesWithBounds.flatMap((phase) =>
    strategyIds.map((strategy) => summarizePhase(series, strategy, phase, phase.start, phase.end, lookback, alpha)),
  );

  const visibleFamily = results.filter((result) => result.phase === phasesWithBounds[0]?.id && result.strategy !== "RANDOM").length;
  const resolvedFamilySize = familySize ?? visibleFamily;

  for (const phase of phasesWithBounds) {
    const phaseResults = results.filter((result) => result.phase === phase.id && result.strategy !== "RANDOM");
    const adjusted = holmBonferroni(
      phaseResults.map((result) => ({ strategy: result.strategy, pValue: result.pValueVsRandom })),
      resolvedFamilySize,
    );
    adjusted.forEach((item) => {
      const result = results.find((candidate) => candidate.phase === phase.id && candidate.strategy === item.strategy);
      if (result) {
        result.adjustedPValue = item.adjustedPValue;
        result.significantAfterCorrection = result.edgeVsRandom > 0 && item.adjustedPValue <= spentAlpha;
      }
    });
  }

  const validationResults = results.filter((result) => result.phase === "VALIDATION" && result.strategy !== "RANDOM");
  const candidate = selectCandidate(validationResults, spentAlpha);

  const reliability = (strategyIds.filter((strategy) => strategy !== "RANDOM") as Array<Exclude<StrategyId, "RANDOM">>).map((strategy) => {
    const validation = results.find((result) => result.phase === "VALIDATION" && result.strategy === strategy);
    const test = results.find((result) => result.phase === "TEST" && result.strategy === strategy);
    const selectedOnValidation = candidate?.strategy === strategy;
    const holdoutSignal = selectedOnValidation && Boolean(test?.significantAfterCorrection) && (test?.ci95Low ?? 0) > 0;
    const verdict: StrategyReliability["verdict"] = holdoutSignal ? "HOLDOUT_SIGNAL" : selectedOnValidation ? "VALIDATION_ONLY" : "NO_EDGE";
    return {
      strategy,
      selectedOnValidation,
      validationEdge: validation?.edgeVsRandom ?? 0,
      validationAdjustedPValue: validation?.adjustedPValue ?? 1,
      testEdge: test?.edgeVsRandom ?? 0,
      testAdjustedPValue: test?.adjustedPValue ?? 1,
      testCi95Low: test?.ci95Low ?? 0,
      testCi95High: test?.ci95High ?? 0,
      verdict,
    };
  });

  return {
    lookback,
    alpha: spentAlpha,
    nominalAlpha: alpha,
    lookCount: resolvedLookCount,
    multipleTestingMethod: "Holm-Bonferroni",
    varianceMethod: "newey-west-hac",
    selectionRule: SELECTION_RULE,
    protocolVersion: PROTOCOL_VERSION,
    familySize: resolvedFamilySize,
    candidate,
    phases: phasesWithBounds.map((phase) => ({
      id: phase.id,
      label: phase.label,
      startDate: phase.startDate,
      endDate: phase.endDate,
      trials: phase.trials,
    })),
    results,
    reliability,
  };
}

export function formatPercent(value: number, digits = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}
