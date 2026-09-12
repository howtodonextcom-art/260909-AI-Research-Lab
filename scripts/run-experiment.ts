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
import { runTemporalBacktestReport } from "../lib/analytics";
import { loadSnapshot, resolvePaths } from "../lib/data/persistence";
import {
  buildExperimentArtifactsFromReport,
  countFamilyExperiments,
  parseExperimentRegistry,
  registerExperiment,
  registryHasExperiment,
  transitionExperiment,
} from "../lib/research/experiments";
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
const familyId = `protocol-${CURRENT_PROTOCOL.version}-primary-strategies`;
const familySize = countFamilyExperiments(existing, familyId) || 3;
const report = runTemporalBacktestReport(snapshot.records, CURRENT_PROTOCOL.lookback, CURRENT_PROTOCOL.alpha, familySize);
const finishedAt = new Date().toISOString();

const datasetHash = snapshot.manifest.datasetSha256;
const commit = gitCommit();
const seed = 645;
const latestDrawId = snapshot.manifest.latestDrawId ?? snapshot.records.at(-1)?.id ?? null;

await mkdir(experimentsDir, { recursive: true });

const strategies = CURRENT_PROTOCOL.strategies.filter((s) => s !== "RANDOM");
const experimentIds = new Map<string, string>();
for (const strategy of strategies) {
  experimentIds.set(strategy, `${familyId}-${strategy.toLowerCase()}-${datasetHash.slice(0, 8)}`);
}

for (const strategy of strategies) {
  const experimentId = experimentIds.get(strategy)!;
  if (registryHasExperiment(existing, experimentId)) {
    console.log(`  Bỏ qua ${experimentId} (đã có trong registry)`);
    continue;
  }
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

console.log(`\nĐÃ ĐĂNG KÝ VÀ HOÀN THÀNH ${artifacts.length} THỬ NGHIỆM`);
console.log(`  familyId:      ${familyId}`);
console.log(`  familySize:    ${familySize}`);
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
console.log(`  Artifacts: ${artifacts.map((a) => path.relative(projectRoot, path.join(experimentsDir, `${a.experimentId}.json`))).join(", ")}`);
