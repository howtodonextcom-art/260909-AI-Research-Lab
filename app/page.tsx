"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Check, CircleDollarSign, Dices, Eraser, FlaskConical, Grid3X3, Info, RefreshCw, RotateCcw, ShieldCheck, Sparkles, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProfitLab } from "@/components/profit-lab";
import { PortfolioLab } from "@/components/portfolio-lab";
import { DataStatus } from "@/components/data-status";
import { DataExplorer } from "@/components/data-explorer";
import { ExperimentScorecard } from "@/components/experiment-scorecard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STRATEGIES, calculateFrequency, createStrategyPick, filterByWindow, formatPercent, runTemporalBacktestReport, runWalkForwardBacktest, type DrawRecord, type StrategyId, type WindowId } from "@/lib/analytics";
import {
  FALLBACK_HOLM_FAMILY_SIZE,
  parseExperimentFamilySummary,
  type ExperimentFamilySummary,
} from "@/lib/research/experiments";
import { CURRENT_PROTOCOL, classifyEvidence, parseProtocolLock, type ProtocolLock } from "@/lib/research/protocol";
import { INTERACTIVE_FAIRNESS_SIMULATION_COUNT, monteCarloFairnessDiagnostic } from "@/lib/research/statistics";
import { evaluateTicket, formatBall, formatVnd, generateQuickPick, type TicketResult } from "@/lib/mega645";
import { useDrawData, type DrawDataState } from "@/hooks/use-draw-data";

const WINDOWS: Array<{ id: WindowId; label: string }> = [
  { id: "30D", label: "1 tháng" },
  { id: "90D", label: "1 quý" },
  { id: "365D", label: "1 năm" },
  { id: "ALL", label: "Toàn bộ" },
];

const STRATEGY_IDS = Object.keys(STRATEGIES) as StrategyId[];

function isStrategyId(value: string): value is StrategyId {
  return STRATEGY_IDS.includes(value as StrategyId);
}

function formatDateVi(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("vi-VN", { timeZone: "UTC" });
}

function frequencyTone(deltaPercent: number): "hot" | "cold" | "neutral" {
  if (deltaPercent > 8) return "hot";
  if (deltaPercent < -8) return "cold";
  return "neutral";
}

function Ball({ number, selected, matched, onClick }: { number: number; selected?: boolean; matched?: boolean; onClick?: () => void }) {
  const className = "ball " + (selected ? "ball-selected " : "") + (matched ? "ball-matched" : "");
  if (!onClick) return <span className={className}>{formatBall(number)}</span>;
  return <button type="button" onClick={onClick} aria-pressed={selected} aria-label={"Số " + formatBall(number)} className={className}>{formatBall(number)}</button>;
}

