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
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStrategyPick } from "../lib/analytics";
import { loadSnapshot, resolvePaths } from "../lib/data/persistence";
import { formatBall } from "../lib/mega645";
import {
  buildFrozenEvent,
  buildScoredEvent,
  deriveProspectiveStatus,
  foldProspectiveLedger,
  freezeProspectivePrediction,
  hasFrozenEntry,
  lastChainHash,
  parseProspectiveLedger,
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

/**
 * Reads and parses the ledger (legacy full-entry lines plus, from this
 * feature onward, chained FROZEN/SCORED event lines — see
 * `lib/research/prospective.ts`'s header comment on the hash chain). Exits
 * fail-closed on any malformed line, exactly like the old whole-array
 * loader this replaces.
 */
async function loadLedger() {
  const text = await readTextIfPresent(scorecardPath);
  const { lines, issues } = parseProspectiveLedger(text);
  if (issues.length) {
    console.error(`Scorecard hỏng: ${issues.length} dòng lỗi. Ví dụ (dòng ${issues[0].line}): ${issues[0].reason}`);
    process.exit(1);
  }
  return lines;
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

  const ledgerLines = await loadLedger();
  const existing = deriveProspectiveStatus(ledgerLines);
  const protocolHash = await computeProtocolHash(CURRENT_PROTOCOL);
  const datasetHashAtFreeze = snapshot.manifest.datasetSha256;
  const window = snapshot.records.slice(-CURRENT_PROTOCOL.lookback);

  // The whole file's hash chain is one sequence across FROZEN and SCORED
  // events alike (append order), so each new FrozenEvent must link off the
  // last chained line currently on disk — and, within this one run, off the
  // FrozenEvent just built for the previous strategy in the loop below.
  let previousEntryHash = lastChainHash(ledgerLines);
  const frozen: ProspectiveEntry[] = [];
  const frozenLines: string[] = [];
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
      knownDrawIds: snapshot.records.map((record) => record.id),
    });
    if (!result.ok) {
      console.error(`Từ chối đóng băng ${drawId}/${strategyId}: ${result.reason}`);
      process.exit(1);
    }
    const event = buildFrozenEvent(result.entry, previousEntryHash);
    previousEntryHash = event.entryHash;
    frozen.push(result.entry);
    frozenLines.push(JSON.stringify(event));
  }

  if (!frozen.length) {
    console.log(`\nKhông có gì để đóng băng cho kỳ #${drawId} (mọi chiến lược đã có sẵn).`);
    return;
  }

  // Append-only: new chained FrozenEvent lines added to the end of the
  // file. Existing lines (legacy or chained) are never touched.
  await mkdir(path.dirname(scorecardPath), { recursive: true });
  await appendFile(scorecardPath, `${frozenLines.join("\n")}\n`, "utf8");

  console.log(`\nĐÃ ĐÓNG BĂNG ${frozen.length} DỰ ĐOÁN CHO KỲ #${drawId} (PROSPECTIVE)`);
  console.log(`  protocolHash: ${protocolHash}`);
  console.log(`  datasetHash:  ${datasetHashAtFreeze}`);
  for (const entry of frozen) {
    console.log(`  ${entry.strategyId.padEnd(10)} ${entry.prediction.map(formatBall).join(" ")}`);
  }
  console.log(`\n  Scorecard: ${path.relative(projectRoot, scorecardPath)}`);
}

/**
 * Scores every still-PENDING entry whose draw now has a real result, by
 * APPENDING one ScoredEvent per entry — never by rewriting the file to
 * mutate the FrozenEvent/legacy line in place. That rewrite (`writeFile`
 * over the whole array) was the concrete tamper-evidence gap this feature
 * closes: a mutated line and a legitimately-scored line used to be
 * byte-indistinguishable after the fact. Now the FrozenEvent's bytes are
 * never touched again; "SCORED" is a fact derived by folding a later,
 * separately-hash-chained ScoredEvent on top of it.
 */
async function cmdAppendResult(): Promise<void> {
  const snapshot = await loadSnapshot(paths);
  const ledgerLines = await loadLedger();
  if (!ledgerLines.length) {
    console.log("Scorecard rỗng — chưa có dự đoán nào được đóng băng. Không có gì để làm.");
    return;
  }

  const folded = foldProspectiveLedger(ledgerLines);
  const pending = folded.filter((entry) => entry.result === null);
  if (!pending.length) {
    console.log("Không có entry nào đang PENDING (mọi entry đã được chấm điểm). Không có gì để làm.");
    return;
  }

  const dueDrawIds = new Set(pending.map((entry) => entry.drawId));
  const resultsByDrawId = new Map(snapshot.records.filter((r) => dueDrawIds.has(r.id)).map((r) => [r.id, r.result]));

  if (!resultsByDrawId.size) {
    console.log("Không có kỳ nào đến hạn (chưa có kết quả thật cho các kỳ đang chờ). Không có gì để làm.");
    return;
  }

  let previousEntryHash = lastChainHash(ledgerLines);
  const scoredLines: string[] = [];
  const scoredNow: Array<{ drawId: string; strategyId: ProspectiveEntry["strategyId"]; matches: number; tier: string }> = [];

  for (const entry of pending) {
    const result = resultsByDrawId.get(entry.drawId);
    if (!result) continue;
    const event = buildScoredEvent(
      {
        entryId: entry.entryId,
        drawId: entry.drawId,
        strategyId: entry.strategyId,
        prediction: entry.prediction,
        result,
        scoredAt: new Date().toISOString(),
      },
      previousEntryHash,
    );
    previousEntryHash = event.entryHash;
    scoredLines.push(JSON.stringify(event));
    scoredNow.push({ drawId: entry.drawId, strategyId: entry.strategyId, matches: event.matches, tier: event.tier });
  }

  if (!scoredLines.length) {
    console.log("Không có entry PENDING nào khớp kỳ đến hạn. Không có gì để làm.");
    return;
  }

  // Append-only: new chained ScoredEvent lines added to the end of the
  // file. Every existing line — legacy or chained, frozen or already
  // scored — is byte-for-byte untouched.
  await mkdir(path.dirname(scorecardPath), { recursive: true });
  await appendFile(scorecardPath, `${scoredLines.join("\n")}\n`, "utf8");

  console.log(`\nĐÃ GHI KẾT QUẢ CHO ${scoredNow.length} BẢN GHI (append-only — không sửa dòng cũ)`);
  for (const entry of scoredNow) {
    console.log(`  #${entry.drawId} ${entry.strategyId.padEnd(10)} matches=${entry.matches} tier=${entry.tier}`);
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
