"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { baoCost, costCoverageFrontier } from "@/lib/research/bao";
import { formatVnd } from "@/lib/mega645";

// Same defaults as `scripts/bao-frontier.ts` (npm run research:bao-frontier) so
// the UI panel and the CLI never drift apart on which budgets get compared.
const FRONTIER_BUDGETS = [100_000, 200_000, 300_000, 1_000_000, baoCost(18)];

function pct(value: number): string {
  return value.toExponential(3);
}

/**
 * Cost / coverage frontier panel (blueprint B5 / B8-5): renders the same
 * bao-n vs projective vs random comparison as `scripts/bao-frontier.ts`, at
 * matched budgets, so it is never read as "cheaper wins" — the caveat string
 * already baked into `costCoverageFrontier` (not re-authored here) is shown
 * as visible body text, unconditionally.
 */
export function CostFrontierPanel() {
  const rows = useMemo(() => costCoverageFrontier(FRONTIER_BUDGETS), []);
  const caveat = rows[0]?.caveat ?? "";

  return (
    <section className="analysis-card cost-frontier-card" aria-labelledby="cost-frontier-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">So sánh cùng ngân sách</p>
          <h2 id="cost-frontier-heading">Đường biên chi phí / độ phủ: bao vs projective vs random</h2>
        </div>
        <Badge variant="outline">Ngân sách khớp nhau</Badge>
      </div>
      <p id="cost-frontier-table-note" className="table-hint">
        Bảng rộng có thể cuộn ngang trên màn hình nhỏ.
      </p>
      <div className="table-wrap" tabIndex={0} aria-describedby="cost-frontier-table-note">
        <Table>
          <TableCaption>
            Mỗi hàng dùng CÙNG một ngân sách cho cả ba cách chọn vé — so sánh chỉ công bằng theo từng hàng, không so
            sánh chéo hàng.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Ngân sách</TableHead>
              <TableHead>Bao-n (vé · chi phí · P jackpot)</TableHead>
              <TableHead>Projective (vé · P≥4 · P≥5 · P jackpot)</TableHead>
              <TableHead>Random cùng n (P jackpot, ước lượng)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.budget}>
                <TableCell>{formatVnd(row.budget)}</TableCell>
                <TableCell>
                  bao-{row.bao.poolSize}: {row.bao.tickets.toLocaleString("vi-VN")} vé · {formatVnd(row.bao.cost)} · P=
                  {pct(row.bao.jackpotProbability)}
                </TableCell>
                <TableCell>
                  {row.projective.tickets} vé{row.projective.cappedAt30 ? " (đã giới hạn 30 — §30/§31)" : ""} ·{" "}
                  {formatVnd(row.projective.cost)}
                  {row.projective.odds ? (
                    <>
                      {" "}
                      · P≥4={pct(row.projective.odds.exactProbabilityAtLeast4)} · P≥5=
                      {pct(row.projective.odds.exactProbabilityAtLeast5)} · P jackpot=
                      {pct(row.projective.odds.exactProbabilityJackpot)}
                    </>
                  ) : (
                    " · —"
                  )}
                </TableCell>
                <TableCell>
                  {row.randomSameN.ticketCount} vé · P≈{pct(row.randomSameN.approxProbabilityJackpot)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="method-note">
        <Info aria-hidden="true" />
        <span>{caveat}</span>
      </p>
    </section>
  );
}
