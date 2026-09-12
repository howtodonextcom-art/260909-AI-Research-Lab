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
import { buildProtocolLock, CURRENT_PROTOCOL, computeProtocolHash } from "../lib/research/protocol";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const paths = resolvePaths(projectRoot);
const lockPath = path.join(projectRoot, "reports", "protocol-lock.json");
const force = process.argv.includes("--force");

async function exists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
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

const protocolHash = await computeProtocolHash(CURRENT_PROTOCOL);
const lockedAt = new Date().toISOString();
const lock = buildProtocolLock({
  protocolHash,
  lockedAt,
  datasetHash: snapshot.manifest.datasetSha256,
  latestDrawId: snapshot.manifest.latestDrawId ?? snapshot.records.at(-1)?.id ?? null,
});

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
