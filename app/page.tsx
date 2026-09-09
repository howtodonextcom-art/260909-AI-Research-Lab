"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Check, CircleDollarSign, Dices, Eraser, FlaskConical, Grid3X3, Info, RotateCcw, ShieldCheck, Sparkles, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProfitLab } from "@/components/profit-lab";
import { PortfolioLab } from "@/components/portfolio-lab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STRATEGIES, calculateFrequency, chiSquareStatistic, createStrategyPick, filterByWindow, formatPercent, parseDraws, runTemporalBacktestReport, runWalkForwardBacktest, type DrawRecord, type StrategyId, type WindowId } from "@/lib/analytics";
import { evaluateTicket, formatBall, formatVnd, generateQuickPick, type TicketResult } from "@/lib/mega645";

const WINDOWS: Array<{ id: WindowId; label: string }> = [
  { id: "30D", label: "1 tháng" },
  { id: "90D", label: "1 quý" },
  { id: "365D", label: "1 năm" },
  { id: "ALL", label: "Toàn bộ" },
];

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

function ResearchLab({ draws }: { draws: DrawRecord[] }) {
  const [windowId, setWindowId] = useState<WindowId>("365D");
  const [strategy, setStrategy] = useState<StrategyId>("HOT");
  const windowDraws = useMemo(() => filterByWindow(draws, windowId), [draws, windowId]);
  const frequencies = useMemo(() => calculateFrequency(windowDraws), [windowDraws]);
  const backtests = useMemo(() => runWalkForwardBacktest(draws, 90), [draws]);
  const temporalReport = useMemo(() => runTemporalBacktestReport(draws, 90), [draws]);
  const random = backtests.find((item) => item.strategy === "RANDOM");
  const ranked = backtests.filter((item) => item.strategy !== "RANDOM").sort((a, b) => b.roi - a.roi || b.edgeVsRandom - a.edgeVsRandom);
  const strongest = ranked[0];
  const selected = backtests.find((item) => item.strategy === strategy);
  const suggestion = useMemo(() => createStrategyPick(draws.slice(-90), strategy, draws.length + 645), [draws, strategy]);
  const hot = frequencies.slice().sort((a, b) => b.count - a.count || a.number - b.number).slice(0, 6);
  const cold = frequencies.slice().sort((a, b) => a.count - b.count || a.number - b.number).slice(0, 6);
  const overdue = frequencies.slice().sort((a, b) => b.gap - a.gap || a.number - b.number).slice(0, 6);
  const maxCount = Math.max(...frequencies.map((row) => row.count), 1);
  const latest = draws.at(-1);
  const verifiedCount = backtests.filter((item) => item.verdict === "VERIFIED").length;
  const holdoutSignals = temporalReport.reliability.filter((item) => item.verdict === "HOLDOUT_SIGNAL").length;
  const selectedReliability = temporalReport.reliability.find((item) => item.selectedOnValidation);
  const orderedBacktests = backtests.slice().sort((a, b) => a.strategy === "RANDOM" ? -1 : b.strategy === "RANDOM" ? 1 : 0);

  return (
    <div className="research-layout">
      <section className="research-main">
        <div className="research-head">
          <div><p className="eyebrow">Dữ liệu thực tế</p><h1>Thống kê không phải dự đoán.</h1><p className="research-lead">Mọi chiến lược phải đấu với chọn ngẫu nhiên trên các kỳ chưa từng được nhìn thấy.</p></div>
          <div className="data-stamp"><span>{draws.length.toLocaleString("vi-VN")} kỳ hợp lệ</span><strong>#{latest?.id}</strong><small>Cập nhật đến {latest ? new Date(latest.date + "T00:00:00Z").toLocaleDateString("vi-VN") : "—"}</small></div>
        </div>

        <div className="window-switch" aria-label="Khoảng thời gian thống kê">
          {WINDOWS.map((window) => <Button key={window.id} className={windowId === window.id ? "window-active" : ""} size="sm" variant="ghost" onClick={() => setWindowId(window.id)}>{window.label}</Button>)}
        </div>

        <ProfitLab />

        <div className="metrics-grid">
          <Metric label="Số kỳ trong mẫu" value={windowDraws.length.toLocaleString("vi-VN")} note={(windowDraws.length * 6).toLocaleString("vi-VN") + " bóng đã quay"} />
          <Metric label="Chi-square mô tả" value={chiSquareStatistic(frequencies).toFixed(1)} note="44 bậc tự do · chưa phải tín hiệu dự đoán" />
          <Metric label="Thuật toán qua 3 cổng" value={verifiedCount + " / 3"} note={verifiedCount ? "Cần tái kiểm định độc lập" : "Chưa có lợi thế được xác nhận"} tone={verifiedCount ? "good" : "bad"} />
          <Metric label="Xác suất Jackpot" value="1 / 8.145.060" note="Không đổi theo số nóng hoặc lạnh" />
        </div>

        <section className="analysis-card frequency-card">
          <div className="section-heading"><div><p className="eyebrow">01–45</p><h2>Tần suất trong cửa sổ đã chọn</h2></div><Badge variant="outline">{WINDOWS.find((item) => item.id === windowId)?.label}</Badge></div>
          <div className="frequency-chart" aria-label="Biểu đồ tần suất các số từ 01 đến 45">
            {frequencies.map((row) => <div className="frequency-column" key={row.number} title={"Số " + formatBall(row.number) + ": " + row.count + " lần"}><span className={row.deltaPercent > 8 ? "bar-hot" : row.deltaPercent < -8 ? "bar-cold" : ""} style={{ height: Math.max(7, (row.count / maxCount) * 100) + "%" }} /><small>{row.number}</small></div>)}
          </div>
          <div className="number-insights">
            <div><span>Nhiều nhất</span><div>{hot.map((row) => <Ball key={row.number} number={row.number} />)}</div><small>{hot[0]?.count ?? 0} lần ở vị trí đầu</small></div>
            <div><span>Ít nhất</span><div>{cold.map((row) => <Ball key={row.number} number={row.number} />)}</div><small>{cold[0]?.count ?? 0} lần ở vị trí đầu</small></div>
            <div><span>Lâu chưa xuất hiện</span><div>{overdue.map((row) => <Ball key={row.number} number={row.number} />)}</div><small>Tối đa {overdue[0]?.gap ?? 0} kỳ vắng mặt</small></div>
          </div>
        </section>

        <section className="analysis-card">
          <div className="section-heading"><div><p className="eyebrow">Walk-forward · nhìn 90 kỳ trước</p><h2>A/B test thuật toán với ngẫu nhiên</h2></div><Badge className="status-honest">Không nhìn trước tương lai</Badge></div>
          <div className="table-wrap">
            <Table>
              <TableHeader><TableRow><TableHead>Chiến lược</TableHead><TableHead>TB số trùng</TableHead><TableHead>Tỷ lệ ≥3</TableHead><TableHead>ROI</TableHead><TableHead>So với random</TableHead><TableHead>Kết luận</TableHead></TableRow></TableHeader>
              <TableBody>{orderedBacktests.map((row) => <TableRow key={row.strategy} className={row.strategy === strongest?.strategy ? "strongest-row" : ""}>
                <TableCell><button className="strategy-link" onClick={() => setStrategy(row.strategy)}>{STRATEGIES[row.strategy].name}</button></TableCell>
                <TableCell>{row.averageMatches.toFixed(3)}</TableCell>
                <TableCell>{row.hit3Rate.toFixed(2)}%</TableCell>
                <TableCell className={row.roi >= 0 ? "positive" : "negative"}>{formatPercent(row.roi)}</TableCell>
                <TableCell>{row.strategy === "RANDOM" ? "Mốc đối chứng" : (row.edgeVsRandom >= 0 ? "+" : "") + row.edgeVsRandom.toFixed(3)}</TableCell>
                <TableCell><Badge variant="outline" className={"verdict verdict-" + row.verdict.toLowerCase()}>{row.verdict === "VERIFIED" ? "Đã xác nhận" : row.verdict === "PROMISING" ? "Chưa đủ bằng chứng" : "Không có lợi thế"}</Badge></TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </div>
          <p className="method-note"><Info /> Đối chứng là trung bình 32 vé random/kỳ. ROI chỉ tính giải cố định 3–5 số, không gồm Jackpot. Ba cổng chỉ sàng lọc thăm dò: chưa có tập xác nhận độc lập hoặc hiệu chỉnh thử nhiều phương pháp, nên không thể xác nhận lợi thế hay sinh lời.</p>
        </section>

        <section className="analysis-card holdout-card">
          <div className="section-heading"><div><p className="eyebrow">Train · validation · test</p><h2>Kiểm định holdout sau hiệu chỉnh nhiều chiến lược</h2></div><Badge variant="outline">{holdoutSignals ? holdoutSignals + " tín hiệu" : "Chưa xác nhận"}</Badge></div>
          <div className="phase-grid">
            {temporalReport.phases.map((phase) => <div key={phase.id}><span>{phase.label}</span><strong>{phase.trials.toLocaleString("vi-VN")} kỳ</strong><small>{new Date(phase.startDate + "T00:00:00Z").toLocaleDateString("vi-VN")} → {new Date(phase.endDate + "T00:00:00Z").toLocaleDateString("vi-VN")}</small></div>)}
          </div>
          <div className="table-wrap">
            <Table>
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
          <p className="method-note"><Info /> {selectedReliability ? STRATEGIES[selectedReliability.strategy].name + " được chọn bằng validation rồi kiểm tra trên test chưa dùng để chọn." : "Không chiến lược nào có edge dương trên validation để chọn."} P-value dùng kiểm định một phía so với random và hiệu chỉnh Holm-Bonferroni cho ba chiến lược.</p>
        </section>
      </section>

      <aside className="research-side">
        <section className="analysis-card sticky-card">
          <p className="eyebrow">Ứng viên mạnh nhất hiện tại</p>
          <h2>{strongest ? STRATEGIES[strongest.strategy].name : "Đang tính"}</h2>
          <p className="strategy-description">{strongest ? STRATEGIES[strongest.strategy].description : ""}</p>
          <div className="evidence-status"><AlertTriangle /><div><strong>Chưa chứng minh sinh lời</strong><span>{strongest ? "Chênh " + (strongest.edgeVsRandom >= 0 ? "+" : "") + strongest.edgeVsRandom.toFixed(3) + " số trùng/kỳ so với random." : ""}</span></div></div>
          <div className="gate-list">
            <div className={selected && selected.zScoreVsRandom >= 1.96 ? "gate-pass" : ""}><Check /> Ý nghĩa thống kê <span>z = {selected?.zScoreVsRandom.toFixed(2) ?? "—"}</span></div>
            <div className={selected && selected.firstHalfEdge > 0 && selected.secondHalfEdge > 0 ? "gate-pass" : ""}><Check /> Ổn định hai nửa <span>{selected ? selected.firstHalfEdge.toFixed(2) + " / " + selected.secondHalfEdge.toFixed(2) : "—"}</span></div>
            <div className={selected && random && selected.payout > random.payout ? "gate-pass" : ""}><Check /> Trả thưởng hơn random <span>{selected && random ? formatVnd(selected.payout - random.payout) : "—"}</span></div>
          </div>
          <label className="strategy-label" htmlFor="strategy">Thử một phương pháp</label>
          <Select value={strategy} onValueChange={(value) => setStrategy(value as StrategyId)}>
            <SelectTrigger id="strategy" className="strategy-select"><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(STRATEGIES) as StrategyId[]).filter((id) => id !== "RANDOM").map((id) => <SelectItem key={id} value={id}>{STRATEGIES[id].name}</SelectItem>)}</SelectContent>
          </Select>
          <div className="suggestion-balls">{suggestion.map((number) => <Ball key={number} number={number} />)}</div>
          <p className="suggestion-warning">Bộ số nghiên cứu, không phải cam kết thắng. Mỗi vé vẫn có xác suất Jackpot như nhau.</p>
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
  const [draws, setDraws] = useState<DrawRecord[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => { fetch("/data/power645.jsonl").then((response) => { if (!response.ok) throw new Error("data"); return response.text(); }).then((text) => setDraws(parseDraws(text))).catch(() => setError(true)); }, []);
  return <main className="min-h-screen">
    <header className="topbar"><div className="brand-mark" aria-hidden="true">6<span>/</span>45</div><div><p className="brand-name">Mega 6/45 Research Lab</p><p className="brand-note">Phân tích độc lập · Không phải website Vietlott</p></div><Badge className="ml-auto hidden border-white/15 bg-white/8 text-slate-200 sm:inline-flex">MVP 02</Badge></header>
    <div className="workspace-shell research-shell">
      <Tabs defaultValue="portfolio">
        <TabsList className="mode-tabs"><TabsTrigger value="portfolio"><Grid3X3 /> Portfolio 4+</TabsTrigger><TabsTrigger value="research"><FlaskConical /> Nghiên cứu</TabsTrigger><TabsTrigger value="ticket"><Target /> Vé mô phỏng</TabsTrigger></TabsList>
        <TabsContent value="portfolio"><PortfolioLab /></TabsContent>
        <TabsContent value="research">{error ? <div className="load-state"><AlertTriangle /><h2>Không đọc được dữ liệu lịch sử</h2><p>Vui lòng tải lại trang để thử lại.</p></div> : draws.length ? <ResearchLab draws={draws} /> : <div className="load-state"><BarChart3 /><h2>Đang kiểm tra 1.362 kỳ quay…</h2></div>}</TabsContent>
        <TabsContent value="ticket"><TicketLab /></TabsContent>
      </Tabs>
      <section className="facts-row"><article><CircleDollarSign /><div><span>Nguyên tắc vốn</span><strong>Không mua nếu kỳ vọng dương chưa được chứng minh</strong></div></article><article><ShieldCheck /><div><span>Chống overfit</span><strong>Chỉ dùng dữ liệu quá khứ tại mỗi kỳ test</strong></div></article><article><Info /><div><span>Nguồn dữ liệu</span><strong>Vietlott-data · 25/10/2017–06/09/2026</strong></div></article></section>
    </div>
  </main>;
}
