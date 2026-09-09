import { MEGA_645, evaluateTicket, validateNumbers } from "./mega645";

export type DrawRecord = {
  date: string;
  id: string;
  result: number[];
  process_time?: string;
};

export type WindowId = "30D" | "90D" | "365D" | "ALL";
export type StrategyId = "RANDOM" | "HOT" | "COLD" | "BALANCED";
export type EvaluationPhaseId = "TRAIN" | "VALIDATION" | "TEST";

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

export type BacktestResult = {
  strategy: StrategyId;
  trials: number;
  averageMatches: number;
  hit3Rate: number;
  payout: number;
  cost: number;
  roi: number;
  edgeVsRandom: number;
  zScoreVsRandom: number;
  firstHalfEdge: number;
  secondHalfEdge: number;
  verdict: "NO_EDGE" | "PROMISING" | "VERIFIED";
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

export type TemporalBacktestReport = {
  lookback: number;
  alpha: number;
  multipleTestingMethod: "Holm-Bonferroni";
  selectionRule: string;
  phases: EvaluationPhase[];
  results: PhaseBacktestResult[];
  reliability: StrategyReliability[];
};

export function parseDraws(text: string): DrawRecord[] {
  const draws = text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as DrawRecord)
    .sort((a, b) => a.date.localeCompare(b.date));
  const ids = new Set<string>();
  draws.forEach((draw) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draw.date) || !draw.id || !validateNumbers(draw.result) || ids.has(draw.id)) {
      throw new Error("Dữ liệu kỳ quay không hợp lệ hoặc bị trùng.");
    }
    ids.add(draw.id);
  });
  return draws;
}

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

function oneSidedPValue(zScore: number): number {
  if (!Number.isFinite(zScore)) return 1;
  return Math.max(0, Math.min(1, 1 - normalCdf(zScore)));
}

