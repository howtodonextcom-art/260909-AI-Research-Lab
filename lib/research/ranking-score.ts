/**
 * rankingScore lane — gate/stub only (blueprint B1/B7). This module exists
 * to fix the CONTRACT and LABELING of a future scoring lane, not to ship a
 * good predictor: Phase A's verdict is C (NO DEMONSTRATED EDGE), and B7's
 * policy is explicit that ML is a research candidate only, gated behind a
 * pre-registered promotion threshold — never something a UI can call
 * "probability" by default. Do NOT import this module from any UI file.
 *
 * Promotion policy (B7, restated so it isn't only in the report): a score
 * may be shown as calibrated/probability-like ONLY IF
 *   (1) `promotionGateMet` returns true on VALIDATION-only calibration data, AND
 *   (2) the same-budget null (see `portfolio-mc.ts`) fails to be beaten
 *       after Holm/alpha-spend correction (see `negative-controls.ts` /
 *       `lib/analytics.ts` walk-forward).
 * This module implements and tests condition (1) only. It does not, and
 * must not, wire either condition into any UI decision by itself.
 */
import { validateNumbers } from "../mega645";

/** Train-only per-number feature value, keyed by ball number (1..45). Caller is responsible for leak-safety (drawDate < target only). */
export type TicketFeatureMap = Record<number, number>;

export type RankingScoreResult = {
  ticket: number[];
  /**
   * NOT a probability. An arbitrary real-valued scalar useful only for
   * RELATIVE ranking among candidate tickets computed from the same
   * feature map — it has no calibrated meaning and must never be rendered
   * as "% chance" or "probability" in any UI. See the promotion policy
   * above for the only path by which that could ever change.
   */
  score: number;
};

/**
 * Deliberately trivial placeholder scorer: the mean of the provided
 * train-only per-number feature values over the ticket's 6 numbers. Making
 * this predictively good would contradict the project's honesty stance
 * (Phase A verdict C) — the point of this function is the contract
 * (ticket + train-only features -> a labeled, non-probability score), not
 * predictive quality.
 */
export function computeRankingScore(ticket: number[], features: TicketFeatureMap): RankingScoreResult {
  if (!validateNumbers(ticket)) {
    throw new Error("Vé phải gồm đúng 6 số khác nhau từ 01 đến 45.");
  }
  const score = ticket.reduce((sum, number) => sum + (features[number] ?? 0), 0) / ticket.length;
  return { ticket: [...ticket], score };
}

export type CalibrationPair = {
  /** A score meant to be interpreted as P(outcome=1) if calibration were being tested — clamped to [0,1] for bucketing. */
  predictedScore: number;
  actualOutcome: 0 | 1;
};

export type CalibrationReport = {
  sampleSize: number;
  /** Mean squared error between predicted score and binary outcome — 0 is perfect, 1 is worst possible. */
  brierScore: number;
  /** Expected Calibration Error: bucket-size-weighted mean |avg predicted − observed rate| across equal-width buckets. */
  expectedCalibrationError: number;
  bucketCount: number;
};

/**
 * Report-only: computes Brier score and a simple equal-width-bucket ECE.
 * Does not promote, gate, or otherwise change any UI behavior by itself —
 * see `promotionGateMet` for the (also non-UI-wired) gate predicate.
 */
export function computeCalibrationReport(pairs: CalibrationPair[], bucketCount = 10): CalibrationReport {
  if (!pairs.length) {
    throw new Error("Cần ít nhất một cặp (predictedScore, actualOutcome) để tính calibration.");
  }
  if (!Number.isInteger(bucketCount) || bucketCount < 1) {
    throw new Error("bucketCount phải là số nguyên dương.");
  }

  const brierScore = pairs.reduce((sum, pair) => sum + (pair.predictedScore - pair.actualOutcome) ** 2, 0) / pairs.length;

  const buckets: { sumPredicted: number; sumOutcome: number; count: number }[] = Array.from(
    { length: bucketCount },
    () => ({ sumPredicted: 0, sumOutcome: 0, count: 0 }),
  );
  for (const pair of pairs) {
    const clamped = Math.min(Math.max(pair.predictedScore, 0), 1);
    const index = Math.min(bucketCount - 1, Math.floor(clamped * bucketCount));
    const bucket = buckets[index];
    bucket.sumPredicted += pair.predictedScore;
    bucket.sumOutcome += pair.actualOutcome;
    bucket.count += 1;
  }

  const expectedCalibrationError = buckets.reduce((sum, bucket) => {
    if (bucket.count === 0) return sum;
    const avgPredicted = bucket.sumPredicted / bucket.count;
    const avgOutcome = bucket.sumOutcome / bucket.count;
    return sum + (bucket.count / pairs.length) * Math.abs(avgPredicted - avgOutcome);
  }, 0);

  return { sampleSize: pairs.length, brierScore, expectedCalibrationError, bucketCount };
}

export type PromotionThresholds = {
  maxBrierScore: number;
  maxExpectedCalibrationError: number;
  minSampleSize: number;
};

/**
 * Condition (1) of the B7 promotion policy only (see module doc comment).
 * Returning true here is NOT by itself sufficient to let any UI call a
 * score "probability" — condition (2) (same-budget null fails to beat
 * after Holm/alpha-spend) must also hold, and that check lives outside
 * this module entirely. This function is never called from UI code in
 * this pass, and importing it from a UI file would be a policy violation.
 */
export function promotionGateMet(report: CalibrationReport, thresholds: PromotionThresholds): boolean {
  return (
    report.sampleSize >= thresholds.minSampleSize &&
    report.brierScore <= thresholds.maxBrierScore &&
    report.expectedCalibrationError <= thresholds.maxExpectedCalibrationError
  );
}
