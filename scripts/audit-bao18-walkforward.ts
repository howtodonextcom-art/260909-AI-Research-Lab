/**
 * `npm run research:bao18-audit` — Bao-18 "reverse proof" walk-forward
 * adversarial audit (Master Prompt v2.0).
 *
 * Answers exactly one question honestly: does a rule that builds an
 * 18-number pool from purely historical data raise P(R_t ⊆ P_t) above the
 * fair-null hypergeometric rate, once look-ahead is structurally impossible?
 *
 * Runs Protocol A (reverse peek — a labeled, invalid negative control that
 * MUST hit 100%) and Protocol B (valid walk-forward) on the real canonical
 * snapshot, then writes a JSON artifact + Markdown report. Never enumerates
 * the 18,564 Bao-18 tickets — all match-tier counting uses the exact
 * closed-form formula proven against brute force in
 * `lib/research/bao18-walkforward.test.ts` (§29).
 *
 * Fail-closed (§35): stops before running anything if the dataset hash
 * doesn't match its manifest, or refuses to overwrite an existing artifact
 * at the same path. Never commits/pushes/deploys; never touches the
 * protocol lock, experiment registry, or prospective scorecard.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadSnapshot, resolvePaths } from "../lib/data/persistence";
import { serializeDrawsJsonl } from "../lib/data/jsonl";
import { sha256Hex } from "../lib/data/hash";
import { CURRENT_PROTOCOL, nextDrawId } from "../lib/research/protocol";
import { MEGA_645 } from "../lib/mega645";
import {
  BAO18_NON_RANDOM_RULES,
  baoCost,
  baoJackpotProbability,
  baoTickets,
  binomialPmf,
  binomialQuantile,
  binomialTailAtLeast,
  clopperPearsonCI,
  combineSeed,
  computeScientificSpecHash,
  evaluationRange,
  exactMcNemar,
  fixedPrizePayoutForDraw,
  holmBonferroni,
  hypergeometricExpectedK,
  hypergeometricPmf,
  pairedBootstrapCI,
  pairedSignFlipTest,
  runProtocolA,
  runRuleWalkForward,
  type Bao18NonRandomRule,
  type Bao18Observation,
  type Bao18Rule,
  type Bao18ScientificSpec,
} from "../lib/research/bao18-walkforward";

const SEED = 645; // matches this repo's other research CLIs (negative-controls, portfolio-mc)
const ALPHA = 0.05;
const projectRoot = fileURLToPath(new URL("../", import.meta.url));

function fail(message: string): never {
  console.error(`\nSTOP (§35 fail-closed): ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// GAP-07 evidence gate — extracted as a pure, importable, dependency-injected
// function so it can be regression-tested (see
// `scripts/audit-bao18-evidence-gate.test.ts`) WITHOUT mutating the real
// committed `lib/research/bao18-walkforward.test.ts` and WITHOUT reimplementing
// this logic in the test (which would drift from what the CLI actually runs).
// The real CLI flow below calls this exact function with the real test path;
// the test calls it with a throwaway temp-dir test file instead. Return shape
// is a discriminated result — `main()`-style callers must check `ok` before
// doing anything artifact-affecting, mirroring the fail-closed check below.
// ---------------------------------------------------------------------------
export type EvidenceGateResult =
  | {
      ok: true;
      evidence: {
        testFile: string;
        testFileSha256: string;
        command: string;
        exitCode: number;
        passCount: number | null;
        failCount: number | null;
        verifiedAt: string;
      };
    }
  | { ok: false; reason: string; exitCode: number; stdout: string; stderr: string };

/**
 * Spawns `node --import=tsx --test <testRelativePath>` as a child process and
 * reports pass/fail. Takes the test file path as a parameter (not hardcoded)
 * so a test harness can point it at a temporary, deliberately-failing (or
 * passing) throwaway file instead of the real committed test suite.
 */
export async function runEvidenceGate(
  testRelativePathOrAbs: string,
  options: { cwd?: string } = {},
): Promise<EvidenceGateResult> {
  const cwd = options.cwd ?? projectRoot;
  let testFileSource: string;
  try {
    const absolute = path.isAbsolute(testRelativePathOrAbs)
      ? testRelativePathOrAbs
      : path.join(cwd, testRelativePathOrAbs);
    testFileSource = await readFile(absolute, "utf8");
  } catch (error) {
    return {
      ok: false,
      reason: `không đọc được test file để tính evidence hash: ${error instanceof Error ? error.message : String(error)}`,
      exitCode: -1,
      stdout: "",
      stderr: "",
    };
  }
  const testFileSha256 = await sha256Hex(testFileSource);
  const command = `node --import=tsx --test "${testRelativePathOrAbs}"`;
  let exitCode = 0;
  let stdout = "";
  let stderr = "";
  // Strip `NODE_TEST_CONTEXT` (and friends) before spawning: Node's own test
  // runner sets this on itself when running as a child of `node --test`, and
  // if it leaked into this nested `node --test` invocation (e.g. when this
  // gate is exercised from inside the GAP-07 regression test, which itself
  // runs under `node --test`), the nested process silently switches to a
  // v8-serialized child reporter and always exits 0 regardless of actual
  // pass/fail — exactly the failure-to-fail-closed this gate must never
  // have. The real `research:bao18-audit` CLI is never itself run under
  // `node --test`, so this is purely defensive, but it makes the gate
  // correct regardless of the calling process's own test-runner state.
  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;
  try {
    const output = execSync(command, { cwd, stdio: "pipe", env: childEnv });
    stdout = output.toString();
  } catch (error) {
    const err = error as { status?: number | null; stdout?: Buffer; stderr?: Buffer };
    exitCode = err.status ?? 1;
    stdout = err.stdout?.toString() ?? "";
    stderr = err.stderr?.toString() ?? "";
  }
  const verifiedAt = new Date().toISOString();
  if (exitCode !== 0) {
    return { ok: false, reason: `test suite KHÔNG pass (exit code ${exitCode})`, exitCode, stdout, stderr };
  }
  const passCountMatch = stdout.match(/pass\s+(\d+)/);
  const failCountMatch = stdout.match(/fail\s+(\d+)/);
  return {
    ok: true,
    evidence: {
      testFile: testRelativePathOrAbs,
      testFileSha256,
      command,
      exitCode,
      passCount: passCountMatch ? Number(passCountMatch[1]) : null,
      failCount: failCountMatch ? Number(failCountMatch[1]) : null,
      verifiedAt,
    },
  };
}

// ---------------------------------------------------------------------------
// Main-module guard — this file is imported by
// `scripts/audit-bao18-evidence-gate.test.ts` to reach `runEvidenceGate`
// without triggering the full CLI run (git provenance, snapshot load,
// artifact write) as a side effect of the import. Only the top-level
// `npm run research:bao18-audit` invocation (or a direct `node
// scripts/audit-bao18-walkforward.ts`) executes everything below.
// ---------------------------------------------------------------------------
const isMainModule = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
// ---------------------------------------------------------------------------
// §25 — Provenance preflight
// ---------------------------------------------------------------------------
console.log("\nBAO-18 REVERSE-PROOF WALK-FORWARD AUDIT (Master Prompt v2.0)\n");
console.log("== Provenance preflight ==");