function holmBonferroni<T extends { pValue: number }>(items: T[]): Array<T & { adjustedPValue: number }> {
  const ordered = items
    .map((item, index) => ({ ...item, originalIndex: index }))
    .sort((a, b) => a.pValue - b.pValue);
  const adjusted = Array(items.length).fill(1) as number[];
  let runningMax = 0;
  ordered.forEach((item, rank) => {
    runningMax = Math.max(runningMax, Math.min(1, item.pValue * (items.length - rank)));
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

function summarizeSeries(series: WalkForwardSeries, strategy: StrategyId, start: number, end: number): BacktestResult {
  const randomMatches = series.matches.RANDOM.slice(start, end);
  const values = series.matches[strategy].slice(start, end);
  const randomAverage = mean(randomMatches);
  const midpoint = Math.floor(values.length / 2);
  const differences = values.map((value, index) => value - randomMatches[index]);
  const averageDifference = mean(differences);
  const sd = sampleSd(differences);
  const zScore = sd === 0 ? 0 : averageDifference / (sd / Math.sqrt(differences.length));
  const firstHalfEdge = mean(values.slice(0, midpoint)) - mean(randomMatches.slice(0, midpoint));
  const secondHalfEdge = mean(values.slice(midpoint)) - mean(randomMatches.slice(midpoint));
  const trials = values.length;
  const cost = trials * MEGA_645.ticketPrice;
  const payout = series.payouts[strategy].slice(start, end).reduce((sum, value) => sum + value, 0);
  const roi = cost === 0 ? 0 : ((payout - cost) / cost) * 100;
  const edgeVsRandom = mean(values) - randomAverage;
  const randomPayout = series.payouts.RANDOM.slice(start, end).reduce((sum, value) => sum + value, 0);
  const verified = strategy !== "RANDOM" && zScore >= 1.96 && firstHalfEdge > 0 && secondHalfEdge > 0 && payout > randomPayout;
  const promising = strategy !== "RANDOM" && edgeVsRandom > 0 && !verified;

  return {
    strategy,
    trials,
    averageMatches: mean(values),
    hit3Rate: mean(series.hit3[strategy].slice(start, end)) * 100,
    payout,
    cost,
    roi,
    edgeVsRandom,
    zScoreVsRandom: zScore,
    firstHalfEdge,
    secondHalfEdge,
    verdict: verified || promising ? "PROMISING" : "NO_EDGE",
  };
}

function summarizePhase(series: WalkForwardSeries, strategy: StrategyId, phase: EvaluationPhase, start: number, end: number): PhaseBacktestResult {
  const result = summarizeSeries(series, strategy, start, end);
  const differences = series.matches[strategy].slice(start, end).map((value, index) => value - series.matches.RANDOM[start + index]);
  const sd = sampleSd(differences);
  const standardError = sd === 0 || differences.length === 0 ? 0 : sd / Math.sqrt(differences.length);
  const margin = 1.96 * standardError;
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
    { id: "TRAIN", label: "Train", start: 0, end: trainEnd },
    { id: "VALIDATION", label: "Validation", start: trainEnd, end: boundedValidationEnd },
    { id: "TEST", label: "Test holdout", start: boundedValidationEnd, end: trialCount },
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

export function runWalkForwardBacktest(draws: DrawRecord[], lookback = 90): BacktestResult[] {
  const series = buildWalkForwardSeries(draws, lookback);
  if (!series) return [];
  const strategyIds = Object.keys(STRATEGIES) as StrategyId[];
  return strategyIds.map((strategy) => summarizeSeries(series, strategy, 0, series.dates.length));
}

export function runTemporalBacktestReport(draws: DrawRecord[], lookback = 90, alpha = 0.05): TemporalBacktestReport {
  const series = buildWalkForwardSeries(draws, lookback);
  if (!series) {
    return {
      lookback,
      alpha,
      multipleTestingMethod: "Holm-Bonferroni",
      selectionRule: "Chọn chiến lược có adjusted p-value nhỏ nhất trên validation nếu edge dương.",
      phases: [],
      results: [],
      reliability: [],
    };
  }

  const phasesWithBounds = splitEvaluationPhases(series);
  const strategyIds = Object.keys(STRATEGIES) as StrategyId[];
  const results = phasesWithBounds.flatMap((phase) =>
    strategyIds.map((strategy) => summarizePhase(series, strategy, phase, phase.start, phase.end)),
  );

  for (const phase of phasesWithBounds) {
    const phaseResults = results.filter((result) => result.phase === phase.id && result.strategy !== "RANDOM");
    const adjusted = holmBonferroni(phaseResults.map((result) => ({ strategy: result.strategy, pValue: result.pValueVsRandom })));
    adjusted.forEach((item) => {
      const result = results.find((candidate) => candidate.phase === phase.id && candidate.strategy === item.strategy);
      if (result) {
        result.adjustedPValue = item.adjustedPValue;
        result.significantAfterCorrection = result.edgeVsRandom > 0 && item.adjustedPValue <= alpha;
      }
    });
  }

  const validationResults = results.filter((result) => result.phase === "VALIDATION" && result.strategy !== "RANDOM");
  const selected = validationResults
    .filter((result) => result.edgeVsRandom > 0)
    .sort((a, b) => (a.adjustedPValue ?? 1) - (b.adjustedPValue ?? 1) || b.edgeVsRandom - a.edgeVsRandom)[0];

  const reliability = (strategyIds.filter((strategy) => strategy !== "RANDOM") as Array<Exclude<StrategyId, "RANDOM">>).map((strategy) => {
    const validation = results.find((result) => result.phase === "VALIDATION" && result.strategy === strategy);
    const test = results.find((result) => result.phase === "TEST" && result.strategy === strategy);
    const selectedOnValidation = selected?.strategy === strategy;
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
    alpha,
    multipleTestingMethod: "Holm-Bonferroni",
    selectionRule: "Chọn chiến lược có adjusted p-value nhỏ nhất trên validation nếu edge dương; kiểm tra lại trên test holdout.",
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
