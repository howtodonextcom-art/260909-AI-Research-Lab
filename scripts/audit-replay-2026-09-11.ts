/**
 * Read-only audit replay for draw 2026-09-11 (#01561).
 * HARD TIME LOCK: history uses only drawDate < 2026-09-11 (cutoff #01560).
 * Tickets are frozen BEFORE the official result is read for scoring.
 *
 * Does NOT mutate CURRENT_PROTOCOL, registry, or product data.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PROTOCOL_VERSION,
  createStrategyPick,
  runTemporalBacktestReport,
  type DrawRecord,
  type StrategyId,
} from "../lib/analytics";
import { evaluateTicket, MEGA_645, formatBall } from "../lib/mega645";
import {
  optimizePortfolio,
  calculatePortfolioOdds,
  countCoveredPairs,
  validatePortfolio,
  intersectionSize,
} from "../lib/portfolio";
import { choose, outcomes, fixedPrizeExpectation } from "../lib/profit";
import { CURRENT_PROTOCOL, computeProtocolHash } from "../lib/research/protocol";
import { sha256Hex } from "../lib/data/hash";
import { createRng, drawFairTicket } from "../lib/research/rng";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET_DATE = "2026-09-11";
const TARGET_ID = "01561";
const LOOKBACK = 90;
const SEED = 645;
const PORTFOLIO_COUNTS = [10, 20, 30] as const;
const MC_SIMS = 5_000;
const BAO_N = 18;

type RawDraw = { date: string; id: string; result: number[] };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function loadDraws(): Promise<DrawRecord[]> {
  const text = await readFile(path.join(ROOT, "public/data/power645.jsonl"), "utf8");
  const rows = text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RawDraw);
  return rows.map((row) => ({ date: row.date, id: row.id, result: row.result }));
}

function bao18Math() {
  const tickets = choose(BAO_N, 6);
  const cost = tickets * MEGA_645.ticketPrice;
  // Full bao-18 cover: own every 6-subset of a fixed 18-set.
  // Jackpot iff the official draw ⊆ that 18-set → P = C(18,6)/C(45,6).
  const pJackpotExact = choose(BAO_N, 6) / choose(45, 6);
  const singleEv = fixedPrizeExpectation();
  return {
    n: BAO_N,
    tickets,
    cost,
    pJackpotExact,
    singleTicketFixedEv: singleEv,
    naiveFixedEvTimesTickets: singleEv * tickets,
    note: "Fixed-tier EV per fair ticket is negative; bao multiplies spend without creating an algorithmic edge.",
  };
}

/** Same-budget random: N independent fair tickets vs draw; best-match distribution via MC. */
function portfolioMcVsRandom(
  portfolio: number[][],
  sims: number,
  seed: number,
): {
  sims: number;
  portfolioMeanBestMatch: number;
  randomMeanBestMatch: number;
  portfolioHit4Rate: number;
  randomHit4Rate: number;
  portfolioHit5Rate: number;
  randomHit5Rate: number;
} {
  const rng = createRng(seed);
  const n = portfolio.length;
  let pBest = 0;
  let rBest = 0;
  let p4 = 0;
  let r4 = 0;
  let p5 = 0;
  let r5 = 0;
  for (let i = 0; i < sims; i += 1) {
    const draw = drawFairTicket(rng);
    let bestP = 0;
    for (const ticket of portfolio) {
      const m = intersectionSize(ticket, draw);
      if (m > bestP) bestP = m;
    }
    let bestR = 0;
    for (let t = 0; t < n; t += 1) {
      const m = intersectionSize(drawFairTicket(rng), draw);
      if (m > bestR) bestR = m;
    }
    pBest += bestP;
    rBest += bestR;
    if (bestP >= 4) p4 += 1;
    if (bestR >= 4) r4 += 1;
    if (bestP >= 5) p5 += 1;
    if (bestR >= 5) r5 += 1;
  }
  return {
    sims,
    portfolioMeanBestMatch: pBest / sims,
    randomMeanBestMatch: rBest / sims,
    portfolioHit4Rate: p4 / sims,
    randomHit4Rate: r4 / sims,
    portfolioHit5Rate: p5 / sims,
    randomHit5Rate: r5 / sims,
  };
}

