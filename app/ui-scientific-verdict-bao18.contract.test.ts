/**
 * Contract test (Sub-Agent C mission — UI/Product integration):
 * 1. `components/scientific-verdict.tsx` exists, is imported into
 *    `app/page.tsx`, is rendered there, and is rendered BEFORE `<DataStatus`
 *    in source order — it must be the first substantive scientific content
 *    a visitor sees, ahead of the HAC/Holm/protocol-hash jargon inside
 *    `DataStatus`. It must also never claim a predictive edge exists.
 * 2. `components/bao18-panel.tsx` exists, is imported/used, always shows the
 *    mandatory "reverse-peek leaks the answer" takeaway sentence and the
 *    INVALID_AS_EVIDENCE_OF_EDGE label, and never renders any
 *    purchase/call-to-action wording.
 * 3. `components/capability-inspector.tsx` exists, is imported/used, and
 *    never imports `lib/research/ranking-score` (same ban
 *    `app/ui-ranking-score-ban.contract.test.ts` already enforces
 *    project-wide — re-checked here specifically for this file).
 *
 * Lightweight source-scan tests, matching `ui-explorer-scorecard.contract.test.ts`'s
 * and `ui-ranking-score-ban.contract.test.ts`'s style — this project has no
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

const scientificVerdictPath = path.join(repoRoot, "components", "scientific-verdict.tsx");
const bao18PanelPath = path.join(repoRoot, "components", "bao18-panel.tsx");
const capabilityInspectorPath = path.join(repoRoot, "components", "capability-inspector.tsx");

// ---------------------------------------------------------------------------
// 1. Scientific Verdict — exists, imported, used, rendered first, honest.
// ---------------------------------------------------------------------------

test("components/scientific-verdict.tsx tồn tại", () => {
  assert.ok(existsSync(scientificVerdictPath));
});

test("ScientificVerdict được import và dùng trong app/page.tsx", () => {
  assert.match(pageSource, /import\s+\{\s*ScientificVerdict\s*\}\s+from\s+["']@\/components\/scientific-verdict["']/);
  assert.match(pageSource, /<ScientificVerdict\b/);
});

test("ScientificVerdict được render TRƯỚC DataStatus trong app/page.tsx (thứ tự nguồn — người mới phải thấy kết luận trước biệt ngữ HAC/Holm/protocol-hash)", () => {
  const verdictIndex = pageSource.indexOf("<ScientificVerdict");
  const dataStatusIndex = pageSource.indexOf("<DataStatus");
  assert.notEqual(verdictIndex, -1, "không tìm thấy <ScientificVerdict trong app/page.tsx");
  assert.notEqual(dataStatusIndex, -1, "không tìm thấy <DataStatus trong app/page.tsx");
  assert.ok(
    verdictIndex < dataStatusIndex,
    `<ScientificVerdict phải xuất hiện trước <DataStatus trong nguồn (verdict=${verdictIndex}, dataStatus=${dataStatusIndex})`,
  );
});

test("self-check: nếu ai đó đảo thứ tự (DataStatus trước ScientificVerdict), test trên phải fail", () => {
  const reversed = "<DataStatus /> ... <ScientificVerdict />";
  const vIndex = reversed.indexOf("<ScientificVerdict");
  const dIndex = reversed.indexOf("<DataStatus");
  assert.ok(!(vIndex < dIndex), "self-check hỏng: reversed fixture phải cho DataStatus đứng trước");
});

test("ScientificVerdict không bao giờ khẳng định có lợi thế dự đoán (luôn 'CHƯA CHỨNG MINH')", () => {
  const source = readFileSync(scientificVerdictPath, "utf8");
  assert.match(source, /CHƯA CHỨNG MINH/);
  assert.match(source, /Không có chiến lược nào được khuyến nghị/);
});

// ---------------------------------------------------------------------------
// 2. Bao-18 panel — exists, imported, used, honest labeling, no CTA wording.
// ---------------------------------------------------------------------------

const BANNED_CTA_PHRASES = /mua ngay|nên mua|khuyến nghị mua|hãy mua|đặt mua|mua vé này|mua bộ số này/i;

test("components/bao18-panel.tsx tồn tại", () => {
  assert.ok(existsSync(bao18PanelPath));
});

test("Bao18Panel được import và dùng trong app/page.tsx", () => {
  assert.match(pageSource, /import\s+\{\s*Bao18Panel\s*\}\s+from\s+["']@\/components\/bao18-panel["']/);
  assert.match(pageSource, /<Bao18Panel\b/);
});

test("Bao18Panel hiển thị nhãn INVALID_AS_EVIDENCE_OF_EDGE và câu kết luận bắt buộc", () => {
  const source = readFileSync(bao18PanelPath, "utf8");
  assert.match(source, /INVALID_AS_EVIDENCE_OF_EDGE/);
  assert.match(
    source,
    /Reverse-peek có thể trông hoàn hảo vì nó rò rỉ đáp án\. Walk-forward hợp lệ hiện chưa cho thấy edge dự đoán nào được chứng minh\./,
  );
});

test("Bao18Panel không chứa bất kỳ cụm từ kêu gọi mua vé nào (không phải bề mặt khuyến nghị mua)", () => {
  const source = readFileSync(bao18PanelPath, "utf8");
  assert.doesNotMatch(source, BANNED_CTA_PHRASES);
});

test("self-check: regex CTA bắt được các cụm bị cấm nếu ai đó thêm vào", () => {
  assert.match("Bạn nên mua bộ số này ngay hôm nay!", BANNED_CTA_PHRASES);
  assert.match("Khuyến nghị mua 18 số dưới đây.", BANNED_CTA_PHRASES);
  assert.doesNotMatch("Đây chỉ là dữ liệu khảo sát, không phải khuyến nghị.", BANNED_CTA_PHRASES);
});

// ---------------------------------------------------------------------------
// 3. Capability Inspector — exists, imported, used, still respects the
//    ranking-score UI ban.
// ---------------------------------------------------------------------------

const RANKING_SCORE_IMPORT =
  /(?:from\s+|require\(\s*|import\(\s*)["'][^"']*lib\/research\/ranking-score(?:\.tsx?)?["']/;

test("components/capability-inspector.tsx tồn tại", () => {
  assert.ok(existsSync(capabilityInspectorPath));
});

test("CapabilityInspector được import và dùng trong app/page.tsx", () => {
  assert.match(
    pageSource,
    /import\s+\{\s*CapabilityInspector\s*\}\s+from\s+["']@\/components\/capability-inspector["']/,
  );
  assert.match(pageSource, /<CapabilityInspector\b/);
});

test("CapabilityInspector không import lib/research/ranking-score (chỉ mô tả bằng văn bản, không gọi module)", () => {
  const source = readFileSync(capabilityInspectorPath, "utf8");
  assert.doesNotMatch(source, RANKING_SCORE_IMPORT);
});

// ---------------------------------------------------------------------------
// 4. GAP-03 — Bao-18 panel completeness: EARLY/LATE stability,
//    scientificSpecHash, theoretical null clarity, power/low-event warning.
// ---------------------------------------------------------------------------

test("Bao18Panel render bảng ổn định EARLY vs LATE dựa trên dữ liệu thật (row.early / row.late), không phải số bịa", () => {
  const source = readFileSync(bao18PanelPath, "utf8");
  assert.match(source, /row\.early/);
  assert.match(source, /row\.late/);
  assert.match(source, /EARLY.*LATE|EARLY \(nửa đầu\) vs LATE \(nửa sau\)/);
});

test("Bao18Panel render kỳ vọng null lý thuyết một cách rõ ràng (E[K] = 2,4) — không chôn trong caption", () => {
  const source = readFileSync(bao18PanelPath, "utf8");
  assert.match(source, /E\[K\] = 6 × 18 \/ 45 = 2,4/);
  assert.match(source, /Kỳ vọng null lý thuyết/);
});

test("Bao18Panel giữ cảnh báo công suất thống kê (power \\/ low-event)", () => {
  const source = readFileSync(bao18PanelPath, "utf8");
  assert.match(source, /Cảnh báo công suất thống kê/);
  assert.match(source, /NO_EVIDENCE_OF_EDGE/);
});

test("Bao18Panel render scientificSpecHash thật (không phải chuỗi cứng) kèm giải thích tái lập", () => {
  const source = readFileSync(bao18PanelPath, "utf8");
  assert.match(source, /summary\.scientificSpecHash/);
  assert.match(source, /scientificSpecHash/);
  assert.match(source, /tái lập|reproducibility/i);
});

test("Bao18Panel không dùng Protocol A (100% hit) làm bằng chứng edge — vẫn giữ nguyên câu kết luận bắt buộc sau khi mở rộng", () => {
  const source = readFileSync(bao18PanelPath, "utf8");
  assert.match(
    source,
    /Reverse-peek có thể trông hoàn hảo vì nó rò rỉ đáp án\. Walk-forward hợp lệ hiện chưa cho thấy edge dự đoán nào được chứng minh\./,
  );
  assert.doesNotMatch(source, BANNED_CTA_PHRASES);
});

// ---------------------------------------------------------------------------
// 5. GAP-04 — Prospective hash-chain health surfaced in Experiment Scorecard,
//    sourced from the real fetched JSON (chainHealth), never a hardcoded
//    "0 SCORED" magic string standing in for real data.
// ---------------------------------------------------------------------------

const scorecardPath = path.join(repoRoot, "components", "experiment-scorecard.tsx");

test("components/experiment-scorecard.tsx tồn tại", () => {
  assert.ok(existsSync(scorecardPath));
});

test("ExperimentScorecard render chain-health TỪ summary.chainHealth (dữ liệu fetch thật), không phải chuỗi cứng", () => {
  const source = readFileSync(scorecardPath, "utf8");
  assert.match(source, /summary\.chainHealth\.chainedCount/);
  assert.match(source, /summary\.chainHealth\.legacyCount/);
  assert.match(source, /summary\.chainHealth\.verified/);
  assert.match(source, /LEGACY_UNCHAINED/);
});

test("self-check: nếu ai đó thay bằng chuỗi cứng '0 sự kiện đã chain' thay vì đọc summary.chainHealth, test trên phải fail", () => {
  const hardcoded = 'const line = "0 sự kiện đã chain, 4 sự kiện LEGACY";';
  assert.doesNotMatch(hardcoded, /summary\.chainHealth\.chainedCount/);
});

test("ExperimentScorecard không import hàm freeze/append (vẫn read-only sau khi thêm chain-health)", () => {
  const source = readFileSync(scorecardPath, "utf8");
  assert.doesNotMatch(source, /freezeProspectivePrediction|appendProspectiveResult/);
});

// ---------------------------------------------------------------------------
// 6. GAP-05 — Capability Inspector discoverability: stable id + anchor link
//    from Scientific Verdict, reachable by keyboard (native <a href="#...">
//    and <summary> are both natively focusable — no custom tabindex hacks
//    needed, which is exactly why Option A was chosen over a new tab).
// ---------------------------------------------------------------------------

test("CapabilityInspector có id ổn định 'capability-inspector' để làm mục tiêu anchor", () => {
  const source = readFileSync(capabilityInspectorPath, "utf8");
  assert.match(source, /id="capability-inspector"/);
});

test("ScientificVerdict có link neo tới #capability-inspector (một thẻ <a> gốc — luôn focusable bằng bàn phím)", () => {
  const source = readFileSync(scientificVerdictPath, "utf8");
  assert.match(source, /<a\s+className="scientific-verdict-capability-link"\s+href="#capability-inspector">/);
});

test("self-check: nếu link trỏ sai id, test trên phải fail", () => {
  const wrong = '<a className="scientific-verdict-capability-link" href="#something-else">';
  assert.doesNotMatch(wrong, /href="#capability-inspector"/);
});
