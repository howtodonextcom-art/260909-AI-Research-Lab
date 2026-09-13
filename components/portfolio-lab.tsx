"use client";

import { useMemo, useState } from "react";
import { Copy, Minus, Plus, RefreshCw, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CostFrontierPanel } from "@/components/cost-frontier";
import { calculatePortfolioOdds, copyTickets, countCoveredPairs, optimizePortfolio } from "@/lib/portfolio";
import { computeExactBenchmark, EXACT_BENCHMARK_CAVEAT, type ExactBenchmarkLift } from "@/lib/research/exact-benchmark";
import { formatBall, formatVnd } from "@/lib/mega645";

function percent(value: number) {
  return `${(value * 100).toFixed(value < 0.0001 ? 5 : 3)}%`;
}

function oneIn(value: number) {
  return `1 / ${(1 / value).toLocaleString("vi-VN", { maximumFractionDigits: 0 })}`;
}

function liftText(lift: ExactBenchmarkLift) {
  const absolutePp = lift.absolute * 100;
  const relativePct = lift.relative * 100;
  const absoluteText = `${absolutePp >= 0 ? "+" : ""}${absolutePp.toFixed(absolutePp !== 0 && Math.abs(absolutePp) < 0.001 ? 6 : 4)} đpt`;
  const relativeText = `${relativePct >= 0 ? "+" : ""}${relativePct.toFixed(relativePct !== 0 && Math.abs(relativePct) < 0.01 ? 5 : 2)}%`;
  return `${absoluteText} (${relativeText})`;
}

// N=10/20/30 are the discoverability anchors from §7; the currently selected
// N is inserted too so the table always reflects what the user is looking at
// (deduplicated + sorted below).
function benchmarkTicketCounts(currentTicketCount: number): number[] {
  return Array.from(new Set([10, currentTicketCount, 20, 30])).sort((a, b) => a - b);
}

