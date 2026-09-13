/**
 * Contract test (Round 3, G1/G2/closeout §0b regression guard):
 * 1. `app/page.tsx`'s `Tabs` must default to the research tab — this is a
 *    pinned regression check for "Research default tab" (closeout §0b),
 *    not just something eyeballed once in the browser.
 * 2. `components/data-explorer.tsx` (G1) exists and is imported into
 *    `app/page.tsx`.
 * 3. `components/experiment-scorecard.tsx` (G2) exists and is imported into
 *    `app/page.tsx`.
 *
 * Lightweight source-scan tests, matching `ui-ranking-score-ban.contract.test.ts`'s
 * style — this project has no React testing-library setup, so these check the
 * source text rather than rendering.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const pagePath = path.join(repoRoot, "app", "page.tsx");
const pageSource = readFileSync(pagePath, "utf8");

const DEFAULT_TAB_PATTERN = /<Tabs\s+defaultValue="research"/;

test("app/page.tsx tồn tại và đọc được (test không bị vô hiệu do đường dẫn sai)", () => {
  assert.ok(pageSource.length > 500, `expected substantial source, found ${pageSource.length} chars`);
});

test("Tabs mặc định là tab Nghiên cứu (regression guard — không chỉ tin vào lần render trước)", () => {
  assert.match(
    pageSource,
    DEFAULT_TAB_PATTERN,
    "app/page.tsx phải có <Tabs defaultValue=\"research\"> — nếu ai đó đổi default sang tab khác, test này phải fail",
  );
});

test("regex bắt được thay đổi defaultValue nếu ai đó đổi sang tab khác (self-check)", () => {
  const changed = '<Tabs defaultValue="portfolio">';
  assert.doesNotMatch(changed, DEFAULT_TAB_PATTERN);
  const unchanged = '<Tabs defaultValue="research">';
  assert.match(unchanged, DEFAULT_TAB_PATTERN);
});

test("components/data-explorer.tsx (G1 Data Explorer) tồn tại", () => {
  assert.ok(existsSync(path.join(repoRoot, "components", "data-explorer.tsx")));
});

test("DataExplorer được import và dùng trong app/page.tsx", () => {
  assert.match(pageSource, /import\s+\{\s*DataExplorer\s*\}\s+from\s+["']@\/components\/data-explorer["']/);
  assert.match(pageSource, /<DataExplorer\b/);
});

test("components/experiment-scorecard.tsx (G2 Experiment/scorecard panel) tồn tại", () => {
  assert.ok(existsSync(path.join(repoRoot, "components", "experiment-scorecard.tsx")));
});

test("ExperimentScorecard được import và dùng trong app/page.tsx", () => {
  assert.match(pageSource, /import\s+\{\s*ExperimentScorecard\s*\}\s+from\s+["']@\/components\/experiment-scorecard["']/);
  assert.match(pageSource, /<ExperimentScorecard\b/);
});

test("ExperimentScorecard là read-only: không import bất kỳ hàm freeze/append nào từ lib/research/prospective", () => {
  const source = readFileSync(path.join(repoRoot, "components", "experiment-scorecard.tsx"), "utf8");
  assert.doesNotMatch(source, /freezeProspectivePrediction|appendProspectiveResult/);
});
