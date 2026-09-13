/**
 * `npm run research:prospective-summary` — publishes a read-only, browser-
 * fetchable summary of `reports/prospective-scorecard.jsonl` under
 * `public/data/prospective-summary.json`, the same way `research-lock.ts`
 * already publishes `protocol-lock.json` under `public/data/`.
 *
 * `reports/` is server-only storage — it is not served to the client — so
 * without this export the Experiment/Scorecard panel (G2) would have no way
 * to show real prospective entries. This script only *reads*
 * `prospective-scorecard.jsonl` (via `parseProspectiveScorecard`, owned by
 * `lib/research/prospective.ts`) and *summarizes* it (via
 * `buildProspectiveSummary`, owned by `lib/research/prospective-summary.ts`)
 * — it never writes to the scorecard itself, so it cannot interfere with the
 * freeze/append-result invariants those modules enforce.
 *
 * Safe to run with zero frozen entries (today's normal state before a draw
 * reaches `prospectiveStartDrawId`) or with the file missing entirely — both
 * produce a valid empty summary, not an error.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseProspectiveLedger, deriveProspectiveStatus, verifyProspectiveChain } from "../lib/research/prospective";
import { buildProspectiveSummary, deriveChainHealth } from "../lib/research/prospective-summary";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const scorecardPath = path.join(projectRoot, "reports", "prospective-scorecard.jsonl");
const outPath = path.join(projectRoot, "public", "data", "prospective-summary.json");

async function readTextIfPresent(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

const text = await readTextIfPresent(scorecardPath);
const { lines, issues } = parseProspectiveLedger(text);
if (issues.length) {
  console.error(`Scorecard hỏng: ${issues.length} dòng lỗi. Ví dụ (dòng ${issues[0].line}): ${issues[0].reason}`);
  process.exit(1);
}

// GAP-04: derive real hash-chain health (chained vs LEGACY_UNCHAINED count,
// verification PASS/fail) from the actual ledger via
// `verifyProspectiveChain` — never fabricated or rounded to look more
// "finished". As of this writing the real state is 4 LEGACY_UNCHAINED
// entries (frozen before the hash chain existed) and 0 chained events.
const entries = deriveProspectiveStatus(lines);
const chainResult = verifyProspectiveChain(lines);
const chainHealth = deriveChainHealth(chainResult);
if (!chainHealth.verified) {
  console.error(
    `Chuỗi hash prospective KHÔNG hợp lệ (${chainHealth.violationCount} vi phạm) — từ chối xuất summary (fail-closed). ` +
      "Chạy `npm run research:verify-provenance` để xem chi tiết vi phạm.",
  );
  process.exit(1);
}

const summary = buildProspectiveSummary(entries, chainHealth);

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

console.log("ĐÃ XUẤT PROSPECTIVE SUMMARY");
console.log(`  entries đóng băng: ${summary.totalFrozen} (pending=${summary.pendingCount}, scored=${summary.scoredCount})`);
console.log(
  `  chuỗi hash:        ${chainHealth.chainedCount} đã chain, ${chainHealth.legacyCount} LEGACY_UNCHAINED, xác minh=${chainHealth.verified ? "PASS" : "FAIL"}`,
);
console.log(`  file:              ${path.relative(projectRoot, outPath)}`);