function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "good" | "bad" }) {
  return <article className={"metric-card " + (tone ? "metric-" + tone : "")}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function formatPValue(value: number | null | undefined): string {
  if (value == null) return "—";
  return value < 0.001 ? "<0.001" : value.toFixed(3);
}

function FrequencyCell({ row, maxCount }: { row: ReturnType<typeof calculateFrequency>[number]; maxCount: number }) {
  const tone = frequencyTone(row.deltaPercent);
  const toneLabel = tone === "hot" ? "Nóng" : tone === "cold" ? "Lạnh" : "Ổn";
  const symbol = tone === "hot" ? "▲" : tone === "cold" ? "▼" : "·";
  return (
    <div
      className={"frequency-cell frequency-" + tone}
      role="listitem"
      aria-label={`Số ${formatBall(row.number)}: ${row.count} lần, ${toneLabel.toLowerCase()}, lệch ${row.deltaPercent >= 0 ? "+" : ""}${row.deltaPercent.toFixed(1)} phần trăm so với kỳ vọng.`}
      title={`Số ${formatBall(row.number)} · ${row.count} lần · ${toneLabel} · ${row.deltaPercent >= 0 ? "+" : ""}${row.deltaPercent.toFixed(1)}%`}
    >
      <div className="frequency-cell-head"><strong>{formatBall(row.number)}</strong><span>{symbol} {toneLabel}</span></div>
      <div className="frequency-mini-bar" aria-hidden="true"><span style={{ width: Math.max(4, (row.count / maxCount) * 100) + "%" }} /></div>
      <small>{row.count} lần</small>
    </div>
  );
}

function ResearchLab({ draws, dataState }: { draws: DrawRecord[]; dataState: DrawDataState }) {
  const [windowId, setWindowId] = useState<WindowId>("365D");
  const [strategy, setStrategy] = useState<StrategyId>("HOT");
  const [protocolLock, setProtocolLock] = useState<ProtocolLock | null>(null);
  const [familySummary, setFamilySummary] = useState<ExperimentFamilySummary | null>(null);
  const windowDraws = useMemo(() => filterByWindow(draws, windowId), [draws, windowId]);
  const frequencies = useMemo(() => calculateFrequency(windowDraws), [windowDraws]);
  // Interactive MC count is intentionally lower than CURRENT_PROTOCOL.fairnessSimulationCount
  // (artifact/canonical precision) so the Research tab stays responsive on full history.
  const fairness = useMemo(
    () => monteCarloFairnessDiagnostic(windowDraws, { simulationCount: INTERACTIVE_FAIRNESS_SIMULATION_COUNT, seed: 645 }),
    [windowDraws],
  );
  const familySize = familySummary?.familySize ?? FALLBACK_HOLM_FAMILY_SIZE;
  const lookCount = familySummary?.lookCount ?? 1;
  const backtests = useMemo(() => runWalkForwardBacktest(draws, 90, CURRENT_PROTOCOL.alpha), [draws]);
  const temporalReport = useMemo(
    () => runTemporalBacktestReport(draws, 90, CURRENT_PROTOCOL.alpha, familySize, lookCount),
    [draws, familySize, lookCount],
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetch("/data/protocol-lock.json").then((response) => (response.ok ? response.json() : null)).catch(() => null),
      fetch("/data/experiment-family.json").then((response) => (response.ok ? response.json() : null)).catch(() => null),
    ]).then(([lockRaw, familyRaw]) => {
      if (cancelled) return;
      setProtocolLock(parseProtocolLock(lockRaw));
      setFamilySummary(parseExperimentFamilySummary(familyRaw));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const latest = draws.at(-1);
  const latestEvidence = latest && protocolLock ? classifyEvidence(latest.id, protocolLock) : null;
  const random = backtests.find((item) => item.strategy === "RANDOM");
  // The candidate comes from validation only. Ranking whole-history ROI here
  // would let the holdout choose what the app recommends, which is the exact
  // leak the holdout exists to prevent.
  const candidate = temporalReport.candidate;
  const selected = backtests.find((item) => item.strategy === strategy);
  // Next-draw survey illustration: latest published lookback only. Not a
  // historical prediction score — do not use this set to claim past edge.
  const suggestion = useMemo(
    () => createStrategyPick(draws.slice(-CURRENT_PROTOCOL.lookback), strategy, draws.length + 645),
    [draws, strategy],
  );
  const suggestionCutoffId = latest?.id ?? "—";
  const suggestionCutoffDate = latest ? formatDateVi(latest.date) : "—";
  const hot = frequencies.slice().sort((a, b) => b.count - a.count || a.number - b.number).slice(0, 6);
  const cold = frequencies.slice().sort((a, b) => a.count - b.count || a.number - b.number).slice(0, 6);
  const overdue = frequencies.slice().sort((a, b) => b.gap - a.gap || a.number - b.number).slice(0, 6);
  const maxCount = Math.max(...frequencies.map((row) => row.count), 1);
  const expectedCount = frequencies[0]?.expected ?? 0;
  const gatesPassed = selected?.gates.passedCount ?? 0;
  const holdoutSignals = temporalReport.reliability.filter((item) => item.verdict === "HOLDOUT_SIGNAL").length;
  const selectedReliability = temporalReport.reliability.find((item) => item.selectedOnValidation);
  const orderedBacktests = backtests.slice().sort((a, b) => a.strategy === "RANDOM" ? -1 : b.strategy === "RANDOM" ? 1 : 0);

  return (
    <div className="research-layout">
      <section className="research-main">
        <div className="research-head">
          <div><p className="eyebrow">Dữ liệu thực tế</p><h1>Thống kê không phải dự đoán.</h1><p className="research-lead">Mọi chiến lược phải đấu với chọn ngẫu nhiên trên các kỳ chưa từng được nhìn thấy.</p></div>
          <div className="data-stamp"><span>{draws.length.toLocaleString("vi-VN")} kỳ hợp lệ</span><strong>#{latest?.id}</strong><small>Cập nhật đến {latest ? formatDateVi(latest.date) : "—"}</small></div>
        </div>

        <div className="window-switch" role="group" aria-label="Khoảng thời gian thống kê">
          {WINDOWS.map((window) => <Button key={window.id} aria-pressed={windowId === window.id} className={windowId === window.id ? "window-active" : ""} size="sm" variant="ghost" onClick={() => setWindowId(window.id)}>{window.label}</Button>)}
        </div>

        <DataStatus state={dataState} protocolLock={protocolLock} familySummary={familySummary} />

        <div className="metrics-grid">
          <Metric label="Số kỳ trong mẫu" value={windowDraws.length.toLocaleString("vi-VN")} note={(windowDraws.length * 6).toLocaleString("vi-VN") + " bóng đã quay"} />
          <Metric
            label="Chẩn đoán độ công bằng (Monte Carlo)"
            value={`Q=${fairness.observedStatistic.toFixed(1)} · p≈${fairness.monteCarloPValue.toFixed(3)}`}
            note={`Tương tác: ${fairness.simulationCount} mô phỏng (seed=${fairness.seed}); protocol canonical=${CURRENT_PROTOCOL.fairnessSimulationCount} — không phải chỉ báo dự đoán`}
          />
          <Metric label={STRATEGIES[strategy].name + " qua cổng sàng lọc"} value={gatesPassed + " / 3"} note="Cổng in-sample, không phải xác nhận" tone={gatesPassed === 3 ? "good" : "bad"} />
          <Metric label="Xác suất Jackpot" value="1 / 8.145.060" note={latestEvidence ? `Kỳ mới nhất: ${latestEvidence}` : "Không đổi theo số nóng hoặc lạnh"} />
        </div>

        <section className="analysis-card conclusion-card" aria-labelledby="research-conclusion-heading">
          <div><p className="eyebrow">Kết luận kiểm định</p><h2 id="research-conclusion-heading">{holdoutSignals ? "Có tín hiệu cần theo dõi tiếp" : "Chưa có chiến lược vượt đối chứng trên holdout."}</h2></div>
          <p>{selectedReliability ? `${STRATEGIES[selectedReliability.strategy].name} được chọn bằng validation nhưng test holdout chưa xác nhận lợi thế ổn định.` : "Không có phương pháp nào đủ điều kiện chọn trên validation. Đây là kết quả phù hợp với trò chơi quay độc lập và công bằng."}</p>
        </section>

        <section className="analysis-card frequency-card" aria-labelledby="frequency-heading">
          <div className="section-heading">
            <div><p className="eyebrow">01–45</p><h2 id="frequency-heading">Ma trận tần suất trong cửa sổ đã chọn</h2></div>
            <Badge variant="outline">{WINDOWS.find((item) => item.id === windowId)?.label}</Badge>
          </div>
          <div className="frequency-guide">
            <div><span className="legend-dot legend-hot">▲</span>Nóng: cao hơn kỳ vọng trên 8%</div>
            <div><span className="legend-dot legend-neutral">·</span>Ổn: trong biên ±8%</div>
            <div><span className="legend-dot legend-cold">▼</span>Lạnh: thấp hơn kỳ vọng trên 8%</div>
            <small>Mốc đọc: 0 → kỳ vọng {expectedCount.toFixed(1)} → cao nhất {maxCount}</small>
          </div>
          <div className="frequency-scale" aria-hidden="true"><span>0</span><span>Kỳ vọng</span><span>{maxCount}</span></div>
          <div className="frequency-matrix" role="list" aria-label="Ma trận tần suất 45 số, mỗi ô ghi số lần xuất hiện và trạng thái nóng, lạnh hoặc ổn định.">
            {frequencies.map((row) => <FrequencyCell key={row.number} row={row} maxCount={maxCount} />)}
          </div>
          <div className="number-insights">
            <div><span>Nhiều nhất</span><div>{hot.map((row) => <Ball key={row.number} number={row.number} />)}</div><small>{hot[0]?.count ?? 0} lần ở vị trí đầu</small></div>
            <div><span>Ít nhất</span><div>{cold.map((row) => <Ball key={row.number} number={row.number} />)}</div><small>{cold[0]?.count ?? 0} lần ở vị trí đầu</small></div>
            <div><span>Lâu chưa xuất hiện</span><div>{overdue.map((row) => <Ball key={row.number} number={row.number} />)}</div><small>Tối đa {overdue[0]?.gap ?? 0} kỳ vắng mặt</small></div>
          </div>
        </section>

        <section className="analysis-card">
          <div className="section-heading"><div><p className="eyebrow">Walk-forward · nhìn 90 kỳ trước</p><h2>Thống kê mô tả toàn bộ lịch sử</h2></div><Badge className="status-honest">Không nhìn trước tương lai</Badge></div>
          <p id="history-table-note" className="table-hint">Bảng rộng có thể cuộn ngang trên màn hình nhỏ.</p>
          <div className="table-wrap" tabIndex={0} aria-describedby="history-table-note">
            <Table>
              <TableCaption>So sánh mô tả các chiến lược trên toàn bộ lịch sử; không dùng để chọn ứng viên.</TableCaption>
              <TableHeader><TableRow><TableHead>Chiến lược</TableHead><TableHead>TB số trùng</TableHead><TableHead>Tỷ lệ ≥3</TableHead><TableHead>ROI</TableHead><TableHead>So với random</TableHead><TableHead>Cổng sàng lọc</TableHead></TableRow></TableHeader>
              <TableBody>{orderedBacktests.map((row) => <TableRow key={row.strategy} className={row.strategy === strategy ? "strongest-row" : ""}>
                <TableCell><button className="strategy-link" onClick={() => setStrategy(row.strategy)}>{STRATEGIES[row.strategy].name}</button></TableCell>
                <TableCell>{row.averageMatches.toFixed(3)}</TableCell>
                <TableCell>{row.hit3Rate.toFixed(2)}%</TableCell>
                <TableCell className={row.roi >= 0 ? "positive" : "negative"}>{formatPercent(row.roi)}</TableCell>
                <TableCell>{row.strategy === "RANDOM" ? "Mốc đối chứng" : (row.edgeVsRandom >= 0 ? "+" : "") + row.edgeVsRandom.toFixed(3)}</TableCell>
                <TableCell>{row.strategy === "RANDOM" ? "—" : <Badge variant="outline" className={"verdict verdict-" + (row.gates.passedCount === 3 ? "promising" : "no_edge")}>{row.gates.passedCount} / 3</Badge>}</TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </div>
          <p className="method-note"><Info /><span>Bảng này tính trên toàn bộ lịch sử, bao gồm cả phần dùng làm test, nên chỉ là <strong>thống kê mô tả</strong> và không được dùng để chọn chiến lược. Walk-forward trượt cửa sổ {temporalReport.lookback} kỳ (thử nghiệm liền kề chia sẻ lịch sử) nên z-score/p-value dùng Newey–West HAC ({temporalReport.varianceMethod}), băng thông min(lookback-1, max(1, floor(n^(1/3)))), không giả định i.i.d. Đối chứng là trung bình 32 vé random/kỳ. ROI chỉ tính giải cố định 3–5 số, không gồm Jackpot. Cổng trả thưởng so sánh tổng đã winsorize (cắt trần giải Nhì / 4 số), không cộng payout thô. Ba cổng là bộ lọc thăm dò in-sample, không phải xác nhận.</span></p>
        </section>

        <section className="analysis-card holdout-card">
          <div className="section-heading"><div><p className="eyebrow">Development · validation · test (chia hồi cứu)</p><h2>Kiểm định holdout sau hiệu chỉnh nhiều chiến lược</h2></div><Badge variant="outline">{holdoutSignals ? holdoutSignals + " tín hiệu" : "Chưa xác nhận"}</Badge></div>
          <div className="phase-grid">
            {temporalReport.phases.map((phase) => <div key={phase.id}><span>{phase.label}</span><strong>{phase.trials.toLocaleString("vi-VN")} kỳ</strong><small>{formatDateVi(phase.startDate)} → {formatDateVi(phase.endDate)}</small></div>)}
          </div>
          <p id="holdout-table-note" className="table-hint">Bảng holdout rộng có thể cuộn ngang; p-value đã hiệu chỉnh Holm-Bonferroni.</p>
          <div className="table-wrap" tabIndex={0} aria-describedby="holdout-table-note">
            <Table>
              <TableCaption>Kết quả validation và test holdout sau hiệu chỉnh kiểm định nhiều chiến lược.</TableCaption>
              <TableHeader><TableRow><TableHead>Chiến lược</TableHead><TableHead>Validation edge</TableHead><TableHead>Adj p</TableHead><TableHead>Test edge</TableHead><TableHead>95% CI</TableHead><TableHead>Kết luận</TableHead></TableRow></TableHeader>
              <TableBody>{temporalReport.reliability.map((row) => <TableRow key={row.strategy} className={row.selectedOnValidation ? "strongest-row" : ""}>
                <TableCell>{STRATEGIES[row.strategy].name}{row.selectedOnValidation ? " · chọn từ validation" : ""}</TableCell>
                <TableCell>{row.validationEdge >= 0 ? "+" : ""}{row.validationEdge.toFixed(3)}</TableCell>
                <TableCell>{formatPValue(row.validationAdjustedPValue)}</TableCell>
                <TableCell>{row.testEdge >= 0 ? "+" : ""}{row.testEdge.toFixed(3)}</TableCell>
                <TableCell>{row.testCi95Low.toFixed(3)} → {row.testCi95High.toFixed(3)}</TableCell>
                <TableCell><Badge variant="outline" className={"verdict verdict-" + (row.verdict === "HOLDOUT_SIGNAL" ? "verified" : row.verdict === "VALIDATION_ONLY" ? "promising" : "no_edge")}>{row.verdict === "HOLDOUT_SIGNAL" ? "Có tín hiệu holdout" : row.verdict === "VALIDATION_ONLY" ? "Chưa qua test" : "Không chọn"}</Badge></TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </div>
          <p className="method-note"><Info /><span>{selectedReliability ? STRATEGIES[selectedReliability.strategy].name + " được chọn bằng validation rồi kiểm tra trên test chưa dùng để chọn." : "Không chiến lược nào đạt ngưỡng trên validation để được chọn."} P-value dùng kiểm định một phía so với random, SE Newey–West HAC (cửa sổ chồng, băng thông min(lookback-1, max(1, floor(n^(1/3))))), và hiệu chỉnh Holm-Bonferroni theo số giả thuyết / registry = {temporalReport.familySize} (family {familySummary?.familyId ?? "—"}; fallback {FALLBACK_HOLM_FAMILY_SIZE} nếu registry trống — familySize không tăng khi chỉ thêm kỳ/look mới). lookCount={temporalReport.lookCount}; alpha look hiện tại sau chi tiêu Pocock = {temporalReport.alpha} (nominal {temporalReport.nominalAlpha}). Đây là <strong>chia hồi cứu trên dữ liệu đã có sẵn</strong>: tập test là holdout theo nghĩa cơ học (không dùng để chọn), nhưng không bảo đảm chưa từng có người nhìn thấy. Chỉ các kỳ từ <code>{protocolLock?.prospectiveStartDrawId ?? "—"}</code> (protocol <code>{temporalReport.protocolVersion}</code>) mới là bằng chứng prospective.</span></p>
        </section>

        <ExperimentScorecard protocolLock={protocolLock} familySummary={familySummary} draws={draws} />

        <DataExplorer draws={draws} />

        <ProfitLab />
      </section>

      <aside className="research-side">
        <section className="analysis-card sticky-card">
          <p className="eyebrow">Ứng viên chọn từ validation</p>
          {candidate ? <>
            <h2>{STRATEGIES[candidate.strategy].name}</h2>
            <p className="strategy-description">{STRATEGIES[candidate.strategy].description}</p>
            <div className="evidence-status"><AlertTriangle /><div><strong>Mới là ứng viên, chưa phải bằng chứng</strong><span>Validation edge {candidate.validationEdge >= 0 ? "+" : ""}{candidate.validationEdge.toFixed(3)} số/kỳ · adj p = {formatPValue(candidate.validationAdjustedPValue)}. Còn phải vượt tập test.</span></div></div>
          </> : <>
            <h2>Chưa có ứng viên đủ bằng chứng</h2>
            <p className="strategy-description">Không chiến lược nào đạt đồng thời edge dương và adjusted p-value ≤ {temporalReport.alpha} trên validation. Đây là kết quả bình thường với một trò chơi quay công bằng.</p>
            <div className="evidence-status"><AlertTriangle /><div><strong>Không có gì để khuyến nghị</strong><span>Mọi bộ số dưới đây chỉ để khảo sát, không phải lựa chọn được hệ thống ủng hộ.</span></div></div>
          </>}

          <label className="strategy-label" htmlFor="strategy">Khảo sát một phương pháp</label>
          <Select value={strategy} onValueChange={(value) => { if (isStrategyId(value)) setStrategy(value); }}>
            <SelectTrigger id="strategy" className="strategy-select"><SelectValue /></SelectTrigger>
            <SelectContent>{STRATEGY_IDS.filter((id) => id !== "RANDOM").map((id) => <SelectItem key={id} value={id}>{STRATEGIES[id].name}</SelectItem>)}</SelectContent>
          </Select>
          <div className="gate-list">
            <div className={selected?.gates.significant ? "gate-pass" : ""}><Check /> Ý nghĩa thống kê <span>z = {selected?.zScoreVsRandom.toFixed(2) ?? "—"}</span></div>
            <div className={selected?.gates.stableAcrossHalves ? "gate-pass" : ""}><Check /> Ổn định hai nửa <span>{selected ? selected.firstHalfEdge.toFixed(2) + " / " + selected.secondHalfEdge.toFixed(2) : "—"}</span></div>
            <div className={selected?.gates.outperformsRandomPayout ? "gate-pass" : ""}><Check /> Trả thưởng bền đuôi hơn random <span>{selected && random ? formatVnd(selected.robustPayout - random.robustPayout) : "—"}</span></div>
          </div>
          <div className="suggestion-balls">{suggestion.map((number) => <Ball key={number} number={number} />)}</div>
          <p className="suggestion-warning">
            <strong>Khảo sát kỳ tiếp theo</strong> (minh họa) — cutoff dữ liệu #{suggestionCutoffId} / {suggestionCutoffDate};
            cửa sổ {CURRENT_PROTOCOL.lookback} kỳ đã công bố; loại bằng chứng: <em>không phải prospective scored</em>.
            Không dùng bộ số này để tính thành tích dự đoán quá khứ. Mỗi vé vẫn có xác suất Jackpot như nhau: 1/8.145.060.
          </p>
        </section>
      </aside>
    </div>
  );
}

function TicketLab() {
  const [ticket, setTicket] = useState<number[]>([3, 11, 18, 27, 34, 42]);
  const [draw, setDraw] = useState<number[] | null>(null);
  const [result, setResult] = useState<TicketResult | null>(null);
  const pool = useMemo(() => Array.from({ length: 45 }, (_, index) => index + 1), []);
  const reset = () => { setDraw(null); setResult(null); };
  const toggle = (number: number) => { setTicket((current) => current.includes(number) ? current.filter((item) => item !== number) : current.length < 6 ? [...current, number].sort((a, b) => a - b) : current); reset(); };
  const simulate = () => { const next = generateQuickPick(); setDraw(next); setResult(evaluateTicket(ticket, next)); };
  return <div className="main-grid simulator-grid">
    <section className="ticket-card"><div className="section-heading"><div><p className="eyebrow">Vé mô phỏng</p><h2>Chọn đúng 6 số</h2></div><span className={"selection-count " + (ticket.length === 6 ? "complete" : "")}>{ticket.length}/6</span></div>
      <div className="selected-strip">{Array.from({ length: 6 }, (_, index) => ticket[index] ? <Ball key={ticket[index]} number={ticket[index]} selected matched={result?.matchedNumbers.includes(ticket[index])} /> : <span key={index} className="ball ball-empty">—</span>)}</div>
      <div className="number-grid">{pool.map((number) => <Ball key={number} number={number} selected={ticket.includes(number)} onClick={() => toggle(number)} />)}</div>
      <div className="ticket-actions"><Button className="primary-action" onClick={() => { setTicket(generateQuickPick()); reset(); }}><Dices /> Chọn nhanh</Button><Button variant="outline" className="secondary-action" onClick={() => { setTicket([]); reset(); }}><Eraser /> Xóa vé</Button></div>
    </section>
    <aside className="draw-card"><div className="section-heading"><div><p className="eyebrow">Phòng quay mô phỏng</p><h2>Kết quả độc lập</h2></div><ShieldCheck className="shield-icon" /></div>
      <div className="draw-stage">{draw ? draw.map((number) => <Ball key={number} number={number} matched={ticket.includes(number)} />) : <div className="draw-placeholder"><Dices /><p>Chưa có kỳ quay</p><span>Kết quả dùng Web Crypto API.</span></div>}</div>
      <Button className="draw-action" onClick={simulate} disabled={ticket.length !== 6}>{draw ? <RotateCcw /> : <Dices />}{draw ? "Quay kỳ tiếp theo" : "Mô phỏng kỳ quay"}</Button>
      {result && <div className={"result-panel " + (result.tier !== "NONE" ? "result-won" : "")}><div className="result-icon">{result.tier !== "NONE" ? <Sparkles /> : <Info />}</div><div><p className="eyebrow">Kết quả đối chiếu</p><h3>{result.label}</h3><p>Trùng <strong>{result.matches}/6 số</strong>{result.payout && result.payout > 0 ? " · " + formatVnd(result.payout) : ""}</p></div></div>}
    </aside>
  </div>;
}

export default function Home() {
  const dataState = useDrawData();
  const draws = dataState.records;
  const error = Boolean(dataState.loadError);
  const firstDraw = draws[0];
  const latestDraw = draws.at(-1);
  const sourceLabel = dataState.manifest?.source.primary.id ?? "vietlott-official";
  const dataRangeLabel = firstDraw && latestDraw ? `${sourceLabel} · ${formatDateVi(firstDraw.date)}–${formatDateVi(latestDraw.date)}` : `${sourceLabel} · đang tải`;
  return <main id="main-content" className="min-h-screen">
    <a className="skip-link" href="#workspace">Bỏ qua đến nội dung</a>
    <header className="topbar"><div className="brand-mark" aria-hidden="true">6<span>/</span>45</div><div><p className="brand-name">Mega 6/45 Research Lab</p><p className="brand-note">Phân tích độc lập · Không phải website Vietlott</p></div><Badge className="ml-auto hidden border-white/15 bg-white/8 text-slate-200 sm:inline-flex">MVP 02</Badge></header>
    <div id="workspace" className="workspace-shell research-shell">
      <Tabs defaultValue="research">
        <nav aria-label="Chế độ làm việc">
          <TabsList className="mode-tabs"><TabsTrigger value="research"><FlaskConical /> Nghiên cứu</TabsTrigger><TabsTrigger value="portfolio"><Grid3X3 /> Portfolio 4+</TabsTrigger><TabsTrigger value="ticket"><Target /> Vé mô phỏng</TabsTrigger></TabsList>
        </nav>
        <TabsContent value="research">{error ? <div className="load-state"><AlertTriangle /><h2>Không đọc được dữ liệu lịch sử</h2><p>{dataState.loadError}</p><Button className="primary-action" onClick={dataState.update} disabled={dataState.busy}><RefreshCw /> Thử cập nhật dữ liệu</Button></div> : draws.length ? <ResearchLab draws={draws} dataState={dataState} /> : <div className="load-state"><BarChart3 /><h2>Đang tải dữ liệu kỳ quay…</h2></div>}</TabsContent>
        <TabsContent value="portfolio"><PortfolioLab /></TabsContent>
        <TabsContent value="ticket"><TicketLab /></TabsContent>
      </Tabs>
      <section className="facts-row"><article><CircleDollarSign /><div><span>Nguyên tắc vốn</span><strong>Không mua nếu kỳ vọng dương chưa được chứng minh</strong></div></article><article><ShieldCheck /><div><span>Chống overfit</span><strong>Chỉ dùng dữ liệu quá khứ tại mỗi kỳ test</strong></div></article><article><Info /><div><span>Nguồn dữ liệu</span><strong>{dataRangeLabel}</strong></div></article></section>
      <footer className="site-footer">
        <p>Phòng thí nghiệm thống kê độc lập. Không phải website Vietlott, không bán vé và không khuyến nghị mua. Mọi kết luận chỉ dựa trên dữ liệu lịch sử đã công bố.</p>
      </footer>
    </div>
  </main>;
}