export function PortfolioLab() {
  const [ticketCount, setTicketCount] = useState(10);
  const [seed, setSeed] = useState(645);
  const [copyStatus, setCopyStatus] = useState<"idle" | "ok" | "fail">("idle");
  const portfolio = useMemo(() => optimizePortfolio(ticketCount, seed), [ticketCount, seed]);
  const odds = calculatePortfolioOdds(portfolio);
  const benchmarkRows = useMemo(() => computeExactBenchmark(benchmarkTicketCounts(ticketCount)), [ticketCount]);

  const setTicketCountClamped = (value: number) => {
    setTicketCount(Math.max(1, Math.min(30, value)));
  };

  const handleCopyTickets = async () => {
    try {
      await copyTickets(portfolio, (text) => navigator.clipboard.writeText(text));
      setCopyStatus("ok");
    } catch {
      setCopyStatus("fail");
    }
  };

  const refreshSeed = () => {
    const cryptoSource = (globalThis as typeof globalThis & { crypto?: Crypto }).crypto;
    if (typeof cryptoSource?.getRandomValues === "function") {
      setSeed(cryptoSource.getRandomValues(new Uint32Array(1))[0]);
      return;
    }
    setSeed((current) => current + 1);
  };

  return <section className="portfolio-lab">
    <div className="portfolio-hero">
      <div><p className="eyebrow">Coverage Optimizer · giải 4–6 số</p><h1>Tăng độ phủ, không đoán số.</h1><p>Mỗi cặp vé chỉ trùng tối đa một số. Vì vậy hai vé không thể cùng chiếm một kết quả trúng từ 4 số trở lên; xác suất “ít nhất một vé đạt giải lớn” được phủ không chồng lấn.</p></div>
      <div className="proof-badge"><ShieldCheck /><strong>Pairwise ≤ 1</strong><span>Kiểm tra trên toàn bộ portfolio</span></div>
    </div>

    <section className="analysis-card budget-card">
      <div className="section-heading"><div><p className="eyebrow">Ngân sách một kỳ</p><h2>{ticketCount} vé · {formatVnd(odds.cost)}</h2></div><Button variant="outline" onClick={refreshSeed}><RefreshCw /> Bộ khác</Button></div>
      <label htmlFor="ticket-count">{ticketCount} vé đang chọn · có thể điều chỉnh từ 1–30 vé</label>
      <div
        role="group"
        aria-label="Điều chỉnh số vé"
        style={{ display: "flex", alignItems: "center", gap: "0.6rem", margin: "0.4rem 0 0.8rem" }}
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setTicketCountClamped(ticketCount - 1)}
          disabled={ticketCount <= 1}
          aria-label="Giảm 1 vé"
        >
          <Minus />
        </Button>
        <output id="ticket-count" aria-live="polite" style={{ minWidth: "2.5rem", textAlign: "center", fontWeight: 600 }}>
          {ticketCount}
        </output>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setTicketCountClamped(ticketCount + 1)}
          disabled={ticketCount >= 30}
          aria-label="Tăng 1 vé"
        >
          <Plus />
        </Button>
      </div>
      <Slider
        id="ticket-count-slider"
        min={1}
        max={30}
        step={1}
        value={[ticketCount]}
        onValueChange={value => setTicketCountClamped(value[0] ?? ticketCount)}
        aria-label="Số vé trong portfolio"
      />
      <div className="portfolio-metrics">
        <div><span>Ít nhất 4 số</span><strong>{percent(odds.exactProbabilityAtLeast4)}</strong><small>{oneIn(odds.exactProbabilityAtLeast4)}</small></div>
        <div><span>Ít nhất 5 số</span><strong>{percent(odds.exactProbabilityAtLeast5)}</strong><small>{oneIn(odds.exactProbabilityAtLeast5)}</small></div>
        <div><span>Jackpot</span><strong>{percent(odds.exactProbabilityJackpot)}</strong><small>{oneIn(odds.exactProbabilityJackpot)}</small></div>
        <div><span>Cặp số được phủ</span><strong>{countCoveredPairs(portfolio).toLocaleString("vi-VN")}</strong><small>15 cặp/vé, không lặp</small></div>
      </div>
    </section>

    <section className="analysis-card exact-benchmark-card" aria-labelledby="exact-benchmark-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">So sánh chính xác (không mô phỏng)</p>
          <h2 id="exact-benchmark-heading">Projective vs Random độc lập — cùng số vé</h2>
        </div>
        <TrendingUp aria-hidden="true" />
      </div>
      <p className="table-hint" id="exact-benchmark-table-note">
        Cả hai cột đều là xác suất chính xác (đóng công thức, không Monte Carlo). Bảng có thể cuộn ngang trên màn hình nhỏ.
      </p>
      <div className="table-wrap" tabIndex={0} aria-describedby="exact-benchmark-table-note">
        <Table>
          <TableCaption>
            Mỗi hàng so sánh CÙNG số vé N giữa portfolio projective (pairwise giao ≤ 1) và N vé ngẫu nhiên độc lập.
            Lift = projective − random, tính theo điểm phần trăm tuyệt đối (đpt) và phần trăm tương đối.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>N vé</TableHead>
              <TableHead>Projective (≥4 · ≥5 · Jackpot)</TableHead>
              <TableHead>Random độc lập (≥4 · ≥5 · Jackpot)</TableHead>
              <TableHead>Lift ≥4</TableHead>
              <TableHead>Lift ≥5</TableHead>
              <TableHead>Lift Jackpot</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {benchmarkRows.map((row) => (
              <TableRow key={row.ticketCount} aria-current={row.ticketCount === ticketCount ? "true" : undefined}>
                <TableCell>{row.ticketCount}{row.ticketCount === ticketCount ? " (đang chọn)" : ""}</TableCell>
                <TableCell>
                  {percent(row.projective.probAtLeast4)} · {percent(row.projective.probAtLeast5)} ·{" "}
                  {percent(row.projective.probJackpot)}
                </TableCell>
                <TableCell>
                  {percent(row.independentRandom.probAtLeast4)} · {percent(row.independentRandom.probAtLeast5)} ·{" "}
                  {percent(row.independentRandom.probJackpot)}
                </TableCell>
                <TableCell>{liftText(row.liftAtLeast4)}</TableCell>
                <TableCell>{liftText(row.liftAtLeast5)}</TableCell>
                <TableCell>{liftText(row.liftJackpot)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="method-note">
        <ShieldCheck aria-hidden="true" />
        <span>{EXACT_BENCHMARK_CAVEAT}</span>
      </p>
    </section>

    <section className="analysis-card">
      <div className="section-heading"><div><p className="eyebrow">Bộ vé đã tối ưu</p><h2>{ticketCount} vé không chồng vùng giải lớn</h2></div><Button variant="outline" onClick={handleCopyTickets}><Copy /> Sao chép</Button></div>
      <p className="sr-only" aria-live="polite">
        {copyStatus === "ok" ? "Đã sao chép danh sách vé." : copyStatus === "fail" ? "Không sao chép được. Hãy chọn và copy thủ công." : ""}
      </p>
      {copyStatus === "ok" ? <p className="suggestion-warning" role="status">Đã sao chép danh sách vé vào clipboard.</p> : null}
      {copyStatus === "fail" ? <p className="suggestion-warning" role="alert">Clipboard bị từ chối — hãy chọn văn bản trên màn hình và copy thủ công.</p> : null}
      <div className="portfolio-tickets">{portfolio.map((ticket, index) => <div className="portfolio-ticket" key={index}><span>Vé {String(index + 1).padStart(2, "0")}</span><div>{ticket.map(number => <b key={number}>{formatBall(number)}</b>)}</div></div>)}</div>
    </section>

    <section className="portfolio-explain">
      <h2>Thuật toán này cải thiện điều gì?</h2>
      <p>Với một vé, xác suất giữ nguyên. Với nhiều vé, thiết kế tổ hợp loại bỏ việc hai vé chia sẻ cùng một cặp số; các vùng kết quả trùng ≥4 số không giao nhau và đạt độ phủ tuyến tính tối đa trong giới hạn 30 vé.</p>
      <p>Nó tốt hơn mua lặp một bộ số hoặc các vé quá giống nhau. So với nhiều vé ngẫu nhiên vốn đã ít chồng lấn, mức cải thiện có thể nhỏ. Chi phí tăng đúng theo số vé và kỳ vọng tài chính của mỗi vé không đổi.</p>
    </section>

    <CostFrontierPanel />
  </section>;
}