let gitHead = "UNKNOWN";
let gitBranch = "UNKNOWN";
let workingTreeStatus: "clean" | "dirty" | "UNKNOWN" = "UNKNOWN";
try {
  gitHead = execSync("git rev-parse HEAD", { cwd: projectRoot }).toString().trim();
  gitBranch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: projectRoot }).toString().trim();
  const status = execSync("git status --porcelain", { cwd: projectRoot }).toString();
  workingTreeStatus = status.trim().length > 0 ? "dirty" : "clean";
} catch (error) {
  console.warn(`  (không đọc được git provenance: ${error instanceof Error ? error.message : String(error)})`);
}
console.log(`  Git HEAD: ${gitHead}`);
console.log(`  Branch:   ${gitBranch}`);
console.log(`  Worktree: ${workingTreeStatus}`);

// ---------------------------------------------------------------------------
// Anti-leak evidence gate — the artifact's §K claims "N anti-leak tests pass"
// only if THIS RUN actually just spawned the test file as a child process and
// verified it exited 0. Fail-closed: refuse to write the artifact otherwise,
// and never accept a hardcoded "PASS" string as evidence. Uses the extracted
// `runEvidenceGate` above so this real CLI path and the GAP-07 regression
// test call the identical function.
// ---------------------------------------------------------------------------
console.log("\n== Anti-leak evidence gate ==");
const testRelativePath = "lib/research/bao18-walkforward.test.ts";
const gateResult = await runEvidenceGate(testRelativePath, { cwd: projectRoot });
console.log(`  Test file: ${testRelativePath}`);
console.log(`  Command: node --import=tsx --test ${testRelativePath}`);
if (!gateResult.ok) {
  console.error(gateResult.stdout);
  console.error(gateResult.stderr);
  fail(`anti-leak test suite KHÔNG pass (exit code ${gateResult.exitCode}) — từ chối ghi artifact (§35 fail-closed).`);
}
const antiLeakEvidence = gateResult.evidence;
console.log(`  Test file SHA-256: ${antiLeakEvidence.testFileSha256}`);
console.log(`  Exit code: ${antiLeakEvidence.exitCode}`);
console.log(`  ✓ Test suite exited 0 at ${antiLeakEvidence.verifiedAt} (pass=${antiLeakEvidence.passCount ?? "?"}, fail=${antiLeakEvidence.failCount ?? "?"}) — evidence embedded in artifact.`);

const paths = resolvePaths(projectRoot);
let snapshot;
try {
  snapshot = await loadSnapshot(paths);
} catch (error) {
  fail(`không tải được snapshot: ${error instanceof Error ? error.message : String(error)}`);
}
const draws = snapshot.records;
if (!draws.length) fail("dataset rỗng");

const serialized = serializeDrawsJsonl(draws);
const recomputedHash = await sha256Hex(serialized);
const manifestHash = snapshot.manifest?.datasetSha256 ?? null;
console.log(`  Bản ghi:  ${draws.length}`);
console.log(`  Kỳ đầu:   #${draws[0].id} / ${draws[0].date}`);
console.log(`  Kỳ cuối:  #${draws.at(-1)!.id} / ${draws.at(-1)!.date}`);
console.log(`  Hash tái tính: ${recomputedHash}`);
console.log(`  Hash manifest: ${manifestHash ?? "KHÔNG CÓ"}`);

if (!manifestHash) fail("thiếu manifest — chạy npm run data:sync trước khi audit");
if (manifestHash !== recomputedHash) {
  fail(
    `hash tái tính (${recomputedHash.slice(0, 16)}…) không khớp manifest (${manifestHash.slice(0, 16)}…) — ` +
      "không chạy experiment trên dataset integrity mismatch.",
  );
}
console.log("  ✓ Hash khớp manifest — dataset toàn vẹn.");

// ---------------------------------------------------------------------------
// §10 / §26 — Resolve lookback, freeze SCIENTIFIC spec, hash it
//
// `scientificSpec` holds ONLY research-defining inputs. Build/runtime facts
// (gitHead, branch, workingTreeStatus, generatedAt) live in `buildProvenance`
// instead (assembled after `now` below) and are NEVER part of this hash — a
// new commit between two identical-inputs runs must not change what counts
// as "the same experiment". See `computeScientificSpecHash` in
// lib/research/bao18-walkforward.ts (mirrors protocol.ts's canonical-hash
// pattern) — this script imports the real hashing function rather than
// reimplementing it.
// ---------------------------------------------------------------------------
const resolvedLookback =
  Number.isInteger(CURRENT_PROTOCOL.lookback) && CURRENT_PROTOCOL.lookback > 0 ? CURRENT_PROTOCOL.lookback : 90;
const ticketPrice = MEGA_645.ticketPrice;
if (!Number.isInteger(ticketPrice) || ticketPrice <= 0) fail("không xác định được ticket price từ repo (MEGA_645.ticketPrice)");

const RULE_FAMILY: Bao18Rule[] = ["RANDOM18", ...BAO18_NON_RANDOM_RULES];

const scientificSpec: Bao18ScientificSpec = {
  experiment: "bao18-walkforward-reverse-audit",
  version: "2.0",
  datasetSha256: recomputedHash,
  lookback: resolvedLookback,
  seed: SEED,
  rules: RULE_FAMILY,
  primaryEndpoint: "poolHit6",
  null: "C(18,6)/C(45,6)",
  alpha: ALPHA,
  holmFamily: BAO18_NON_RANDOM_RULES,
};
const scientificSpecHash = await computeScientificSpecHash(scientificSpec);
console.log(`\n  Lookback đã khóa: ${resolvedLookback}`);
console.log(`  Seed: ${SEED}`);
console.log(`  Rule family: ${RULE_FAMILY.join(", ")}`);
console.log(`  scientificSpecHash: ${scientificSpecHash} (KHÔNG bao gồm gitHead/branch/timestamp — xem buildProvenance riêng)`);

