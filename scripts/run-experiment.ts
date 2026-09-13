/**
 * `npm run research:experiment` — registers and completes one experiment per
 * non-RANDOM strategy (§24/§25), against the current canonical dataset and
 * the frozen protocol (§26). Writes:
 *   - reports/experiments/registry.jsonl  (append-only experiment registry)
 *   - reports/experiments/<experimentId>.json  (one immutable artifact each)
 *
 * This is a research operation, not part of `npm test`: it reads the real
 * dataset and writes real files under reports/experiments/.
 */
import { execFileSync } from "node:child_process";
import { mkdir, appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStrategyPick, runTemporalBacktestReport } from "../lib/analytics";
import { loadSnapshot, resolvePaths } from "../lib/data/persistence";
import { MEGA_645 } from "../lib/mega645";
import {
  buildExperimentArtifactsFromReport,
  buildExperimentFamilySummary,
  countFamilyLooks,
  parseExperimentRegistry,
  primaryStrategyFamilyId,
  registerExperiment,
  registryHasExperiment,
  resolveHolmFamilySize,
  transitionExperiment,
} from "../lib/research/experiments";
import { spentAlphaForLook } from "../lib/research/alpha-spending";
import { CURRENT_PROTOCOL, computeProtocolHash, parseProtocolLock } from "../lib/research/protocol";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const paths = resolvePaths(projectRoot);
const experimentsDir = path.join(projectRoot, "reports", "experiments");
const registryPath = path.join(experimentsDir, "registry.jsonl");
const lockPath = path.join(projectRoot, "reports", "protocol-lock.json");

