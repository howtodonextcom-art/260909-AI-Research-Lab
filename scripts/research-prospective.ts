/**
 * `npm run research:prospective-freeze` / `npm run research:prospective-append`
 * — the prospective scorecard CLI (§27's anti-peeking guarantee against real
 * data). Writes/reads `reports/prospective-scorecard.jsonl`.
 *
 * Subcommands:
 *   freeze [drawId|next]   Freeze one prediction per protocol strategy for a
 *                          draw id. Refuses (no file write) unless the id is
 *                          genuinely PROSPECTIVE per the current protocol
 *                          lock AND the dataset does not already contain a
 *                          real result for that id (defense in depth against
 *                          peeking even if the lock is stale). "next" (the
 *                          default) resolves to the next-undetermined draw
 *                          id after the latest draw actually in the dataset
 *                          — it does not fabricate a date or a result, only
 *                          a *pending* prediction for whichever id comes
 *                          next. As of this writing that id is "01562",
 *                          which has not occurred yet, so `freeze` produces
 *                          a real pending entry; it will keep doing so for
 *                          each new "next" id until that draw actually lands
 *                          in the dataset, at which point `append-result`
 *                          scores it and a fresh `freeze next` moves on.
 *   append-result          For every still-unscored frozen entry whose draw
 *                          id now exists in the dataset, append the real
 *                          result/matches/tier. A no-op (exit 0) when there
 *                          is nothing due yet — that is the normal state
 *                          today, not an error.
 */
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStrategyPick } from "../lib/analytics";
import { loadSnapshot, resolvePaths } from "../lib/data/persistence";
import { formatBall } from "../lib/mega645";
import {
  appendProspectiveResult,
  freezeProspectivePrediction,
  hasFrozenEntry,
  parseProspectiveScorecard,
  type ProspectiveEntry,
} from "../lib/research/prospective";
import { CURRENT_PROTOCOL, computeProtocolHash, nextDrawId, parseProtocolLock } from "../lib/research/protocol";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const paths = resolvePaths(projectRoot);
const lockPath = path.join(projectRoot, "reports", "protocol-lock.json");
const scorecardPath = path.join(projectRoot, "reports", "prospective-scorecard.jsonl");

