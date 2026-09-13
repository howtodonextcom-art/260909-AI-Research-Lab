/**
 * Read-only, descriptive summary of negative controls A/B/C/E/F for the
 * Research UI (Round 3, G3). This module is a pure repackaging layer: it
 * calls the already-existing, already-tuned-for-speed control functions in
 * `negative-controls.ts` and reduces each result to a compact, UI-ready
 * shape — a short status label and one key number — that a React component
 * can render synchronously in its render body without doing any statistics
 * itself.
 *
 * IMPORTANT — this is descriptive only. Nothing here gates any UI decision,
 * candidate selection, promotion, or the scientific verdict. It exists so a
 * human reading the Research tab can see "the control battery still behaves
 * the way a lab with no demonstrated edge should," not so the app can decide
 * anything automatically. See `lib/research/negative-controls.ts`'s header
 * for why these are coarse sanity checks, not certified power/false-positive
 * measurements.
 *
 * Replication counts intentionally match `scripts/research-controls.ts`'s
 * already-tuned-for-speed defaults (Control A: drawCount=220, lookback=60,
 * replications=15, seed=1) so this stays fast enough to run inside a client
 * component render — do not increase them here without re-checking render
 * cost.
 */
import type { DrawRecord } from "../analytics";
import {
  runFutureLeakageControl,
  runIidSyntheticControl,
  runLabelPermutationControl,
  runRandomBaselineControl,
  runTimeShuffleControl,
} from "./negative-controls";

export type ControlStatus = "PASS" | "ĐÁNG CHÚ Ý" | "KHÔNG ĐỦ DỮ LIỆU";

export type ControlId = "A" | "B" | "C" | "E" | "F";

export type ControlSummaryItem = {
  id: ControlId;
  title: string;
  status: ControlStatus;
  /** One human-readable number for display — not the full verbose CLI output. */
  keyNumberLabel: string;
  keyNumber: number;
  note: string;
};

export type ControlsSummary = {
  items: ControlSummaryItem[];
  /** Number of real draws the B/C/E/F controls actually ran against (0 when insufficient). */
  drawCount: number;
  generatedAt: string;
};

/** Same lookback the rest of the research pipeline (`CURRENT_PROTOCOL.lookback`) uses by convention. */
const LOOKBACK = 90;
const SEED = 645;

function insufficientItem(id: ControlId, title: string): ControlSummaryItem {
  return {
    id,
    title,
    status: "KHÔNG ĐỦ DỮ LIỆU",
    keyNumberLabel: "Số kỳ lịch sử cần thiết",
    keyNumber: LOOKBACK,
    note: `Cần nhiều hơn ${LOOKBACK} kỳ lịch sử thật để chạy control này — dữ liệu hiện có chưa đủ.`,
  };
}

/**
 * Runs controls A/B/C/E/F and returns a compact summary. `draws` should be
 * whatever dataset the caller already has loaded (the real dataset in
 * production; a fixture in tests) — this function never fetches or reads
 * anything itself.
 */
export function runControlsSummary(draws: DrawRecord[], now: () => Date = () => new Date()): ControlsSummary {
  const items: ControlSummaryItem[] = [];

  // Control A is independent of `draws` — it always runs on a synthetic IID dataset.
  const a = runIidSyntheticControl({ drawCount: 220, lookback: 60, replications: 15, seed: 1 });
  const maxPassRateA = Object.values(a.passRateByStrategy).reduce((max, rate) => Math.max(max, rate), 0);
  items.push({
    id: "A",
    title: "A — IID synthetic (dữ liệu công bằng giả lập)",
    status: maxPassRateA < 0.3 ? "PASS" : "ĐÁNG CHÚ Ý",
    keyNumberLabel: "Tỉ lệ vượt cả 3 cổng in-sample (cao nhất)",
    keyNumber: maxPassRateA,
    note: `${a.replications} lần lặp × ${a.drawCount} kỳ giả lập/lần.`,
  });

  if (draws.length <= LOOKBACK) {
    items.push(insufficientItem("B", "B — Xáo trộn thời gian"));
    items.push(insufficientItem("C", "C — RANDOM so với null chính xác"));
    items.push(insufficientItem("E", "E — Hoán vị nhãn"));
    items.push(insufficientItem("F", "F — Rò rỉ tương lai (control ngược)"));
    return { items, drawCount: 0, generatedAt: now().toISOString() };
  }

  const b = runTimeShuffleControl(draws, LOOKBACK, SEED);
  items.push({
    id: "B",
    title: "B — Xáo trộn thời gian",
    status: b.temporalSignalCollapsed ? "PASS" : "ĐÁNG CHÚ Ý",
    keyNumberLabel: "Tín hiệu thời gian sụp đổ sau xáo trộn",
    keyNumber: b.temporalSignalCollapsed ? 1 : 0,
    note: "So sánh |edge vs RANDOM| trước/sau khi xáo trộn thứ tự thời gian.",
  });

  const c = runRandomBaselineControl(draws, LOOKBACK);
  items.push({
    id: "C",
    title: "C — RANDOM so với null chính xác",
    status: c.absoluteDifference < 0.1 ? "PASS" : "ĐÁNG CHÚ Ý",
    keyNumberLabel: "|Độ lệch so với kỳ vọng 0.8|",
    keyNumber: c.absoluteDifference,
    note: `observed=${c.observedMean.toFixed(3)} expected=${c.expectedMean.toFixed(3)} (n=${c.trials}).`,
  });

  const e = runLabelPermutationControl(draws, LOOKBACK, SEED);
  items.push({
    id: "E",
    title: "E — Hoán vị nhãn (xáo trộn cặp vé-kết quả)",
    status: e.edgeCollapsedTowardNull ? "PASS" : "ĐÁNG CHÚ Ý",
    keyNumberLabel: "Edge sụp đổ về gần 0 sau hoán vị",
    keyNumber: e.edgeCollapsedTowardNull ? 1 : 0,
    note: `${e.trials} lượt thử, seed=${e.seed}.`,
  });

  const f = runFutureLeakageControl(draws, LOOKBACK);
  items.push({
    id: "F",
    title: "F — Rò rỉ tương lai (control ngược: phải PHÁT HIỆN được rò rỉ)",
    status: f.leakDetected ? "PASS" : "ĐÁNG CHÚ Ý",
    keyNumberLabel: "Rò rỉ cố ý có bị phát hiện không",
    keyNumber: f.leakDetected ? 1 : 0,
    note: `leakedAverageMatches=${f.leakedAverageMatches.toFixed(2)}/6, jackpotRate=${f.leakedJackpotRate.toFixed(2)}.`,
  });

  return { items, drawCount: draws.length, generatedAt: now().toISOString() };
}
