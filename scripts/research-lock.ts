/**
 * `npm run research:lock` — persist the retrospective/prospective boundary.
 *
 * The lock records the current protocol hash and the latest draw already in
 * the canonical dataset. Only draw ids from `prospectiveStartDrawId` onward
 * can later be treated as genuinely prospective evidence.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSnapshot, resolvePaths } from "../lib/data/persistence";
import {
  appendProtocolHistoryEntry,
  buildProtocolLock,
  CURRENT_PROTOCOL,
  computeProtocolHash,
  parseProtocolHistory,
  parseProtocolLock,
  seedProtocolHistoryFromExistingLock,
  type ProtocolHistoryEntry,
  type ProtocolLock,
} from "../lib/research/protocol";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const paths = resolvePaths(projectRoot);
const lockPath = path.join(projectRoot, "reports", "protocol-lock.json");
const historyPath = path.join(projectRoot, "reports", "protocol-history.json");
const force = process.argv.includes("--force");

async function exists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

async function readExistingLock(): Promise<ProtocolLock | null> {
  try {
    return parseProtocolLock(JSON.parse(await readFile(lockPath, "utf8")));
  } catch {
    return null;
  }
}

/**
 * §Provenance audit (Round 4): `reports/protocol-lock.json` is only a
 * "current pointer" — re-locking (with `--force`) is allowed to replace it
 * outright. Without this, replacing it would erase the only record that the
 * previous hash was ever the locked protocol, making it impossible to later
 * tell "this registry entry predates a legitimate, documented protocol
 * change" apart from "this registry entry was never actually locked". This
 * reads (or migrates, or starts) `reports/protocol-history.json` and
 * returns it with the about-to-become-current hash appended — idempotently,
 * so re-locking with an unchanged hash never duplicates an entry.
 */
async function loadAndUpdateHistory(existingLock: ProtocolLock | null, newLock: ProtocolLock): Promise<ProtocolHistoryEntry[]> {
  let history: ProtocolHistoryEntry[];
  try {
    const raw = JSON.parse(await readFile(historyPath, "utf8"));
    const parsed = parseProtocolHistory(raw);
    if (!parsed) {
      throw new Error(
        "reports/protocol-history.json tồn tại nhưng không đúng schema ProtocolHistoryEntry[] — từ chối ghi đè để tránh mất lịch sử đã có.",
      );
    }
    history = parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    // File doesn't exist yet. If a lock already existed before this run, its
    // identity becomes history entry 1 — it must not be silently forgotten
    // the moment history-tracking starts existing.
    history = existingLock ? seedProtocolHistoryFromExistingLock(existingLock) : [];
  }

  return appendProtocolHistoryEntry(history, {
    protocolHash: newLock.protocolHash,
    protocolVersion: newLock.protocolVersion,
    recordedAt: newLock.protocolLockedAt,
    source: "lock",
  });
}

if (!force && await exists(lockPath)) {
  console.error("Protocol lock đã tồn tại. Dùng `npm run research:lock -- --force` nếu muốn ghi đè có chủ đích.");
  process.exit(1);
}

const snapshot = await loadSnapshot(paths);
if (!snapshot.records.length || !snapshot.manifest) {
  console.error("Không có dữ liệu hoặc manifest — chạy npm run data:sync trước.");
  process.exit(1);
}

const existingLock = await readExistingLock();
const protocolHash = await computeProtocolHash(CURRENT_PROTOCOL);
const lockedAt = new Date().toISOString();
const lock = buildProtocolLock({
  protocolHash,
  lockedAt,
  datasetHash: snapshot.manifest.datasetSha256,
  latestDrawId: snapshot.manifest.latestDrawId ?? snapshot.records.at(-1)?.id ?? null,
});

const history = await loadAndUpdateHistory(existingLock, lock);
await mkdir(path.dirname(historyPath), { recursive: true });
await writeFile(historyPath, `${JSON.stringify(history, null, 2)}\n`, "utf8");

await mkdir(path.dirname(lockPath), { recursive: true });
const payload = `${JSON.stringify(lock, null, 2)}\n`;
await writeFile(lockPath, payload, "utf8");
const publicLockPath = path.join(projectRoot, "public", "data", "protocol-lock.json");
await mkdir(path.dirname(publicLockPath), { recursive: true });
await writeFile(publicLockPath, payload, "utf8");

console.log("ĐÃ KHÓA PROTOCOL");
console.log(`  protocolVersion:        ${lock.protocolVersion}`);
console.log(`  protocolHash:           ${lock.protocolHash}`);
console.log(`  protocolDatasetHash:    ${lock.protocolDatasetHash}`);
console.log(`  prospectiveStartDrawId: ${lock.prospectiveStartDrawId ?? "null"}`);
console.log(`  lockFile:               ${path.relative(projectRoot, lockPath)}`);
console.log(`  publicLockFile:         ${path.relative(projectRoot, publicLockPath)}`);
console.log(`  historyFile:            ${path.relative(projectRoot, historyPath)} (${history.length} mục)`);