// ---------------------------------------------------------------------------
// §26 — Artifact identity / collision guard (fail-closed, never overwrite)
// ---------------------------------------------------------------------------
const now = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
const ts = `${String(now.getFullYear()).slice(2)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
const reportBase = `reports/${ts}-bao18-walkforward-reverse-audit`;
const jsonPath = `${projectRoot}${reportBase}.json`;
const mdPath = `${projectRoot}${reportBase}.md`;
if (existsSync(jsonPath) || existsSync(mdPath)) {
  fail(`artifact đã tồn tại tại ${reportBase}.{json,md} — không overwrite, chạy lại ở phút khác để có timestamp mới.`);
}

// Build/runtime provenance — deliberately SEPARATE from `scientificSpecHash`
// above. Two artifacts with the same `scientificSpecHash` represent the same
// science even if `buildProvenance` differs (different commit, different
// minute); two artifacts with different `scientificSpecHash` do NOT, no
// matter how similar `buildProvenance` looks.
const buildProvenance = {
  gitHead,
  branch: gitBranch,
  workingTreeStatus,
  generatedAt: now.toISOString(),
  runtimeVersion: process.version,
};

// ---------------------------------------------------------------------------
// Math recap (§4/§20) + theoretical null (§7)
// ---------------------------------------------------------------------------
const totalCombinations = MEGA_645.totalCombinations;
const bao18Tickets = baoTickets(18);
const bao18CostPerDraw = baoCost(18);
const nullJackpotProbability = baoJackpotProbability(18);
console.log(`\n  C(45,6) = ${totalCombinations.toLocaleString("vi-VN")}`);
console.log(`  C(18,6) = ${bao18Tickets.toLocaleString("vi-VN")} vé/kỳ, ${bao18CostPerDraw.toLocaleString("vi-VN")} ₫/kỳ`);
console.log(`  p0 = C(18,6)/C(45,6) = ${nullJackpotProbability.toExponential(6)}`);
console.log(`  E[K] hypergeometric = ${hypergeometricExpectedK(18).toFixed(4)}`);

// ---------------------------------------------------------------------------
// Protocol A (reverse peek) — must be 100%, over the SAME range as Protocol B
// ---------------------------------------------------------------------------
console.log("\n== Protocol A — reverse peek (INVALID_AS_EVIDENCE_OF_EDGE) ==");
const protocolAObservations = runProtocolA(draws, SEED, resolvedLookback);
const protocolAHit6Count = protocolAObservations.filter((o) => o.hit6).length;
const protocolAHit6Rate = protocolAObservations.length ? protocolAHit6Count / protocolAObservations.length : 0;
console.log(`  Kỳ đánh giá: ${protocolAObservations.length}`);
console.log(`  Hit6: ${protocolAHit6Count} (${(protocolAHit6Rate * 100).toFixed(4)}%)`);
if (protocolAObservations.length === 0) fail("Protocol A không có kỳ đánh giá nào — kiểm tra lookback/dataset");
if (protocolAHit6Rate !== 1) {
  fail(`Protocol A không đạt 100% (đạt ${(protocolAHit6Rate * 100).toFixed(4)}%) — đây là bug trong harness, không phải kết quả hợp lệ.`);
}
console.log("  ✓ Protocol A = 100% như kỳ vọng. Label: INVALID_AS_EVIDENCE_OF_EDGE.");

// ---------------------------------------------------------------------------
// Protocol B — valid walk-forward, all rules including RANDOM18
// ---------------------------------------------------------------------------
console.log("\n== Protocol B — walk-forward (valid) ==");
const range = evaluationRange(draws.length, resolvedLookback);
console.log(`  Tổng kỳ snapshot: ${draws.length}`);
console.log(`  Kỳ đánh giá: ${range.evaluatedCount} (t=${range.start}..${range.end})`);
console.log(`  Kỳ warmup bỏ qua: ${range.skippedWarmup}`);
console.log(`  Kỳ đánh giá đầu: #${draws[range.start]?.id} / ${draws[range.start]?.date}`);
console.log(`  Kỳ đánh giá cuối: #${draws[range.end]?.id} / ${draws[range.end]?.date}`);

const observationsByRule = new Map<Bao18Rule, Bao18Observation[]>();
for (const rule of RULE_FAMILY) {
  observationsByRule.set(rule, runRuleWalkForward(draws, rule, SEED, resolvedLookback));
}
const randomObservations = observationsByRule.get("RANDOM18")!;

type EarlyLate = { n: number; meanK: number; hit6Count: number; hit6Rate: number; fixedPrizePayout: number };

function summarizeHalf(observations: Bao18Observation[]): EarlyLate {
  const n = observations.length;
  const meanK = n ? observations.reduce((s, o) => s + o.k, 0) / n : 0;
  const hit6Count = observations.filter((o) => o.hit6).length;
  const fixedPrizePayout = observations.reduce((s, o) => s + fixedPrizePayoutForDraw(18, o.k), 0);
  return { n, meanK, hit6Count, hit6Rate: n ? hit6Count / n : 0, fixedPrizePayout };
}

type RuleReport = {
  rule: Bao18Rule;
  n: number;
  hit6Count: number;
  hit6Rate: number;
  expectedNullHits: number;
  rawPValue: number;
  adjustedPValue: number | null;
  ci95: { lower: number; upper: number; method: "clopper-pearson" };
  intersectionHistogram: Record<number, number>;
  meanIntersection: number;
  medianIntersection: number;
  hit4PlusRate: number;
  hit5PlusRate: number;
  fixedPrizePayout: number;
  totalCost: number;
  fixedNet: number;
  costPerHit6: number | "no_observed_hit";
  early: EarlyLate;
  late: EarlyLate;
};

function buildRuleReport(rule: Bao18Rule, observations: Bao18Observation[]): RuleReport {
  const n = observations.length;
  const hit6Count = observations.filter((o) => o.hit6).length;
  const hit6Rate = n ? hit6Count / n : 0;
  const expectedNullHits = n * nullJackpotProbability;
  const rawPValue = binomialTailAtLeast(n, hit6Count, nullJackpotProbability);
  const ci = clopperPearsonCI(n, hit6Count, ALPHA);
  const histogram: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const o of observations) histogram[o.k] += 1;
  const ks = observations.map((o) => o.k).sort((a, b) => a - b);
  const meanIntersection = n ? ks.reduce((s, k) => s + k, 0) / n : 0;
  const medianIntersection = n ? (n % 2 === 1 ? ks[(n - 1) / 2] : (ks[n / 2 - 1] + ks[n / 2]) / 2) : 0;
  const hit4PlusRate = n ? observations.filter((o) => o.k >= 4).length / n : 0;
  const hit5PlusRate = n ? observations.filter((o) => o.k >= 5).length / n : 0;
  const fixedPrizePayout = observations.reduce((s, o) => s + fixedPrizePayoutForDraw(18, o.k), 0);
  const totalCost = n * bao18CostPerDraw;
  const fixedNet = fixedPrizePayout - totalCost;
  const half = Math.floor(n / 2);
  const early = summarizeHalf(observations.slice(0, half));
  const late = summarizeHalf(observations.slice(half));
  return {
    rule,
    n,
    hit6Count,
    hit6Rate,
    expectedNullHits,
    rawPValue,
    adjustedPValue: null, // filled in after Holm correction, non-random rules only
    ci95: { lower: ci.lower, upper: ci.upper, method: "clopper-pearson" },
    intersectionHistogram: histogram,
    meanIntersection,
    medianIntersection,
    hit4PlusRate,
    hit5PlusRate,
    fixedPrizePayout,
    totalCost,
    fixedNet,
    costPerHit6: hit6Count > 0 ? totalCost / hit6Count : "no_observed_hit",
    early,
    late,
  };
}