async function readTextIfPresent(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

async function loadScorecard(): Promise<ProspectiveEntry[]> {
  const text = await readTextIfPresent(scorecardPath);
  const { entries, issues } = parseProspectiveScorecard(text);
  if (issues.length) {
    console.error(`Scorecard hỏng: ${issues.length} dòng lỗi. Ví dụ (dòng ${issues[0].line}): ${issues[0].reason}`);
    process.exit(1);
  }
  return entries;
}

async function writeScorecard(entries: ProspectiveEntry[]): Promise<void> {
  await mkdir(path.dirname(scorecardPath), { recursive: true });
  const body = entries.map((entry) => JSON.stringify(entry)).join("\n");
  await writeFile(scorecardPath, body.length ? `${body}\n` : "", "utf8");
}

async function cmdFreeze(requestedDrawId: string): Promise<void> {
  const snapshot = await loadSnapshot(paths);
  if (!snapshot.records.length || !snapshot.manifest) {
    console.error("Không có dữ liệu hoặc manifest — chạy npm run data:sync trước.");
    process.exit(1);
  }

  let lock = null;
  try {
    lock = parseProtocolLock(JSON.parse(await readFile(lockPath, "utf8")));
  } catch {
    lock = null;
  }
  if (!lock) {
    console.error("Chưa có protocol lock hợp lệ — chạy npm run research:lock trước.");
    process.exit(1);
  }

  const latestDrawId = snapshot.manifest.latestDrawId ?? snapshot.records.at(-1)?.id ?? null;
  const drawId = requestedDrawId === "next" ? nextDrawId(latestDrawId) : requestedDrawId;
  if (!drawId) {
    console.error("Không xác định được kỳ tiếp theo (thiếu latestDrawId trong manifest).");
    process.exit(1);
  }

  // Defense in depth: even a genuinely PROSPECTIVE id (per a stale lock)
  // must not already have a real result sitting in the dataset — freezing a
  // "prediction" for a draw whose outcome we can already read would defeat
  // the entire point of this scorecard.
  if (snapshot.records.some((record) => record.id === drawId)) {
    console.error(`Từ chối: kỳ #${drawId} đã có kết quả thật trong dataset — không thể "dự đoán" kỳ đã biết.`);
    process.exit(1);
  }

  const existing = await loadScorecard();
  const protocolHash = await computeProtocolHash(CURRENT_PROTOCOL);
  const datasetHashAtFreeze = snapshot.manifest.datasetSha256;
  const window = snapshot.records.slice(-CURRENT_PROTOCOL.lookback);

  const frozen: ProspectiveEntry[] = [];
  for (const strategyId of CURRENT_PROTOCOL.strategies as Array<ProspectiveEntry["strategyId"]>) {
    if (hasFrozenEntry(existing, drawId, strategyId)) {
      console.log(`  Bỏ qua ${drawId}/${strategyId} (đã đóng băng trước đó)`);
      continue;
    }
    const prediction = createStrategyPick(window, strategyId, 645);
    const result = freezeProspectivePrediction({
      drawId,
      strategyId,
      prediction,
      protocolHash,
      datasetHashAtFreeze,
      lock,
    });
    if (!result.ok) {
      console.error(`Từ chối đóng băng ${drawId}/${strategyId}: ${result.reason}`);
      process.exit(1);
    }
    frozen.push(result.entry);
  }

  if (!frozen.length) {
    console.log(`\nKhông có gì để đóng băng cho kỳ #${drawId} (mọi chiến lược đã có sẵn).`);
    return;
  }

  await mkdir(path.dirname(scorecardPath), { recursive: true });
  const lines = `${frozen.map((entry) => JSON.stringify(entry)).join("\n")}\n`;
  await appendFile(scorecardPath, lines, "utf8");

  console.log(`\nĐÃ ĐÓNG BĂNG ${frozen.length} DỰ ĐOÁN CHO KỲ #${drawId} (PROSPECTIVE)`);
  console.log(`  protocolHash: ${protocolHash}`);
  console.log(`  datasetHash:  ${datasetHashAtFreeze}`);
  for (const entry of frozen) {
    console.log(`  ${entry.strategyId.padEnd(10)} ${entry.prediction.map(formatBall).join(" ")}`);
  }
  console.log(`\n  Scorecard: ${path.relative(projectRoot, scorecardPath)}`);
}

async function cmdAppendResult(): Promise<void> {
  const snapshot = await loadSnapshot(paths);
  const existing = await loadScorecard();
  if (!existing.length) {
    console.log("Scorecard rỗng — chưa có dự đoán nào được đóng băng. Không có gì để làm.");
    return;
  }

  const dueDrawIds = new Set(
    existing.filter((entry) => entry.result === null).map((entry) => entry.drawId),
  );
  const resultsByDrawId = new Map(snapshot.records.filter((r) => dueDrawIds.has(r.id)).map((r) => [r.id, r.result]));

  if (!resultsByDrawId.size) {
    console.log("Không có kỳ nào đến hạn (chưa có kết quả thật cho các kỳ đang chờ). Không có gì để làm.");
    return;
  }

  let updated = existing;
  for (const [drawId, result] of resultsByDrawId) {
    updated = appendProspectiveResult(updated, { drawId, result });
  }

  await writeScorecard(updated);

  const scoredNow = updated.filter(
    (entry, index) => entry.result !== null && existing[index]?.result === null,
  );
  console.log(`\nĐÃ GHI KẾT QUẢ CHO ${resultsByDrawId.size} KỲ (${scoredNow.length} bản ghi cập nhật)`);
  for (const [drawId] of resultsByDrawId) {
    for (const entry of updated.filter((e) => e.drawId === drawId)) {
      console.log(`  #${drawId} ${entry.strategyId.padEnd(10)} matches=${entry.matches} tier=${entry.tier}`);
    }
  }
  console.log(`\n  Scorecard: ${path.relative(projectRoot, scorecardPath)}`);
}

const [, , command, arg] = process.argv;

if (command === "freeze") {
  await cmdFreeze(arg ?? "next");
} else if (command === "append-result") {
  await cmdAppendResult();
} else {
  console.error("Dùng: research-prospective.ts freeze [drawId|next] | append-result");
  process.exit(1);
}