async function main() {
  const allDraws = await loadDraws();
  const target = allDraws.find((d) => d.id === TARGET_ID);
  assert(target, `Missing target draw ${TARGET_ID}`);
  assert(target.date === TARGET_DATE, `Target date mismatch: ${target.date}`);

  // --- T0: freeze cutoff (NO FUTURE INFORMATION) ---
  const history = allDraws.filter((d) => d.date < TARGET_DATE);
  const cutoff = history.at(-1);
  assert(cutoff?.id === "01560", `Expected cutoff #01560, got #${cutoff?.id}`);
  assert(cutoff.date === "2026-09-09", `Expected cutoff date 2026-09-09, got ${cutoff.date}`);
  assert(!history.some((d) => d.id === TARGET_ID), "Leakage: target in history");

  const historyPayload = JSON.stringify(history.map((d) => ({ date: d.date, id: d.id, result: d.result })));
  const datasetHash = await sha256Hex(historyPayload);
  const protocolHash = await computeProtocolHash(CURRENT_PROTOCOL);
  const generatedAt = new Date().toISOString();

  const t0 = {
    drawDateLock: `drawDate < ${TARGET_DATE}`,
    cutoffDrawId: cutoff.id,
    cutoffDrawDate: cutoff.date,
    historyCount: history.length,
    datasetHashFrozenHistory: datasetHash,
    fullSnapshotShaNote: "Full on-disk snapshot includes #01561; replay uses frozen subset hash above.",
    algorithmVersion: PROTOCOL_VERSION,
    protocolHash,
    seed: SEED,
    lookback: LOOKBACK,
    generatedAt,
  };

  // --- T1–T3: freeze tickets BEFORE reading #01561 for scoring ---
  const window = history.slice(-LOOKBACK);
  assert(window.length === LOOKBACK, `Need ${LOOKBACK} history draws, got ${window.length}`);

  const strategies: StrategyId[] = ["HOT", "COLD", "BALANCED", "RANDOM"];
  const frozenTickets: Record<string, number[]> = {};
  for (const strategy of strategies) {
    frozenTickets[strategy] = createStrategyPick(window, strategy, SEED);
  }

  const portfolios: Record<string, number[][]> = {};
  for (const n of PORTFOLIO_COUNTS) {
    const tickets = optimizePortfolio(n, SEED);
    assert(validatePortfolio(tickets), `Portfolio n=${n} failed validatePortfolio`);
    portfolios[`projective_${n}`] = tickets;
  }

  // Same-budget random portfolios (N independent tickets) for coverage comparison
  const randomPortfolios: Record<string, number[][]> = {};
  for (const n of PORTFOLIO_COUNTS) {
    const rng = createRng(SEED + n * 17);
    randomPortfolios[`random_${n}`] = Array.from({ length: n }, () => drawFairTicket(rng));
  }

  const freezePayload = {
    frozenTickets,
    portfolios: Object.fromEntries(
      Object.entries(portfolios).map(([k, v]) => [k, v.map((t) => t.slice())]),
    ),
  };
  const freezeHash = await sha256Hex(JSON.stringify(freezePayload));

  // --- T4: read official #01561 from snapshot (already loaded; live optional) ---
  const official = {
    id: target.id,
    date: target.date,
    result: target.result,
    source: "public/data/power645.jsonl snapshot",
    liveCrossCheck: "SKIPPED_IN_AUDIT_SCRIPT (snapshot authoritative; 403 risk on live)",
  };

  // --- T5: score 1-vs-1 same ticket ---
  const strategyScores = strategies.map((strategy) => {
    const ticket = frozenTickets[strategy];
    const scored = evaluateTicket(ticket, official.result);
    return {
      strategy,
      ticket: ticket.map(formatBall).join(" "),
      matches: scored.matches,
      matchedNumbers: scored.matchedNumbers.map(formatBall),
      tier: scored.tier,
      payout: scored.payout,
      cost: MEGA_645.ticketPrice,
      netFixed: (scored.payout ?? 0) - MEGA_645.ticketPrice,
    };
  });

  const portfolioScores = Object.entries(portfolios).map(([name, tickets]) => {
    const perTicket = tickets.map((ticket, index) => {
      const scored = evaluateTicket(ticket, official.result);
      return {
        index: index + 1,
        ticket: ticket.map(formatBall).join(" "),
        matches: scored.matches,
        tier: scored.tier,
        payout: scored.payout,
      };
    });
    const bestMatches = Math.max(...perTicket.map((t) => t.matches));
    const fixedPayout = perTicket.reduce((sum, t) => sum + (t.payout ?? 0), 0);
    return {
      name,
      ticketCount: tickets.length,
      cost: tickets.length * MEGA_645.ticketPrice,
      coveredPairs: countCoveredPairs(tickets),
      bestMatches,
      fixedPayout,
      perTicket,
    };
  });

  // Temporal report on frozen history only (no #01561)
  const temporal = runTemporalBacktestReport(history, LOOKBACK, CURRENT_PROTOCOL.alpha, 3, 1);
  const testPhase = temporal.results.filter((r) => r.phase === "TEST" && r.strategy !== "RANDOM");

  // Cost / Bao 18
  const bao = bao18Math();
  const projectiveFrontier = PORTFOLIO_COUNTS.map((n) => {
    const odds = calculatePortfolioOdds(n);
    const tickets = portfolios[`projective_${n}`];
    const randomTickets = randomPortfolios[`random_${n}`];
    return {
      n,
      cost: odds.cost,
      coveredPairsProjective: countCoveredPairs(tickets),
      coveredPairsRandom: countCoveredPairs(randomTickets),
      exactPAtLeast4: odds.exactProbabilityAtLeast4,
      exactPAtLeast5: odds.exactProbabilityAtLeast5,
      exactPJackpot: odds.exactProbabilityJackpot,
      costVsBaoRatio: odds.cost / bao.cost,
      ticketsVsBaoRatio: n / bao.tickets,
    };
  });

  // Bounded portfolio MC (same ticket count vs random) — does not change protocol fairnessSimulationCount
  const mc = PORTFOLIO_COUNTS.map((n) => ({
    n,
    ...portfolioMcVsRandom(portfolios[`projective_${n}`], MC_SIMS, SEED + n),
  }));

  const singleTicketFixedEv = fixedPrizeExpectation();
  const matchDist = Object.fromEntries(outcomes.map((o) => [o.matches, o.probability]));

  const report = {
    audit: "audit-replay-2026-09-11",
    t0,
    freezeHash,
    frozenTickets: Object.fromEntries(
      Object.entries(frozenTickets).map(([k, v]) => [k, v.map(formatBall).join(" ")]),
    ),
    official,
    strategyScores,
    portfolioScores,
    temporalSummary: {
      protocolVersion: temporal.protocolVersion,
      alpha: temporal.alpha,
      candidate: temporal.candidate,
      reliability: temporal.reliability,
      testPhase: testPhase.map((r) => ({
        strategy: r.strategy,
        edgeVsRandom: r.edgeVsRandom,
        pValueVsRandom: r.pValueVsRandom,
        adjustedPValue: r.adjustedPValue,
        significantAfterCorrection: r.significantAfterCorrection,
        ci95Low: r.ci95Low,
        ci95High: r.ci95High,
        averageMatches: r.averageMatches,
        roi: r.roi,
      })),
    },
    bao18: bao,
    projectiveFrontier,
    portfolioMcSameBudget: mc,
    fixedTier: {
      singleTicketFixedEv,
      matchProbabilities: matchDist,
      jackpotVariable: true,
      verdict: singleTicketFixedEv < MEGA_645.ticketPrice ? "FIXED_TIER_EV_NEGATIVE" : "UNEXPECTED",
    },
    topN: "CURRENT SYSTEM CANNOT PRODUCE THIS RESULT — no rankingScore / Top-N engine in source",
    scientificNote:
      "Single-draw match counts are OBSERVED only. They do not demonstrate predictive edge.",
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