const ruleReports = new Map<Bao18Rule, RuleReport>();
for (const rule of RULE_FAMILY) ruleReports.set(rule, buildRuleReport(rule, observationsByRule.get(rule)!));

// §17 — Holm-Bonferroni across the primary (non-random) family only
const nonRandomReports = BAO18_NON_RANDOM_RULES.map((rule) => ruleReports.get(rule)!);
const holmInput = nonRandomReports.map((r) => ({ rule: r.rule, pValue: r.rawPValue }));
const holmOutput = holmBonferroni(holmInput, BAO18_NON_RANDOM_RULES.length);
for (const item of holmOutput) ruleReports.get(item.rule)!.adjustedPValue = item.adjustedPValue;

console.log("\n  Rule       | n     | Hit6 | Rate     | E[null] | raw p    | Holm p   | Mean K | ≥4     | ≥5");
for (const rule of RULE_FAMILY) {
  const r = ruleReports.get(rule)!;
  const adjStr = r.adjustedPValue === null ? "—" : r.adjustedPValue.toExponential(3);
  console.log(
    `  ${rule.padEnd(10)} | ${String(r.n).padStart(5)} | ${String(r.hit6Count).padStart(4)} | ` +
      `${(r.hit6Rate * 100).toFixed(4).padStart(7)}% | ${r.expectedNullHits.toFixed(2).padStart(7)} | ` +
      `${r.rawPValue.toExponential(3)} | ${adjStr} | ${r.meanIntersection.toFixed(3)} | ` +
      `${(r.hit4PlusRate * 100).toFixed(2)}% | ${(r.hit5PlusRate * 100).toFixed(2)}%`,
  );
}

// ---------------------------------------------------------------------------
// §18 — Paired comparison vs RANDOM18 (non-random rules only)
// ---------------------------------------------------------------------------
console.log("\n== Paired comparison vs RANDOM18 ==");
type PairedReport = {
  rule: Bao18NonRandomRule;
  meanDeltaK: number;
  /**
   * NOT a confidence interval for the true ΔK — percentiles of the sign-flip
   * NULL RANDOMIZATION distribution. See `pairedBootstrapCI95` below for the
   * actual CI. Kept only because the sign-flip p-value is computed from the
   * same procedure; do not present these bounds as "CI95" anywhere.
   */
  nullRandomizationInterval: { lower: number; upper: number };
  /** Valid (approximate) 95% CI for the true mean ΔK — paired bootstrap, 10,000 resamples. */
  pairedBootstrapCI95: { lower: number; upper: number };
  twoSidedPValue: number;
  contingency: { bothHit: number; bothMiss: number; ruleHitRandomMiss: number; ruleMissRandomHit: number };
  mcNemar: { kind: "exact"; discordant: number; pValue: number } | { kind: "insufficient" };
};
const pairedReports: PairedReport[] = [];
BAO18_NON_RANDOM_RULES.forEach((rule, index) => {
  const ruleObs = observationsByRule.get(rule)!;
  const deltas = ruleObs.map((o, i) => o.k - randomObservations[i].k);
  const signFlip = pairedSignFlipTest(deltas, SEED + 1000 + index, 10000);
  // Distinct seed derivation (combineSeed, not the same raw offset) so the
  // bootstrap resampling stream is genuinely independent of the sign-flip
  // stream — proves these are two different procedures, not the same code
  // path reused under two names (see the regression test in
  // bao18-walkforward.test.ts).
  const bootstrap = pairedBootstrapCI(deltas, combineSeed(SEED + 1000 + index, 0xb00757ab), 10000);
  let bothHit = 0;
  let bothMiss = 0;
  let ruleHitRandomMiss = 0;
  let ruleMissRandomHit = 0;
  ruleObs.forEach((o, i) => {
    const randomHit = randomObservations[i].hit6;
    if (o.hit6 && randomHit) bothHit += 1;
    else if (!o.hit6 && !randomHit) bothMiss += 1;
    else if (o.hit6 && !randomHit) ruleHitRandomMiss += 1;
    else ruleMissRandomHit += 1;
  });
  const mcNemar = exactMcNemar(ruleHitRandomMiss, ruleMissRandomHit, 6);
  pairedReports.push({
    rule,
    meanDeltaK: signFlip.meanDelta,
    nullRandomizationInterval: { lower: signFlip.nullRandomizationLower, upper: signFlip.nullRandomizationUpper },
    pairedBootstrapCI95: { lower: bootstrap.lower, upper: bootstrap.upper },
    twoSidedPValue: signFlip.twoSidedPValue,
    contingency: { bothHit, bothMiss, ruleHitRandomMiss, ruleMissRandomHit },
    mcNemar,
  });
  const mcNemarStr = mcNemar.kind === "exact" ? `p=${mcNemar.pValue.toExponential(3)} (n_discordant=${mcNemar.discordant})` : "INSUFFICIENT_DISCORDANT_EVENTS";
  console.log(
    `  ${rule.padEnd(10)}: ΔK mean=${signFlip.meanDelta.toFixed(4)} ` +
      `null-randomization[${signFlip.nullRandomizationLower.toFixed(4)}, ${signFlip.nullRandomizationUpper.toFixed(4)}] (NOT a CI) ` +
      `bootstrap-CI95=[${bootstrap.lower.toFixed(4)}, ${bootstrap.upper.toFixed(4)}] ` +
      `sign-flip p=${signFlip.twoSidedPValue.toFixed(4)} | McNemar: ${mcNemarStr}`,
  );
});

// ---------------------------------------------------------------------------
// §19 — Null-calibration context
// ---------------------------------------------------------------------------
const nullExpectedCount = range.evaluatedCount * nullJackpotProbability;
const nullProbZeroHits = binomialPmf(range.evaluatedCount, 0, nullJackpotProbability);
const nullPredictiveInterval95: [number, number] = [
  binomialQuantile(range.evaluatedCount, nullJackpotProbability, 0.025),
  binomialQuantile(range.evaluatedCount, nullJackpotProbability, 0.975),
];
const underpowered = nullExpectedCount < 5;

// ---------------------------------------------------------------------------
// Distribution analysis — observed K vs hypergeometric null (RANDOM18 as an
// empirical check that the closed-form null actually matches fair behavior)
// ---------------------------------------------------------------------------
const hypergeometricNullCounts: Record<number, number> = {};
for (let k = 0; k <= 6; k += 1) hypergeometricNullCounts[k] = hypergeometricPmf(18, k) * range.evaluatedCount;

