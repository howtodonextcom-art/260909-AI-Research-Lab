/**
 * Contract test (GAP-01 — Ablation + Portfolio-MC substantive UI exposure):
 * 1. `components/diagnostics-panel.tsx` exists, is imported into
 *    `app/page.tsx`, and is rendered there.
 * 2. It never imports `lib/research/ranking-score` (same ban
 *    `app/ui-ranking-score-ban.contract.test.ts` enforces project-wide).
 * 3. Its source never contains banned overclaim phrases — this panel
 *    surfaces diagnostic/fairness numbers only, never predictive-edge claims.
 *
 * Lightweight source-scan test, matching
 * `app/ui-scientific-verdict-bao18.contract.test.ts`'s and
 * `app/ui-explorer-scorecard.contract.test.ts`'s style — this project has no
 * React testing-library setup, so these check the source text rather than
 * rendering.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const pagePath = path.join(repoRoot, "app", "page.tsx");
const pageSource = readFileSync(pagePath, "utf8");
const diagnosticsPanelPath = path.join(repoRoot, "components", "diagnostics-panel.tsx");

const RANKING_SCORE_IMPORT =
  /(?:from\s+|require\(\s*|import\(\s*)["'][^"']*lib\/research\/ranking-score(?:\.tsx?)?["']/;

const BANNED_OVERCLAIM_PHRASES = /chắc thắng|đánh bại xác suất|dự đoán chính xác|đảm bảo thắng|chắc chắn trúng/i;

test("components/diagnostics-panel.tsx tồn tại", () => {
  assert.ok(existsSync(diagnosticsPanelPath));
});

test("DiagnosticsPanel được import và dùng trong app/page.tsx", () => {
  assert.match(pageSource, /import\s+\{\s*DiagnosticsPanel\s*\}\s+from\s+["']@\/components\/diagnostics-panel["']/);
  assert.match(pageSource, /<DiagnosticsPanel\b/);
});

test("DiagnosticsPanel không import lib/research/ranking-score", () => {
  const source = readFileSync(diagnosticsPanelPath, "utf8");
  assert.doesNotMatch(source, RANKING_SCORE_IMPORT);
});

test("DiagnosticsPanel không chứa cụm từ khẳng định lợi thế dự đoán (overclaim)", () => {
  const source = readFileSync(diagnosticsPanelPath, "utf8");
  assert.doesNotMatch(source, BANNED_OVERCLAIM_PHRASES);
});

test("self-check: regex overclaim bắt được các cụm bị cấm nếu ai đó thêm vào", () => {
  assert.match("Chiến lược này chắc thắng!", BANNED_OVERCLAIM_PHRASES);
  assert.match("Bộ số này đánh bại xác suất ngẫu nhiên.", BANNED_OVERCLAIM_PHRASES);
  assert.doesNotMatch("Đây là chẩn đoán, không phải chỉ báo dự đoán.", BANNED_OVERCLAIM_PHRASES);
});

test("DiagnosticsPanel diễn đạt rõ đây là chẩn đoán, không phải lợi thế dự đoán (honesty framing hiện diện trong nguồn)", () => {
  const source = readFileSync(diagnosticsPanelPath, "utf8");
  assert.match(source, /predictive edge/i);
});
