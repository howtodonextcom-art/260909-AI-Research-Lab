"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { outcomes, profitLedger, fixedPrizeExpectation } from "@/lib/profit";
import { formatVnd } from "@/lib/mega645";

export function ProfitLab() {
  const [losses, setLosses] = useState("0");
  const valid = /^\d+$/.test(losses) && Number(losses) <= 10000;
  const ledger = valid ? profitLedger(Number(losses), 30000) : null;
  return <section className="analysis-card profit-lab">
    <p className="eyebrow">Mục tiêu lãi ròng 20.000đ</p>
    <h2>10.000đ mua vé → 30.000đ tiền thưởng → 20.000đ lãi</h2>
    <p>Một bộ gồm 6 số khác nhau, không phải 6 cặp số. Trúng đúng 3 số được 30.000đ. Đây là lãi của một vé, chưa trừ các vé đã trượt.</p>
    <label htmlFor="lost-tickets">Số vé mất trắng trước lần trúng 30.000đ</label>
    <Input id="lost-tickets" value={losses} inputMode="numeric" aria-invalid={!valid}
      onChange={event => setLosses(event.target.value)} className="profit-input" />
    {!ledger ? <p role="alert">Nhập số nguyên từ 0 đến 10.000.</p> : <div className="profit-metrics" aria-live="polite">
      <div>Tổng đã chi<strong>{formatVnd(ledger.cost)}</strong></div>
      <div>Thực lãi/lỗ<strong>{formatVnd(ledger.net)}</strong></div>
      <div>Tiền thưởng cần để lãi 20k<strong>{formatVnd(ledger.requiredFor20k)}</strong></div>
    </div>}
    <p><strong>Xác suất trùng đúng 3 số: {(outcomes[3].probability * 100).toFixed(4)}%</strong> (khoảng 1/{(1 / outcomes[3].probability).toFixed(2)}).
      Xác suất trúng ít nhất 3 số: {(outcomes.slice(3).reduce((sum, x) => sum + x.probability, 0) * 100).toFixed(4)}%.</p>
    <p>Giả định quay công bằng: P(k) = C(6,k) × C(39,6−k) / C(45,6).
      Kỳ vọng tiền thưởng cố định 3–5 số: {formatVnd(fixedPrizeExpectation())}/vé.
      Chưa gồm Jackpot, chia giải hoặc thuế; không phải lợi nhuận kỳ vọng đầy đủ.</p>
    <p>Hai vé trượt rồi một vé trúng 30k = hòa vốn. Ba vé trượt rồi một vé trúng 30k = lỗ 10k.
      Nếu vốn chỉ có đúng 10k, trượt vé đầu là hết vốn; mua tiếp cần tiền mới.</p>
    <p><a href="https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/645.html">Cơ cấu giải Vietlott</a>
      {" · "}<a href="https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.hypergeom.html">Công thức phân phối siêu bội</a></p>
  </section>;
}