// ---------------------------------------------------------------------------
// §33/§38 — Verdict taxonomy
// ---------------------------------------------------------------------------
type Verdict = "NO_EDGE" | "EXPLORATORY_RETROSPECTIVE_SIGNAL";
function decideVerdict(report: RuleReport): { verdict: Verdict; reasons: string[] } {
  const reasons: string[] = [];
  const positiveLift = report.hit6Rate > nullJackpotProbability || report.meanIntersection > hypergeometricExpectedK(18);
  const significant = report.adjustedPValue !== null && report.adjustedPValue <= ALPHA;
  const earlyLiftSign = Math.sign(report.early.meanK - hypergeometricExpectedK(18));
  const lateLiftSign = Math.sign(report.late.meanK - hypergeometricExpectedK(18));
  const notReversed = earlyLiftSign === 0 || lateLiftSign === 0 || earlyLiftSign === lateLiftSign;
  if (!positiveLift) reasons.push("không có lift dương so với null lý thuyết");
  if (!significant) reasons.push("Holm-adjusted p-value không <= alpha (hoặc không được tính do family rỗng)");
  if (!notReversed) reasons.push("hướng effect đảo dấu giữa EARLY và LATE — không ổn định theo thời gian");
  if (positiveLift && significant && notReversed) {
    return { verdict: "EXPLORATORY_RETROSPECTIVE_SIGNAL", reasons: ["positive lift + Holm-significant + stable direction — NEEDS_PROSPECTIVE_CONFIRMATION"] };
  }
  return { verdict: "NO_EDGE", reasons };
}

const verdicts = new Map<Bao18NonRandomRule, { verdict: Verdict; reasons: string[] }>();
for (const rule of BAO18_NON_RANDOM_RULES) verdicts.set(rule, decideVerdict(ruleReports.get(rule)!));

const anySignal = [...verdicts.values()].some((v) => v.verdict === "EXPLORATORY_RETROSPECTIVE_SIGNAL");
const finalVerdict = anySignal
  ? "EXPLORATORY_RETROSPECTIVE_SIGNAL — NEEDS_PROSPECTIVE_CONFIRMATION"
  : "NO_EDGE";

console.log(`\n== Final verdict: ${finalVerdict} ==`);
for (const rule of BAO18_NON_RANDOM_RULES) {
  const v = verdicts.get(rule)!;
  console.log(`  ${rule}: ${v.verdict}${v.verdict === "NO_EDGE" ? ` (${v.reasons.join("; ")})` : ""}`);
}

// ---------------------------------------------------------------------------
// §30/§31 — Write JSON artifact
// ---------------------------------------------------------------------------
const artifact = {
  schemaVersion: 2,
  generatedAt: now.toISOString(),
  buildProvenance,
  datasetSha256: recomputedHash,
  datasetRecordCount: draws.length,
  firstDraw: { id: draws[0].id, date: draws[0].date },
  latestDraw: { id: draws.at(-1)!.id, date: draws.at(-1)!.date },
  lookback: resolvedLookback,
  seed: SEED,
  scientificSpecHash,
  math: {
    totalCombinations,
    bao18Tickets,
    ticketPrice,
    bao18CostPerDraw,
    nullJackpotProbability,
  },
  protocolA: {
    evaluatedDraws: protocolAObservations.length,
    hit6Count: protocolAHit6Count,
    hit6Rate: protocolAHit6Rate,
    verdict: "INVALID_PEEK_ONLY",
  },
  protocolB: {
    evaluationRange: range,
    perRule: Object.fromEntries(RULE_FAMILY.map((rule) => [rule, ruleReports.get(rule)!])),
  },
  pairedComparison: Object.fromEntries(pairedReports.map((p) => [p.rule, p])),
  nullCalibration: {
    evaluatedDraws: range.evaluatedCount,
    nullJackpotProbability,
    nullExpectedCount,
    nullProbZeroHits,
    nullPredictiveInterval95,
    underpowered,
  },
  distributionAnalysis: {
    hypergeometricNullCounts,
    observedByRule: Object.fromEntries(RULE_FAMILY.map((rule) => [rule, ruleReports.get(rule)!.intersectionHistogram])),
  },
  verdictsByRule: Object.fromEntries(BAO18_NON_RANDOM_RULES.map((rule) => [rule, verdicts.get(rule)!])),
  antiLeakTests: {
    note:
      "Evidence-gated (not a hardcoded claim): this CLI run spawned lib/research/bao18-walkforward.test.ts as a " +
      "child process at generation time and refused to write this artifact unless it exited 0 — see `evidence` for " +
      "the exact source hash, command, and verification timestamp.",
    allPassing: antiLeakEvidence.exitCode === 0,
    evidence: antiLeakEvidence,
  },
  finalVerdict,
  scientificGrade: "C — NO DEMONSTRATED EDGE",
};

