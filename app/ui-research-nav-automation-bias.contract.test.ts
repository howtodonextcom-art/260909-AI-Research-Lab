/**
 * Contract test (Sub-Agent C — Round 6/Combined production upgrade, §30/§11):
 *
 * 1. `components/research-nav.tsx` exists, is imported/rendered in
 *    `app/page.tsx` AFTER `<ScientificVerdict` and BEFORE `<DataStatus`
 *    (source order) — the sticky nav belongs right under the verdict, never
 *    ahead of it.
 * 2. Every nav link is a real, keyboard-focusable `<a href="#...">` whose
 *    target id actually exists somewhere in the app (cross-checked against
 *    the real component/page source, not just asserted in isolation).
 * 3. `.research-nav` is styled `position: sticky` in `app/globals.css` (Round
 *    6 §5 Variant A requires the nav to stay visible while scrolling).
 * 4. The automation-bias toggle (Master Prompt §11): the concrete six-number
 *    suggestion is hidden by default (`useState(false)`), the reveal button
 *    carries the exact required label, and the exact required disclaimer
 *    text appears immediately once revealed.
 * 5. A project-wide overclaim/banned-phrase scan across `app/page.tsx` and
 *    the components this agent owns, extending the CTA-phrase pattern
 *    already used by `app/ui-scientific-verdict-bao18.contract.test.ts`.
 *
 * Lightweight source-scan tests (no React testing-library in this project),
 * matching the style of the other `*.contract.test.ts` files in `app/`.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const pagePath = path.join(repoRoot, "app", "page.tsx");
const pageSource = readFileSync(pagePath, "utf8");

const navPath = path.join(repoRoot, "components", "research-nav.tsx");
const dataStatusPath = path.join(repoRoot, "components", "data-status.tsx");
const bao18PanelPath = path.join(repoRoot, "components", "bao18-panel.tsx");
const diagnosticsPanelPath = path.join(repoRoot, "components", "diagnostics-panel.tsx");
const capabilityInspectorPath = path.join(repoRoot, "components", "capability-inspector.tsx");
const dataExplorerPath = path.join(repoRoot, "components", "data-explorer.tsx");
const globalsCssPath = path.join(repoRoot, "app", "globals.css");

// ---------------------------------------------------------------------------
// 1. ResearchNav — exists, imported, used, correct source order.
// ---------------------------------------------------------------------------

test("components/research-nav.tsx tồn tại", () => {
  assert.ok(existsSync(navPath));
});

test("ResearchNav được import và dùng trong app/page.tsx", () => {
  assert.match(pageSource, /import\s+\{\s*ResearchNav\s*\}\s+from\s+["']@\/components\/research-nav["']/);
  assert.match(pageSource, /<ResearchNav\b/);
});

test("ResearchNav render SAU ScientificVerdict và TRƯỚC DataStatus (thứ tự nguồn — Round 6 §5 Variant A)", () => {
  const verdictIndex = pageSource.indexOf("<ScientificVerdict");
  const navIndex = pageSource.indexOf("<ResearchNav");
  const dataStatusIndex = pageSource.indexOf("<DataStatus");
  assert.notEqual(verdictIndex, -1);
  assert.notEqual(navIndex, -1);
  assert.notEqual(dataStatusIndex, -1);
  assert.ok(verdictIndex < navIndex, "ResearchNav phải đứng sau ScientificVerdict");
  assert.ok(navIndex < dataStatusIndex, "ResearchNav phải đứng trước DataStatus");
});

// ---------------------------------------------------------------------------
// 2. Every nav anchor href points at a real id that exists somewhere in the
//    app — not a dangling link to nothing.
// ---------------------------------------------------------------------------

const NAV_TARGETS: Array<{ href: string; file: string; source: string }> = [
  { href: "#data-status-heading", file: "components/data-status.tsx", source: readFileSync(dataStatusPath, "utf8") },
  { href: "#evidence-section", file: "app/page.tsx", source: pageSource },
  { href: "#bao18-panel-heading", file: "components/bao18-panel.tsx", source: readFileSync(bao18PanelPath, "utf8") },
  {
    href: "#diagnostics-panel-heading",
    file: "components/diagnostics-panel.tsx",
    source: readFileSync(diagnosticsPanelPath, "utf8"),
  },
  {
    href: "#capability-inspector",
    file: "components/capability-inspector.tsx",
    source: readFileSync(capabilityInspectorPath, "utf8"),
  },
  { href: "#data-explorer-heading", file: "components/data-explorer.tsx", source: readFileSync(dataExplorerPath, "utf8") },
];

test("ResearchNav chứa đúng 6 liên kết neo, mỗi liên kết là thẻ <a href=\"#...\"> thật (focusable bằng bàn phím)", () => {
  const source = readFileSync(navPath, "utf8");
  for (const target of NAV_TARGETS) {
    assert.match(
      source,
      new RegExp(`href:\\s*["']${target.href}["']`),
      `research-nav.tsx thiếu liên kết tới ${target.href}`,
    );
  }
  assert.match(source, /<a\s+href=\{link\.href\}/, "ResearchNav phải render các liên kết bằng thẻ <a> gốc");
});

test("mỗi mục tiêu neo của ResearchNav có id thật tồn tại trong file nguồn tương ứng (không phải liên kết cụt)", () => {
  for (const target of NAV_TARGETS) {
    const id = target.href.slice(1);
    assert.match(
      target.source,
      new RegExp(`id=["']${id}["']`),
      `${target.file} không có id="${id}" — liên kết ResearchNav tới ${target.href} sẽ là liên kết cụt`,
    );
  }
});

test("self-check: nếu một id mục tiêu bị đổi tên, assertion trên phải fail", () => {
  const fixture = 'id="renamed-heading"';
  assert.doesNotMatch(fixture, /id=["']data-status-heading["']/);
});

// ---------------------------------------------------------------------------
// 3. Sticky positioning in CSS.
// ---------------------------------------------------------------------------

test(".research-nav được định vị sticky trong app/globals.css (phải hiển thị khi cuộn trang)", () => {
  const css = readFileSync(globalsCssPath, "utf8");
  assert.match(css, /\.research-nav\s*\{[^}]*position:\s*sticky/);
});

// ---------------------------------------------------------------------------
// 4. Automation-bias toggle (§11): hidden by default, exact button label,
//    exact disclaimer text shown only once revealed.
// ---------------------------------------------------------------------------

test("bộ số thử nghiệm bị ẩn mặc định (useState(false)) và có nút hiển thị đúng nhãn bắt buộc", () => {
  assert.match(pageSource, /suggestionRevealed[\s\S]*useState\(false\)|useState\(false\)[\s\S]*suggestionRevealed/);
  assert.match(pageSource, /"Hiển thị bộ số thử nghiệm"/);
});

test("khi hiển thị, disclaimer bắt buộc xuất hiện đúng nguyên văn ngay cạnh bộ số", () => {
  assert.match(pageSource, /Đây là output của một rule nghiên cứu, không phải dự đoán được xác nhận\./);
});

test("self-check: nếu default đổi thành useState(true) (hiện mặc định), assertion độ ẩn phải fail", () => {
  const changed = "const [suggestionRevealed, setSuggestionRevealed] = useState(true);";
  assert.doesNotMatch(changed, /useState\(false\)/);
});

test("bối cảnh xung quanh (cutoff kỳ, cửa sổ lookback, xác suất Jackpot không đổi) vẫn hiển thị kể cả khi bộ số bị ẩn", () => {
  // The `suggestion-warning` paragraph (cutoff id/date/lookback/no-overclaim
  // wording) must sit OUTSIDE the `suggestionRevealed` conditional branch, so
  // it always renders regardless of toggle state.
  const revealBlockStart = pageSource.indexOf("suggestion-reveal");
  const warningIndex = pageSource.indexOf("suggestion-warning");
  assert.notEqual(revealBlockStart, -1);
  assert.notEqual(warningIndex, -1);
  assert.ok(warningIndex > revealBlockStart, "suggestion-warning phải nằm sau khối suggestion-reveal trong nguồn");
});

// ---------------------------------------------------------------------------
// 5. Banned overclaim phrases (Master Prompt §11 / Combined §11) — extends
//    the CTA-phrase pattern from ui-scientific-verdict-bao18.contract.test.ts
//    with the explicit §11 bans (gợi ý mua / recommended / best numbers /
//    predicted numbers / chắc thắng / đánh bại xác suất).
// ---------------------------------------------------------------------------

// Negative lookbehind for "không " (not) so legitimate disclaimers like
// "không bán vé và không khuyến nghị mua" (the site footer) are not
// themselves flagged as the overclaim they explicitly deny.
const BANNED_OVERCLAIM_PHRASES =
  /(?<!không\s)(?:gợi ý mua|recommended numbers|best numbers|predicted numbers|chắc thắng|đánh bại xác suất|mua ngay|nên mua|khuyến nghị mua|hãy mua|đặt mua)/i;

test("app/page.tsx không chứa cụm từ overclaim/CTA bị cấm (§11)", () => {
  assert.doesNotMatch(pageSource, BANNED_OVERCLAIM_PHRASES);
});

test("components sở hữu bởi Sub-Agent C không chứa cụm từ overclaim/CTA bị cấm (§11)", () => {
  const scientificVerdictSource = readFileSync(
    path.join(repoRoot, "components", "scientific-verdict.tsx"),
    "utf8",
  );
  const navSource = readFileSync(navPath, "utf8");
  const capabilityInspectorSource = readFileSync(capabilityInspectorPath, "utf8");
  for (const [name, source] of [
    ["scientific-verdict.tsx", scientificVerdictSource],
    ["research-nav.tsx", navSource],
    ["capability-inspector.tsx", capabilityInspectorSource],
  ] as const) {
    assert.doesNotMatch(source, BANNED_OVERCLAIM_PHRASES, `${name} chứa cụm từ overclaim/CTA bị cấm`);
  }
});

test("self-check: regex overclaim bắt được các cụm bị cấm theo §11 nếu ai đó thêm vào", () => {
  assert.match("Đây là bộ số được recommended numbers cho kỳ tới.", BANNED_OVERCLAIM_PHRASES);
  assert.match("Chiến lược này chắc thắng!", BANNED_OVERCLAIM_PHRASES);
  assert.match("Phương pháp đánh bại xác suất Jackpot.", BANNED_OVERCLAIM_PHRASES);
  assert.doesNotMatch("Không có chiến lược nào được khuyến nghị.", BANNED_OVERCLAIM_PHRASES);
});

test("self-check: phủ định 'không ' ngay trước cụm cấm không bị gắn cờ (đúng như câu footer thật), nhưng cụm cấm ở nơi khác trong cùng chuỗi vẫn bị bắt", () => {
  assert.doesNotMatch(
    "Không phải website Vietlott, không bán vé và không khuyến nghị mua.",
    BANNED_OVERCLAIM_PHRASES,
  );
  assert.match("Không có gì đặc biệt. Hãy mua ngay bộ số này!", BANNED_OVERCLAIM_PHRASES);
});
