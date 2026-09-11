"use client";

import { useMemo, useState } from "react";
import { Copy, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { calculatePortfolioOdds, countCoveredPairs, optimizePortfolio } from "@/lib/portfolio";
import { formatBall, formatVnd } from "@/lib/mega645";

function percent(value: number) {
  return `${(value * 100).toFixed(value < 0.0001 ? 5 : 3)}%`;
}

function oneIn(value: number) {
  return `1 / ${(1 / value).toLocaleString("vi-VN", { maximumFractionDigits: 0 })}`;
}

export function PortfolioLab() {
  const [ticketCount, setTicketCount] = useState(10);
  const [seed, setSeed] = useState(645);
  const portfolio = useMemo(() => optimizePortfolio(ticketCount, seed), [ticketCount, seed]);
  const odds = calculatePortfolioOdds(ticketCount);

  const copyTickets = async () => {
    const text = portfolio.map((ticket, index) => `${String(index + 1).padStart(2, "0")}: ${ticket.map(formatBall).join(" ")}`).join("\n");
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // Clipboard permissions can be denied in local previews; the portfolio remains usable on screen.
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
      <label htmlFor="ticket-count">Số vé: {ticketCount}</label>
      <Slider id="ticket-count" min={1} max={30} step={1} value={[ticketCount]} onValueChange={value => setTicketCount(value[0] ?? ticketCount)} aria-label="Số vé trong portfolio" />
      <div className="portfolio-metrics">
        <div><span>Ít nhất 4 số</span><strong>{percent(odds.exactProbabilityAtLeast4)}</strong><small>{oneIn(odds.exactProbabilityAtLeast4)}</small></div>
        <div><span>Ít nhất 5 số</span><strong>{percent(odds.exactProbabilityAtLeast5)}</strong><small>{oneIn(odds.exactProbabilityAtLeast5)}</small></div>
        <div><span>Jackpot</span><strong>{percent(odds.exactProbabilityJackpot)}</strong><small>{oneIn(odds.exactProbabilityJackpot)}</small></div>
        <div><span>Cặp số được phủ</span><strong>{countCoveredPairs(portfolio).toLocaleString("vi-VN")}</strong><small>15 cặp/vé, không lặp</small></div>
      </div>
    </section>

    <section className="analysis-card">
      <div className="section-heading"><div><p className="eyebrow">Bộ vé đã tối ưu</p><h2>{ticketCount} vé không chồng vùng giải lớn</h2></div><Button variant="outline" onClick={copyTickets}><Copy /> Sao chép</Button></div>
      <div className="portfolio-tickets">{portfolio.map((ticket, index) => <div className="portfolio-ticket" key={index}><span>Vé {String(index + 1).padStart(2, "0")}</span><div>{ticket.map(number => <b key={number}>{formatBall(number)}</b>)}</div></div>)}</div>
    </section>

    <section className="portfolio-explain">
      <h2>Thuật toán này cải thiện điều gì?</h2>
      <p>Với một vé, xác suất giữ nguyên. Với nhiều vé, thiết kế tổ hợp loại bỏ việc hai vé chia sẻ cùng một cặp số; các vùng kết quả trùng ≥4 số không giao nhau và đạt độ phủ tuyến tính tối đa trong giới hạn 30 vé.</p>
      <p>Nó tốt hơn mua lặp một bộ số hoặc các vé quá giống nhau. So với nhiều vé ngẫu nhiên vốn đã ít chồng lấn, mức cải thiện có thể nhỏ. Chi phí tăng đúng theo số vé và kỳ vọng tài chính của mỗi vé không đổi.</p>
    </section>
  </section>;
}