await writeFile(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(`\n  ✓ JSON artifact: ${reportBase}.json`);

// ---------------------------------------------------------------------------
// §32 — Markdown report
// ---------------------------------------------------------------------------
function fmtPct(x: number): string {
  return `${(x * 100).toFixed(4)}%`;
}
function fmtVnd(x: number): string {
  return `${Math.round(x).toLocaleString("vi-VN")} ₫`;
}

const ruleTableRows = RULE_FAMILY.map((rule) => {
  const r = ruleReports.get(rule)!;
  const adj = r.adjustedPValue === null ? "—" : r.adjustedPValue.toExponential(3);
  return `| ${rule} | ${r.n} | ${r.hit6Count} | ${fmtPct(r.hit6Rate)} | ${r.expectedNullHits.toFixed(3)} | ${r.rawPValue.toExponential(3)} | ${adj} | ${r.meanIntersection.toFixed(4)} | ${fmtPct(r.hit4PlusRate)} | ${fmtPct(r.hit5PlusRate)} |`;
}).join("\n");

const distributionRows = Array.from({ length: 7 }, (_, k) => {
  const nullCount = hypergeometricNullCounts[k];
  const obs = RULE_FAMILY.map((rule) => ruleReports.get(rule)!.intersectionHistogram[k]).join(" | ");
  return `| ${k} | ${hypergeometricPmf(18, k).toFixed(6)} | ${nullCount.toFixed(2)} | ${obs} |`;
}).join("\n");

const pairedRows = pairedReports
  .map((p) => {
    const mcNemarStr = p.mcNemar.kind === "exact" ? `p=${p.mcNemar.pValue.toExponential(3)} (n=${p.mcNemar.discordant})` : "INSUFFICIENT_DISCORDANT_EVENTS";
    return `| ${p.rule} | ${p.meanDeltaK.toFixed(4)} | [${p.nullRandomizationInterval.lower.toFixed(4)}, ${p.nullRandomizationInterval.upper.toFixed(4)}] | [${p.pairedBootstrapCI95.lower.toFixed(4)}, ${p.pairedBootstrapCI95.upper.toFixed(4)}] | ${p.twoSidedPValue.toFixed(4)} | ${p.contingency.bothHit} | ${p.contingency.bothMiss} | ${p.contingency.ruleHitRandomMiss} | ${p.contingency.ruleMissRandomHit} | ${mcNemarStr} |`;
  })
  .join("\n");

const stabilityRows = RULE_FAMILY.map((rule) => {
  const r = ruleReports.get(rule)!;
  return `| ${rule} | ${r.early.n} | ${r.early.meanK.toFixed(4)} | ${r.early.hit6Count} | ${fmtPct(r.early.hit6Rate)} | ${fmtVnd(r.early.fixedPrizePayout)} | ${r.late.n} | ${r.late.meanK.toFixed(4)} | ${r.late.hit6Count} | ${fmtPct(r.late.hit6Rate)} | ${fmtVnd(r.late.fixedPrizePayout)} |`;
}).join("\n");

const verdictRows = BAO18_NON_RANDOM_RULES.map((rule) => {
  const v = verdicts.get(rule)!;
  return `- **${rule}**: \`${v.verdict}\`${v.verdict === "EXPLORATORY_RETROSPECTIVE_SIGNAL" ? " — **NEEDS_PROSPECTIVE_CONFIRMATION**" : ` (${v.reasons.join("; ")})`}`;
}).join("\n");

const report = `# Bao-18 Reverse-Proof Walk-Forward Adversarial Audit

**Generated:** ${now.toISOString()}
**Scientific grade:** C — NO DEMONSTRATED EDGE
**Final verdict:** \`${finalVerdict}\`

---

## A. Executive Verdict

1. **Bao-18 có thể trúng Jackpot khi nào?** Chỉ khi 6 số thực tế của kỳ quay nằm trọn trong pool 18 số đã khóa trước kỳ đó (\`R_t ⊆ P_t\`) — không cần mua đủ 18.564 vé để xác định điều này, chỉ cần biết \`|R_t ∩ P_t| = 6\`.
2. **Protocol A (reverse peek) đạt gì?** ${fmtPct(protocolAHit6Rate)} hit6 trên ${protocolAObservations.length} kỳ — đúng 100% như kỳ vọng của một tautology.
3. **Vì sao A invalid?** Pool được khởi tạo TRỰC TIẾP từ 6 số thật của chính kỳ đang chấm điểm (circular oracle/look-ahead). Đây không phải một rule dự đoán — nó đọc đáp án trước khi "dự đoán".
4. **Protocol B (walk-forward hợp lệ) thực tế đạt bao nhiêu?** Xem bảng §E — mỗi rule chỉ dùng \`draws[0:t]\`, không bao giờ thấy \`draws[t]\` hay xa hơn.
5. **Có vượt theoretical/random baseline không?** ${anySignal ? "Có ít nhất một rule cho tín hiệu dương có ý nghĩa sau hiệu chỉnh Holm (xem §E/§L) — nhưng xem ngay điều 6 và 7 trước khi diễn giải." : "Không rule nào (HOT18/COLD18/OVERDUE18/BALANCED18) vượt null lý thuyết một cách có ý nghĩa thống kê sau hiệu chỉnh Holm-Bonferroni."}
6. **Statistical uncertainty lớn đến đâu?** Với p0 = ${nullJackpotProbability.toExponential(4)} và n=${range.evaluatedCount} kỳ đánh giá, kỳ vọng null chỉ ${nullExpectedCount.toFixed(3)} lần hit6 — ${underpowered ? "đây là một con số RẤT nhỏ, nghĩa là dataset hiện tại quá ngắn để phân biệt một lift vừa phải khỏi nhiễu ngẫu nhiên." : "đủ lớn để có power thống kê hợp lý, nhưng vẫn nên đọc CI trước khi kết luận."}
7. **Final classification:** \`${finalVerdict}\`.

${anySignal ? "" : "> Reverse-peek có thể tạo ra ảo giác chiến thắng hoàn hảo, nhưng khi kỷ luật walk-forward được áp dụng, Bao-18 chỉ mua coverage bằng ngân sách lớn hơn và chưa cho thấy predictive edge."}

---

## B. Data & Provenance

| | |
|---|---|
| Git HEAD | \`${gitHead}\` |
| Branch | \`${gitBranch}\` |
| Working tree | ${workingTreeStatus} |
| Dataset SHA-256 | \`${recomputedHash}\` |
| Bản ghi | ${draws.length} |
| Kỳ đầu | #${draws[0].id} / ${draws[0].date} |
| Kỳ cuối | #${draws.at(-1)!.id} / ${draws.at(-1)!.date} |
| Kỳ đánh giá | ${range.evaluatedCount} (t=${range.start}..${range.end}, warmup bỏ qua=${range.skippedWarmup}) |
| Kỳ đánh giá đầu/cuối | #${draws[range.start]?.id} / ${draws[range.start]?.date} → #${draws[range.end]?.id} / ${draws[range.end]?.date} |
| Lookback (khóa) | ${resolvedLookback} |
| Seed | ${SEED} |
| Scientific spec hash | \`${scientificSpecHash}\` (KHÔNG bao gồm gitHead/branch/timestamp — 2 artifact cùng hash này = cùng khoa học, kể cả khi commit/thời gian chạy khác nhau) |
| Runtime version | \`${buildProvenance.runtimeVersion}\` |

---

## C. Math Recap

- \`C(45,6) = ${totalCombinations.toLocaleString("vi-VN")}\`
- Bao-18: \`C(18,6) = ${bao18Tickets.toLocaleString("vi-VN")}\` vé, chi phí \`${fmtVnd(bao18CostPerDraw)}\`/kỳ
- \`p0 = C(18,6)/C(45,6) = ${nullJackpotProbability.toExponential(6)}\`
- Hypergeometric null cho K=|R_t∩P_t|: \`P(K=k) = C(18,k)·C(27,6-k) / C(45,6)\`, \`E[K] = 6×18/45 = ${hypergeometricExpectedK(18).toFixed(4)}\`
- Exact lower-tier: \`N_j(m) = C(m,j)·C(18-m,6-j)\` — chứng minh khớp brute-force 18.564 vé trong \`bao18-walkforward.test.ts\` (§29)

---

## D. Protocol A — INVALID Reverse Peek

| Kỳ đánh giá | Hit6 | Rate |
|---|---|---|
| ${protocolAObservations.length} | ${protocolAHit6Count} | ${fmtPct(protocolAHit6Rate)} |

## **\`INVALID_AS_EVIDENCE_OF_EDGE\`**

Pool = {6 số thật của kỳ t} ∪ {12 số ngẫu nhiên từ phần bù}. Vì 6 số thật luôn nằm trong pool, \`R_t ⊆ P_t\` luôn đúng — đây là tautology, không phải dự đoán. Không metric nào từ Protocol A được dùng để hỗ trợ bất kỳ claim edge nào.

---

## E. Protocol B — Walk-Forward

| Rule | n | Hit6 | Rate | E[null hits] | Raw p | Holm p | Mean K | ≥4 | ≥5 |
|---|---|---|---|---|---|---|---|---|---|
${ruleTableRows}

Holm-Bonferroni family = {${BAO18_NON_RANDOM_RULES.join(", ")}} (size ${BAO18_NON_RANDOM_RULES.length}); RANDOM18 là baseline thực nghiệm, không phải hypothesis chịu Holm. Alpha = ${ALPHA}.

**Verdict theo rule:**
${verdictRows}

---

## F. Distribution Analysis

Observed K=0…6 (đếm số kỳ) so với null lý thuyết hypergeometric (kỳ vọng số kỳ = pmf × n=${range.evaluatedCount}):

| K | P(K) hypergeometric | E[count] null | ${RULE_FAMILY.join(" | ")} |
|---|---|---|${RULE_FAMILY.map(() => "---").join("|")}|
${distributionRows}

RANDOM18 đóng vai trò kiểm tra thực nghiệm rằng công thức hypergeometric closed-form thực sự khớp hành vi của một pool không phụ thuộc lịch sử.

---

## G. RANDOM18 Paired Comparison

Mỗi kỳ đánh giá được chấm điểm bởi cả rule và RANDOM18 (paired), nên so sánh trực tiếp ΔK = K_rule − K_random hợp lệ hơn so sánh hai baseline độc lập.

| Rule | Mean ΔK | Null-randomization interval* | Bootstrap 95% CI (ΔK)† | 2-sided p (sign-flip) | Both hit | Both miss | Rule hit/Random miss | Rule miss/Random hit | McNemar |
|---|---|---|---|---|---|---|---|---|---|
${pairedRows}

\\* **Null-randomization interval — KHÔNG PHẢI confidence interval.** Đây là percentile 2.5/97.5 của phân phối sign-flip DƯỚI GIẢ THUYẾT NULL (rule và RANDOM18 hoán đổi được cho nhau) — nó mô tả hành vi của null, không phải sampling distribution của ước lượng, nên không có valid coverage cho ΔK thật. Dùng cột kế bên để đọc uncertainty của hiệu ứng.

† **Bootstrap 95% CI — CÓ valid coverage (xấp xỉ).** Resample 10.000 lần CÓ HOÀN LẠI trên chính n cặp quan sát (K_rule, K_random), lấy percentile 2.5/97.5 của phân phối mean ΔK resample được. Đây mới là khoảng ước lượng nên dùng khi diễn giải độ bất định của hiệu ứng thật.

Sign-flip p-value và bootstrap CI đều dùng deterministic seeded RNG (không dùng \`Math.random\`), nhưng từ hai stream/seed khác nhau (bootstrap dùng \`combineSeed\` với salt riêng) — hai thủ tục resampling độc lập, không phải cùng một code path đội lốt hai tên. McNemar exact chỉ tính khi số sự kiện discordant ≥ 6; dưới ngưỡng đó được ghi \`INSUFFICIENT_DISCORDANT_EVENTS\` thay vì ép ra một p-value không đáng tin.

---

## H. Time Stability

| Rule | EARLY n | EARLY mean K | EARLY hit6 | EARLY rate | EARLY fixed payout | LATE n | LATE mean K | LATE hit6 | LATE rate | LATE fixed payout |
|---|---|---|---|---|---|---|---|---|---|---|
${stabilityRows}

Một rule chỉ được coi là "đáng chú ý hơn" khi hướng effect không đảo mạnh giữa EARLY và LATE — ổn định theo thời gian không thay thế significance, chỉ là điều kiện cần thêm.

---

## I. Economic Reality

- Full Bao-18: **${bao18Tickets.toLocaleString("vi-VN")} vé/kỳ**, **${fmtVnd(bao18CostPerDraw)}/kỳ**
- Tổng chi phí giả định cho ${range.evaluatedCount} kỳ đánh giá: **${fmtVnd(range.evaluatedCount * bao18CostPerDraw)}**
- Giải cố định (loại trừ Jackpot) là khoản mục duy nhất được cộng vào EV — Jackpot value = UNKNOWN/VARIABLE, không trộn vào.
- Đồng nhất thức chi phí kỳ vọng/mỗi Jackpot dưới null không-edge: \`Expected cost per jackpot = C(18,6)×ticketPrice / (C(18,6)/C(45,6)) = C(45,6)×ticketPrice = ${fmtVnd(totalCombinations * ticketPrice)}\` — con số này KHÔNG phụ thuộc pool size, đúng cho mọi Bao-n dưới giả định fair draw.
- Một portfolio 18.564 vé DISTINCT chọn ngẫu nhiên từ toàn bộ C(45,6) (không lặp vé) cũng có union jackpot probability đúng bằng \`18,564/8,145,060 = ${(bao18Tickets / totalCombinations).toExponential(6)}\` — **giống hệt** Bao-18. Bao-18 không tạo xác suất "miễn phí"; nó mua một phần lớn hơn của outcome space bằng một phần ngân sách lớn hơn tương ứng. Khác biệt thực sự nằm ở cấu trúc coverage của các bậc giải thấp hơn (giải Ba/Nhì/Nhất), không phải ở xác suất Jackpot.
- Không dùng module portfolio 30-vé (projective, capped) để giả vờ so sánh trực tiếp với ngân sách 18.564 vé — hai thang ngân sách khác nhau hoàn toàn (§22).

Chi tiết per-rule (gross fixed-prize payout, tổng chi phí giả định, net, cost-per-observed-hit6): xem bảng §E và JSON artifact.

---

## J. Why Reverse Peek Feels Convincing

- **Look-ahead bias**: dùng thông tin chỉ tồn tại SAU thời điểm cần dự đoán.
- **Tautology**: câu hỏi ("số nào sẽ trúng") và câu trả lời ("chính 6 số đó") là một, không có suy luận thực sự.
- **Circular validation**: đo hiệu năng của một hệ thống bằng chính dữ liệu nó vừa dùng để xây pool.
- **Target leakage**: kết quả tương lai rò rỉ vào input của builder — triệu chứng kinh điển của một pipeline ML bị lỗi.
- **Cherry-picking / survivorship**: nếu chỉ nhìn các kỳ "đẹp" hoặc chỉ nhìn Protocol A mà quên đối chiếu Protocol B, dễ ngộ nhận "hệ thống hoạt động".

Protocol A tồn tại chính xác để minh họa mức độ khủng khiếp của leakage: một tautology vô nghĩa vẫn có thể trông "100% chính xác".

---

## K. Anti-Leak Evidence

**Đây KHÔNG phải một khẳng định chữ suông.** CLI này đã tự spawn file test làm child process NGAY TRONG LẦN CHẠY SINH RA ARTIFACT NÀY, và đã fail-closed (từ chối ghi artifact) nếu tiến trình đó không exit 0. Bằng chứng cụ thể của chính lần chạy này:

| | |
|---|---|
| Test file | \`${antiLeakEvidence.testFile}\` |
| Test file SHA-256 (tại thời điểm chạy) | \`${antiLeakEvidence.testFileSha256}\` |
| Command | \`${antiLeakEvidence.command}\` |
| Exit code | ${antiLeakEvidence.exitCode} |
| Pass count | ${antiLeakEvidence.passCount ?? "?"} |
| Fail count | ${antiLeakEvidence.failCount ?? "?"} |
| Verified at | ${antiLeakEvidence.verifiedAt} |

Trong đó có 5 anti-leak test bắt buộc (§13):

1. **Protocol A sanity** — 100% hit6 trên toàn bộ kỳ đánh giá thật.
2. **Target mutation** — đổi \`draws[t].result\`, pool tại t (mọi rule) không đổi.
3. **Future suffix mutation** — xáo trộn toàn bộ \`draws[t...]\`, pool tại t không đổi.
4. **Replay-prefix invariance** — truncate dataset tại t+1, pool tại t giống hệt full dataset.
5. **Determinism** — cùng input luôn cho cùng pool.

Cộng thêm: proof-by-test cho công thức closed-form \`N_j(m)\` khớp chính xác brute-force enumerate toàn bộ 18.564 vé (§29). Muốn tái xác minh độc lập với hash trên: \`node --import=tsx --test lib/research/bao18-walkforward.test.ts\` rồi so khớp SHA-256 của chính file test với giá trị ghi ở trên.

---

## L. Statistical Power & Limitations

- Kỳ vọng số lần hit6 dưới null lý thuyết trên ${range.evaluatedCount} kỳ: **${nullExpectedCount.toFixed(4)}**.
- P(quan sát đúng 0 hit6 | null đúng) = **${nullProbZeroHits.toFixed(4)}**.
- 95% predictive interval cho số lần hit6 dưới null: **[${nullPredictiveInterval95[0]}, ${nullPredictiveInterval95[1]}]**.
- ${underpowered ? "Kỳ vọng null nhỏ hơn 5 — dataset hiện tại (chỉ 1 draw/kỳ, ~1471 kỳ đánh giá) có thể quá ngắn để phân biệt một lift vừa phải khỏi nhiễu thống kê của biến cố hiếm. Một rate quan sát cao hơn null không tự động là bằng chứng đủ mạnh." : "Kỳ vọng null đủ lớn để có power thống kê hợp lý cho một lift vừa-lớn, nhưng biến cố hit6 vẫn hiếm — luôn đọc CI/Holm-p trước khi kết luận."}

**\`NO_EDGE\` ở đây nghĩa chính xác là \`NO_EVIDENCE_OF_EDGE\`, KHÔNG PHẢI \`EVIDENCE_OF_NO_EDGE\` — hai claim này KHÁC NHAU và việc gộp chúng lại là một lỗi thống kê kinh điển:**

- \`NO_EVIDENCE_OF_EDGE\` (đúng với kết quả hiện tại): chúng ta KHÔNG tìm thấy lift có ý nghĩa thống kê — nhưng test này có thể **thiếu power** để phát hiện một lift vừa phải nếu nó thực sự tồn tại. Với E[null hit6] ≈ ${nullExpectedCount.toFixed(2)} trên ${range.evaluatedCount} kỳ (biến cố CỰC HIẾM), power để phát hiện một lift vừa-nhỏ là rất thấp — "không thấy" ở đây gần với "không đủ dữ liệu để thấy" hơn là "chắc chắn không có gì để thấy".
- \`EVIDENCE_OF_NO_EDGE\` (KHÔNG phải kết luận ở đây, và audit này không có đủ power để đưa ra kết luận đó): sẽ đòi hỏi một thiết kế có power cao — ví dụ pre-registered equivalence test với biên hợp lý (TOST) hoặc CI đủ hẹp để loại trừ mọi lift "đáng quan tâm" — chứ không chỉ đơn thuần "p-value không có ý nghĩa". Chúng ta CHƯA làm điều đó ở đây.
- Nói cách khác: "absence of evidence is not evidence of absence" — kết quả NO_EDGE hiện tại là một tuyên bố khiêm tốn ("chưa chứng minh được edge"), không phải một tuyên bố mạnh ("đã chứng minh không có edge"). Bootstrap CI ở §G cho một cách đọc trực tiếp độ rộng bất định của ΔK — nếu CI đó rộng và chứa cả những giá trị lift "đáng chú ý", đó chính là dấu hiệu underpowered, không phải bằng chứng null.
- Đây là dữ liệu **hồi cứu** (retrospective) — Protocol B walk-forward loại được look-ahead trong CÁCH XÂY POOL, nhưng KHÔNG chứng minh rule chưa từng được ai nhìn thấy trước khi các kỳ này xảy ra. Retrospective significance ≠ live predictive edge.
- Giá trị Jackpot thực tế thay đổi theo doanh số bán vé và số người trúng chia sẻ — không giả định cố định; EV ở đây chỉ tính giải cố định.
- Giả định luật chia thưởng/tax hiện tại của Vietlott không thay đổi trong giai đoạn dữ liệu.

---

## M. Reproduction Commands

\`\`\`bash
npm run typecheck
node --import=tsx --test lib/research/bao18-walkforward.test.ts
npm run research:bao18-audit
\`\`\`

---

## Final Scientific Interpretation

${anySignal
  ? `Ít nhất một rule (${[...verdicts.entries()].filter(([, v]) => v.verdict === "EXPLORATORY_RETROSPECTIVE_SIGNAL").map(([r]) => r).join(", ")}) cho tín hiệu dương vượt qua Holm-adjusted p ≤ ${ALPHA} và ổn định theo thời gian. Đây LÀ MỘT \`EXPLORATORY_RETROSPECTIVE_SIGNAL\`, KHÔNG PHẢI bằng chứng live. Rule phải được đóng băng (exact rule, lookback, seed, tie-break, kế hoạch phân tích) và đánh giá prospectively trên các kỳ CHƯA tồn tại tại thời điểm khóa (từ kỳ #${nextDrawId(draws.at(-1)!.id) ?? "?"} trở đi theo protocol lock hiện hành) trước khi bất kỳ claim predictive nào được đưa ra. \`NEEDS_PROSPECTIVE_CONFIRMATION\`.`
  : "Protocol A đạt 100% (tautology, INVALID). Protocol B, dưới kỷ luật walk-forward nghiêm ngặt, không cho rule nào vượt null lý thuyết một cách có ý nghĩa thống kê sau hiệu chỉnh multiple-testing. Kết luận chính: reverse-peek có thể tạo ra ảo giác chiến thắng hoàn hảo, nhưng khi kỷ luật walk-forward được áp dụng, Bao-18 chỉ mua coverage bằng ngân sách lớn hơn và chưa cho thấy predictive edge. Grade C — NO DEMONSTRATED EDGE giữ nguyên."}
`;

await writeFile(mdPath, report, "utf8");
console.log(`  ✓ Markdown report: ${reportBase}.md`);
console.log("\n  Xong.");
} // end isMainModule guard
