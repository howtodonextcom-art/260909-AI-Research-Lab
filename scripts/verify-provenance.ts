/**
 * `npm run research:verify-provenance` — standalone, zero-network CI gate
 * for the registry <-> protocol <-> artifact provenance chain, plus the
 * prospective scorecard's append-only hash chain (§Provenance & Research
 * Integrity audit, Round 4).
 *
 * Checks, purely by reading already-committed files (never the live
 * dataset, never the network, no writes):
 *   1. Every `reports/experiments/registry.jsonl` entry's `protocolHash` is
 *      either the current `reports/protocol-lock.json` hash or a documented
 *      historical one in `reports/protocol-history.json`.
 *   2. Every registry entry that has a matching `reports/experiments/<id>.json`
 *      artifact file agrees with it on protocolHash/datasetHash/experimentId.
 *   3. No two artifact files disagree about who owns one experimentId, and
 *      no artifact file's name lies about the experimentId it declares.
 *   4. `reports/prospective-scorecard.jsonl`'s append-only hash chain (for
 *      lines written after the chain was introduced — see
 *      `lib/research/prospective.ts`) is internally consistent; legacy
 *      pre-chain lines are reported as a distinct, honest category rather
 *      than silently folded into the chain.
 *
 * Exits 0 with a summary line on success, non-zero with a Vietnamese
 * explanation of every violation found on failure. Safe for CI: read-only,
 * makes no dataset assumptions, needs no `data:sync` beforehand.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseExperimentArtifact, parseExperimentRegistry, type ExperimentRecord } from "../lib/research/experiments";
import { parseProtocolHistory, parseProtocolLock, type ProtocolHistoryEntry, type ProtocolLock } from "../lib/research/protocol";
import {
  checkArtifactFileIntegrity,
  checkRegistryArtifactConsistency,
  checkRegistryProtocolHashes,
  parseProvenanceExceptions,
  triageViolations,
  type ArtifactFile,
  type ProvenanceException,
  type ProvenanceViolation,
} from "../lib/research/provenance-registry";
import { parseProspectiveLedger, verifyProspectiveChain } from "../lib/research/prospective";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const reportsDir = path.join(projectRoot, "reports");
const experimentsDir = path.join(reportsDir, "experiments");
const registryPath = path.join(experimentsDir, "registry.jsonl");
const lockPath = path.join(reportsDir, "protocol-lock.json");
const historyPath = path.join(reportsDir, "protocol-history.json");
const scorecardPath = path.join(reportsDir, "prospective-scorecard.jsonl");
const exceptionsPath = path.join(reportsDir, "provenance-exceptions.json");

async function readJsonIfPresent(filePath: string): Promise<{ present: false } | { present: true; value: unknown }> {
  try {
    return { present: true, value: JSON.parse(await readFile(filePath, "utf8")) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { present: false };
    throw error;
  }
}

async function readTextIfPresent(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

const fatalErrors: string[] = [];
const violations: ProvenanceViolation[] = [];

// --- 1. Registry -----------------------------------------------------------

const registryText = await readTextIfPresent(registryPath);
let records: ExperimentRecord[] = [];
try {
  records = parseExperimentRegistry(registryText);
} catch (error) {
  fatalErrors.push(`reports/experiments/registry.jsonl hỏng: ${(error as Error).message}`);
}

// --- 2. Protocol lock + history ---------------------------------------------

let currentLock: ProtocolLock | null = null;
const lockResult = await readJsonIfPresent(lockPath);
if (lockResult.present) {
  currentLock = parseProtocolLock(lockResult.value);
  if (!currentLock) {
    fatalErrors.push("reports/protocol-lock.json tồn tại nhưng không parse được đúng schema ProtocolLock.");
  }
}

let history: ProtocolHistoryEntry[] = [];
const historyResult = await readJsonIfPresent(historyPath);
if (historyResult.present) {
  const parsed = parseProtocolHistory(historyResult.value);
  if (parsed === null) {
    fatalErrors.push("reports/protocol-history.json tồn tại nhưng không parse được đúng schema ProtocolHistoryEntry[].");
  } else {
    history = parsed;
  }
}

if (fatalErrors.length) {
  for (const message of fatalErrors) console.error(`LỖI NGHIÊM TRỌNG: ${message}`);
  process.exit(1);
}

violations.push(...checkRegistryProtocolHashes(records, currentLock, history));

// --- 3. Artifact files -------------------------------------------------------

let artifactFileNames: string[] = [];
try {
  artifactFileNames = (await readdir(experimentsDir)).filter((name) => name.endsWith(".json"));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const artifactFiles: ArtifactFile[] = [];
for (const fileName of artifactFileNames) {
  const raw = await readJsonIfPresent(path.join(experimentsDir, fileName));
  const artifact = raw.present ? parseExperimentArtifact(raw.value) : null;
  if (!artifact) {
    violations.push({
      kind: "MALFORMED_ARTIFACT_FILE",
      experimentId: fileName,
      detail: `File reports/experiments/${fileName} không parse được đúng schema ExperimentArtifact.`,
    });
    continue;
  }
  artifactFiles.push({ fileName, artifact });
}

violations.push(...checkArtifactFileIntegrity(artifactFiles));

const artifactByExperimentId = new Map(artifactFiles.map((file) => [file.artifact.experimentId, file.artifact]));
for (const record of records) {
  violations.push(...checkRegistryArtifactConsistency(record, artifactByExperimentId.get(record.experimentId) ?? null));
}

// --- 4. Prospective scorecard hash chain ------------------------------------

const scorecardText = await readTextIfPresent(scorecardPath);
const ledger = parseProspectiveLedger(scorecardText);
for (const issue of ledger.issues) {
  fatalErrors.push(`reports/prospective-scorecard.jsonl dòng ${issue.line}: ${issue.reason}`);
}
const chainResult = verifyProspectiveChain(ledger.lines);
for (const problem of chainResult.violations) {
  fatalErrors.push(`Chuỗi hash reports/prospective-scorecard.jsonl bị vi phạm — ${problem}`);
}

// --- 5. Documented exceptions (never a blanket suppression — exact match only) ---

let exceptions: ProvenanceException[] = [];
const exceptionsResult = await readJsonIfPresent(exceptionsPath);
if (exceptionsResult.present) {
  const parsed = parseProvenanceExceptions(exceptionsResult.value);
  if (parsed === null) {
    fatalErrors.push("reports/provenance-exceptions.json tồn tại nhưng không parse được đúng schema ProvenanceException[].");
  } else {
    exceptions = parsed;
  }
}

if (fatalErrors.length) {
  for (const message of fatalErrors) console.error(`LỖI NGHIÊM TRỌNG: ${message}`);
  process.exit(1);
}

const { unexplained, acknowledged } = triageViolations(violations, exceptions);

// --- Report ------------------------------------------------------------------

if (unexplained.length) {
  console.error(`XÁC MINH PROVENANCE THẤT BẠI: ${unexplained.length} vi phạm chưa được giải thích.\n`);
  for (const violation of unexplained) {
    console.error(`  [${violation.kind}] ${violation.experimentId}: ${violation.detail}`);
  }
  if (acknowledged.length) {
    console.error(`\n  (${acknowledged.length} vi phạm khác đã được xác nhận trong reports/provenance-exceptions.json — xem cảnh báo bên dưới nếu chạy lại sau khi sửa lỗi trên.)`);
  }
  process.exit(1);
}

const distinctHashes = new Set(records.map((record) => record.protocolHash)).size;
console.log("XÁC MINH PROVENANCE THÀNH CÔNG — không còn vi phạm chưa giải thích.\n");
if (acknowledged.length) {
  console.log(`  CẢNH BÁO — ${acknowledged.length} vi phạm lịch sử đã ghi nhận (reports/provenance-exceptions.json), KHÔNG chặn CI:`);
  for (const { violation, exception } of acknowledged) {
    console.log(`    [${violation.kind}] ${violation.experimentId}: ${exception.justification}`);
  }
  console.log("");
}
console.log(`  registry.jsonl:       ${records.length} experiment(s), ${distinctHashes} protocolHash khác nhau, tất cả đều được công nhận`);
console.log(`  protocol-history.json: ${history.length} mục lịch sử${currentLock ? `, current=${currentLock.protocolHash.slice(0, 12)}…` : " (chưa có lock hiện tại)"}`);
console.log(`  artifact files:        ${artifactFiles.length} file, không trùng experimentId, không lệch tên file`);
console.log(
  `  prospective ledger:    ${chainResult.chainedCount} sự kiện đã hash-chain, ${chainResult.legacyCount} sự kiện LEGACY_UNCHAINED (trước khi có chuỗi hash)`,
);
