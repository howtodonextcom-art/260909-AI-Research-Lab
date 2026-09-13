/**
 * `npm run research:bao18-summary` — publishes a read-only, browser-fetchable
 * summary of the most recent Bao-18 reverse-proof walk-forward audit report
 * under `public/data/bao18-summary.json`, the same way
 * `scripts/export-prospective-summary.ts` already publishes
 * `prospective-summary.json` from `reports/prospective-scorecard.jsonl`.
 *
 * `reports/` is server-only storage — it is not served to the client — so
 * without this export `components/bao18-panel.tsx` would have no way to show
 * real Protocol A / Protocol B numbers.
 *
 * The raw report (`reports/*-bao18-walkforward-reverse-audit.json`) is
 * produced by `scripts/audit-bao18-walkforward.ts`, owned by a different
 * workstream that may still be restructuring its exact field names. This
 * script therefore reads that JSON as `unknown` and extracts fields
 * defensively (with a couple of historical/renamed-field fallbacks) rather
 * than importing any type from `lib/research/bao18-walkforward.ts` — a
 * rename upstream should make this script's output emptier/more
 * conservative, never crash the whole export, and never publish something
 * `parseBao18Summary` itself would reject (checked before writing).
 *
 * Only reads report files and writes the compact summary — never touches
 * `reports/*-bao18-walkforward-reverse-audit.json` itself.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseBao18Summary, BAO18_RULE_IDS, type Bao18RuleId, type Bao18RuleRow, type Bao18Summary } from "../lib/research/bao18-summary";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const reportsDir = path.join(projectRoot, "reports");
const outPath = path.join(projectRoot, "public", "data", "bao18-summary.json");

const REPORT_SUFFIX = "-bao18-walkforward-reverse-audit.json";

async function findLatestReportFile(): Promise<string | null> {
  let entries: string[];
  try {
    entries = await readdir(reportsDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const candidates = entries.filter((name) => name.endsWith(REPORT_SUFFIX)).sort();
  return candidates.length ? candidates[candidates.length - 1] : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * Defensive extraction of one rule row from `protocolB.perRule[rule]` plus
 * the matching entry (if any) in `verdictsByRule[rule]`. RANDOM18 has no
 * verdict entry by design — it is the empirical baseline, not itself judged
 * for "edge" — so `verdict`/`reasons` stay null/empty for it.
 */
function extractRuleRow(rule: Bao18RuleId, perRuleRaw: unknown, verdictsByRuleRaw: unknown): Bao18RuleRow | null {
  if (!perRuleRaw || typeof perRuleRaw !== "object") return null;
  const entry = (perRuleRaw as Record<string, unknown>)[rule];
  if (!entry || typeof entry !== "object") return null;
  const row = entry as Record<string, unknown>;

  const n = num(row.n);
  const hit6Count = num(row.hit6Count);
  const hit6Rate = num(row.hit6Rate);
  const expectedNullHits = num(row.expectedNullHits);
  const meanIntersection = num(row.meanIntersection);
  const hit4PlusRate = num(row.hit4PlusRate);
  const hit5PlusRate = num(row.hit5PlusRate);
  if (n === null || hit6Count === null || hit6Rate === null || expectedNullHits === null) return null;
  if (meanIntersection === null || hit4PlusRate === null || hit5PlusRate === null) return null;

  let verdict: string | null = null;
  let reasons: string[] = [];
  if (verdictsByRuleRaw && typeof verdictsByRuleRaw === "object") {
    const verdictEntry = (verdictsByRuleRaw as Record<string, unknown>)[rule];
    if (verdictEntry && typeof verdictEntry === "object") {
      const v = verdictEntry as Record<string, unknown>;
      verdict = str(v.verdict);
      if (Array.isArray(v.reasons) && v.reasons.every((r) => typeof r === "string")) {
        reasons = v.reasons as string[];
      }
    }
  }

  return {
    rule,
    isBaseline: rule === "RANDOM18",
    n,
    hit6Count,
    hit6Rate,
    expectedNullHits,
    rawPValue: num(row.rawPValue),
    adjustedPValue: num(row.adjustedPValue),
    meanIntersection,
    hit4PlusRate,
    hit5PlusRate,
    verdict,
    reasons,
  };
}