function gitCommit(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: projectRoot, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

const snapshot = await loadSnapshot(paths);
if (!snapshot.records.length || !snapshot.manifest) {
  console.error("Không có dữ liệu hoặc manifest — chạy npm run data:sync trước.");
  process.exit(1);
}

let registryText = "";
try {
  registryText = await readFile(registryPath, "utf8");
} catch {
  registryText = "";
}
const existing = parseExperimentRegistry(registryText);

let protocolLock = null;
try {
  protocolLock = parseProtocolLock(JSON.parse(await readFile(lockPath, "utf8")));
} catch {
  protocolLock = null;
}

const startedAt = new Date().toISOString();
const protocolHash = await computeProtocolHash(CURRENT_PROTOCOL);
const familyId = primaryStrategyFamilyId(CURRENT_PROTOCOL.version);
const datasetHash = snapshot.manifest.datasetSha256;
const familySize = resolveHolmFamilySize(existing, familyId);
const lookCount = Math.max(1, countFamilyLooks(existing, familyId, datasetHash));
const report = runTemporalBacktestReport(
  snapshot.records,
  CURRENT_PROTOCOL.lookback,
  CURRENT_PROTOCOL.alpha,
  familySize,
  lookCount,
);
const finishedAt = new Date().toISOString();
const commit = gitCommit();
const seed = 645;
const latestDrawId = snapshot.manifest.latestDrawId ?? snapshot.records.at(-1)?.id ?? null;

await mkdir(experimentsDir, { recursive: true });

const strategies = CURRENT_PROTOCOL.strategies.filter((s) => s !== "RANDOM");
const experimentIds = new Map<string, string>();
for (const strategy of strategies) {
  experimentIds.set(strategy, `${familyId}-${strategy.toLowerCase()}-${datasetHash.slice(0, 8)}`);
}

// The one honestly-derivable "prediction" at registration time: what the
// strategy actually outputs right now, given the full current dataset as its
// lookback window — i.e. its pick for the draw immediately after
// `latestDrawId`. Not a pre-registered prospective bet (that lives in
// `reports/prospective-scorecard.jsonl` via `research:prospective-freeze`);
// this is descriptive provenance for a retrospective registration.
const cutoffHistory = snapshot.records.slice(-CURRENT_PROTOCOL.lookback);
const latestDrawDate = snapshot.records.at(-1)?.date ?? null;

for (const strategy of strategies) {
  const experimentId = experimentIds.get(strategy)!;
  if (registryHasExperiment(existing, experimentId)) {
    console.log(`  Bỏ qua ${experimentId} (đã có trong registry)`);
    continue;
  }
  const prediction =
    cutoffHistory.length > 0 ? createStrategyPick(cutoffHistory, strategy as never, seed) : null;
  const registered = registerExperiment({
    experimentId,
    hypothesisId: `${strategy}-vs-random`,
    familyId,
    strategyId: strategy as never,
    strategyVersion: CURRENT_PROTOCOL.version,
    parameters: { lookback: CURRENT_PROTOCOL.lookback },
    seed,
    datasetHash,
    protocolVersion: CURRENT_PROTOCOL.version,
    protocolHash,
    // Pre-registration fields (§31/§35). `preRegistered: false` is honest,
    // not an oversight: this script registers an experiment AGAINST DATA
    // ALREADY KNOWN (the dataset up to `latestDrawId`), so this is a
    // retrospective registration, never a bet placed before seeing the
    // outcome. A genuinely pre-registered bet is what
    // `research:prospective-freeze` records instead.
    budgetTickets: 1,
    budgetVnd: MEGA_645.ticketPrice,
    predictionKind: "single_ticket",
    ...(prediction ? { predictions: prediction.map((n) => String(n).padStart(2, "0")) } : {}),
    preRegistered: false,
    ...(latestDrawId ? { dataCutoffDrawId: latestDrawId } : {}),
    ...(latestDrawDate ? { dataCutoffDate: latestDrawDate } : {}),
    rankingScoreVersion: null,
  });
  const completed = transitionExperiment(registered, "COMPLETED");
  await appendFile(registryPath, `${JSON.stringify(completed)}\n`, "utf8");
  existing.push(completed);
}

const artifacts = buildExperimentArtifactsFromReport({
  report,
  datasetSha256: datasetHash,
  gitCommit: commit,
  seed,
  experimentIdFor: (strategy) => experimentIds.get(strategy)!,
  runtime: { startedAt, finishedAt },
  protocolHash,
  protocolLock,
  latestDrawId,
});

for (const artifact of artifacts) {
  await writeFile(path.join(experimentsDir, `${artifact.experimentId}.json`), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
}

const familySummary = buildExperimentFamilySummary(existing, familyId);
const publicFamilyPath = path.join(projectRoot, "public", "data", "experiment-family.json");
await mkdir(path.dirname(publicFamilyPath), { recursive: true });
await writeFile(publicFamilyPath, `${JSON.stringify(familySummary, null, 2)}\n`, "utf8");

console.log(`\nĐÃ ĐĂNG KÝ VÀ HOÀN THÀNH ${artifacts.length} THỬ NGHIỆM`);
console.log(`  familyId:      ${familyId}`);
console.log(`  hypothesisCount / familySize: ${familySize}`);
console.log(`  lookCount:     ${lookCount}`);
console.log(`  spentAlpha:    ${spentAlphaForLook(lookCount, CURRENT_PROTOCOL.alpha)}`);
console.log(`  protocolHash:  ${protocolHash}`);
console.log(`  datasetHash:   ${datasetHash}`);
console.log(`  gitCommit:     ${commit ?? "—"}`);
console.log(`  evidence:      ${artifacts[0]?.controls.latestDrawEvidence ?? "—"}`);
for (const artifact of artifacts) {
  console.log(
    `  ${artifact.strategy.id.padEnd(10)} edge(test)=${artifact.statistics.effectSize?.toFixed(3)} ` +
      `p=${artifact.statistics.pValue?.toFixed(3)} adj.p=${artifact.statistics.adjustedPValue?.toFixed(3)}`,
  );
}
console.log(`\n  Registry: ${path.relative(projectRoot, registryPath)}`);
console.log(`  Family:   ${path.relative(projectRoot, publicFamilyPath)}`);
console.log(`  Artifacts: ${artifacts.map((a) => path.relative(projectRoot, path.join(experimentsDir, `${a.experimentId}.json`))).join(", ")}`);