function buildSummary(raw: Record<string, unknown>, sourceReportFile: string): Bao18Summary | null {
  const generatedAt = str(raw.generatedAt) ?? new Date().toISOString();

  const mathRaw = raw.math;
  let math: Bao18Summary["math"] = null;
  if (mathRaw && typeof mathRaw === "object") {
    const m = mathRaw as Record<string, unknown>;
    const totalCombinations = num(m.totalCombinations);
    const bao18Tickets = num(m.bao18Tickets);
    const ticketPrice = num(m.ticketPrice);
    const bao18CostPerDraw = num(m.bao18CostPerDraw);
    const nullJackpotProbability = num(m.nullJackpotProbability);
    if (
      totalCombinations !== null &&
      bao18Tickets !== null &&
      ticketPrice !== null &&
      bao18CostPerDraw !== null &&
      nullJackpotProbability !== null
    ) {
      math = { totalCombinations, bao18Tickets, ticketPrice, bao18CostPerDraw, nullJackpotProbability };
    }
  }

  const protocolARaw = raw.protocolA;
  let protocolA: Bao18Summary["protocolA"] = null;
  if (protocolARaw && typeof protocolARaw === "object") {
    const a = protocolARaw as Record<string, unknown>;
    const evaluatedDraws = num(a.evaluatedDraws);
    const hit6Count = num(a.hit6Count);
    const hit6Rate = num(a.hit6Rate);
    const sourceVerdict = str(a.verdict);
    if (evaluatedDraws !== null && hit6Count !== null && hit6Rate !== null && sourceVerdict !== null) {
      protocolA = { evaluatedDraws, hit6Count, hit6Rate, sourceVerdict };
    }
  }

  const protocolBRaw = raw.protocolB;
  if (!protocolBRaw || typeof protocolBRaw !== "object") return null;
  const bRaw = protocolBRaw as Record<string, unknown>;
  const perRuleRaw = bRaw.perRule;
  const rules: Bao18RuleRow[] = [];
  for (const rule of BAO18_RULE_IDS) {
    const row = extractRuleRow(rule, perRuleRaw, raw.verdictsByRule);
    if (row) rules.push(row);
  }
  if (rules.length === 0) return null;

  const evaluationRangeRaw = bRaw.evaluationRange;
  const evaluatedCount =
    evaluationRangeRaw && typeof evaluationRangeRaw === "object"
      ? num((evaluationRangeRaw as Record<string, unknown>).evaluatedCount)
      : null;

  const nullCalibrationRaw = raw.nullCalibration;
  let nullCalibration: Bao18Summary["nullCalibration"] = null;
  if (nullCalibrationRaw && typeof nullCalibrationRaw === "object") {
    const n = nullCalibrationRaw as Record<string, unknown>;
    const nullExpectedCount = num(n.nullExpectedCount);
    const nullProbZeroHits = num(n.nullProbZeroHits);
    const underpowered = typeof n.underpowered === "boolean" ? n.underpowered : null;
    let interval: [number, number] | null = null;
    if (Array.isArray(n.nullPredictiveInterval95) && n.nullPredictiveInterval95.length === 2) {
      const lo = num(n.nullPredictiveInterval95[0]);
      const hi = num(n.nullPredictiveInterval95[1]);
      if (lo !== null && hi !== null) interval = [lo, hi];
    }
    if (nullExpectedCount !== null && nullProbZeroHits !== null && underpowered !== null) {
      nullCalibration = {
        nullExpectedCount,
        nullProbZeroHits,
        nullPredictiveInterval95: interval,
        underpowered,
      };
    }
  }

  const finalVerdict = str(raw.finalVerdict) ?? "UNKNOWN";
  const scientificGrade = str(raw.scientificGrade) ?? "C — NO DEMONSTRATED EDGE";

  return {
    schemaVersion: 1,
    generatedAt,
    sourceReportFile,
    datasetRecordCount: num(raw.datasetRecordCount),
    firstDrawId:
      raw.firstDraw && typeof raw.firstDraw === "object" ? str((raw.firstDraw as Record<string, unknown>).id) : null,
    latestDrawId:
      raw.latestDraw && typeof raw.latestDraw === "object" ? str((raw.latestDraw as Record<string, unknown>).id) : null,
    math,
    protocolA,
    protocolB: { evaluatedCount, rules },
    nullCalibration,
    finalVerdict,
    scientificGrade,
  };
}

const latestReportFile = await findLatestReportFile();
if (!latestReportFile) {
  console.error(
    `Không tìm thấy file reports/*${REPORT_SUFFIX}. Chạy \`npm run research:bao18-audit\` trước để tạo báo cáo.`,
  );
  process.exit(1);
}

const reportPath = path.join(reportsDir, latestReportFile);
const text = await readFile(reportPath, "utf8");
let raw: unknown;
try {
  raw = JSON.parse(text);
} catch (error) {
  console.error(`File ${latestReportFile} không phải JSON hợp lệ: ${(error as Error).message}`);
  process.exit(1);
}
if (!raw || typeof raw !== "object") {
  console.error(`File ${latestReportFile} không phải một object JSON.`);
  process.exit(1);
}

const summary = buildSummary(raw as Record<string, unknown>, latestReportFile);
if (!summary) {
  console.error(
    `Không trích xuất được summary từ ${latestReportFile} — thiếu protocolB.perRule hoặc các trường bắt buộc. ` +
      "Có thể schema báo cáo đã đổi; xem lib/research/bao18-summary.ts.",
  );
  process.exit(1);
}

// Never publish something our own client-side parser would reject.
if (!parseBao18Summary(summary)) {
  console.error("Summary vừa dựng không qua được parseBao18Summary — hủy publish (fail-closed).");
  process.exit(1);
}

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

console.log("ĐÃ XUẤT BAO-18 SUMMARY");
console.log(`  nguồn báo cáo:     reports/${latestReportFile}`);
console.log(`  final verdict:     ${summary.finalVerdict}`);
console.log(`  scientific grade:  ${summary.scientificGrade}`);
console.log(`  số rule:           ${summary.protocolB.rules.length}`);
console.log(`  file:              ${path.relative(projectRoot, outPath)}`);
