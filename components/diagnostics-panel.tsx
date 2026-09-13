"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Microscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseAblationSummary, type AblationSummary } from "@/lib/research/ablation-summary";
import { parsePortfolioMcSummary, type PortfolioMcSummaryDoc } from "@/lib/research/portfolio-mc-summary";

type FetchState = "loading" | "ok" | "missing";

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("vi-VN");
}

function formatP(value: number): string {
  return value.toFixed(4);
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Diagnostics panel (GAP-01): read-only browser exposure for the Ablation
 * harness (`lib/research/ablation.ts`) and the same-budget Portfolio Monte
 * Carlo (`lib/research/portfolio-mc.ts`), both fetched as static JSON from
 * `public/data/ablation-summary.json` / `public/data/portfolio-mc-summary.json`
 * — same client-fetch, no-live-computation pattern as
 * `components/experiment-scorecard.tsx`.
 *
 * Both sections are strictly diagnostic and this component must never imply
 * a predictive edge: Ablation only tests Holm-family-size sensitivity
 * (multiple-testing hygiene), and Portfolio-MC only compares same-budget
 * coverage against a SYNTHETIC fair draw, never real draw history. Each
 * section repeats its own `honestNote` from the exported JSON verbatim
 * rather than paraphrasing it, so the caveat cannot drift from the number
 * that produced it.
 *
 * Never imports `lib/research/ranking-score` (project-wide ban, enforced by
 * `app/ui-ranking-score-ban.contract.test.ts` and re-checked for this file by
 * `app/diagnostics-panel.contract.test.ts`).
 */
export function DiagnosticsPanel() {
  const [ablation, setAblation] = useState<AblationSummary | null>(null);
  const [ablationState, setAblationState] = useState<FetchState>("loading");
  const [portfolioMc, setPortfolioMc] = useState<PortfolioMcSummaryDoc | null>(null);
  const [portfolioMcState, setPortfolioMcState] = useState<FetchState>("loading");

  useEffect(() => {
    let cancelled = false;
    void fetch("/data/ablation-summary.json")
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseAblationSummary(raw);
        setAblation(parsed);
        setAblationState(parsed ? "ok" : "missing");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/data/portfolio-mc-summary.json")
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        const parsed = parsePortfolioMcSummary(raw);
        setPortfolioMc(parsed);
        setPortfolioMcState(parsed ? "ok" : "missing");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="analysis-card" aria-labelledby="diagnostics-panel-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Chẩn đoán kỹ thuật</p>
          <h2 id="diagnostics-panel-heading">Ablation &amp; Portfolio Monte Carlo</h2>
        </div>
        <Microscope aria-hidden="true" />
      </div>
      <p className="method-note">
        <span>
          Hai công cụ chẩn đoán bên dưới KHÔNG PHẢI chỉ báo lợi thế dự đoán (predictive edge) — chúng kiểm tra vệ
          sinh thống kê (multiple-testing) và độ công bằng/độ phủ danh mục. Đọc kỹ ghi chú &quot;honestNote&quot; ở
          mỗi phần trước khi diễn giải số liệu.
        </span>
      </p>

      {/* Ablation section */}
      <h3>Ablation harness — độ nhạy kích thước họ Holm-Bonferroni</h3>
      {ablationState === "loading" ? (
        <p className="table-hint" role="status">
          Đang tải kết quả ablation…
        </p>
      ) : ablationState === "missing" || !ablation ? (
        <p className="method-note">
          <AlertTriangle aria-hidden="true" />
          <span>
            Chưa đọc được <code>public/data/ablation-summary.json</code>. Chạy{" "}
            <code>npm run research:ablation-summary</code> để xuất lại. Đây là dữ liệu tường thuật, không phải lỗi
            ứng dụng.
          </span>
        </p>
      ) : (
        <>
          <p id="ablation-table-note" className="table-hint">
            fullFamilySize={ablation.fullFamilySize} · lookback={ablation.lookback} · alpha={ablation.alpha} ·
            n={ablation.datasetRecordCount} kỳ thật · datasetHash {ablation.datasetHash ? `${ablation.datasetHash.slice(0, 12)}…` : "—"}{" "}
            · quyết định luận (deterministic, không RNG) · xuất lúc {formatTimestamp(ablation.generatedAt)}.
          </p>
          <div className="controls-summary-list" role="list" aria-label="Kết quả ablation theo từng chiến lược bị bỏ">
            {ablation.rows.map((row) => (
              <div key={row.removed} role="listitem" className="controls-summary-item">
                <span className="controls-summary-title">Bỏ {row.removed} (family {row.fullFamilySize} → {row.ablatedFamilySize})</span>
                <Badge
                  variant="outline"
                  className={"verdict " + (row.anyNewlySignificant ? "verdict-promising" : "verdict-verified")}
                >
                  {row.anyNewlySignificant ? "CÓ — cảnh báo" : "Không đổi kết luận"}
                </Badge>
                <small>{row.verdict}</small>
              </div>
            ))}
          </div>
          <div className="table-wrap" tabIndex={0} aria-describedby="ablation-table-note">
            <Table>
              <TableCaption>
                adj-p = p-value đã hiệu chỉnh Holm-Bonferroni (gốc → sau khi bỏ baseline). &quot;Mới vượt alpha&quot;
                là tín hiệu rủi ro p-hacking hình thức, không phải bằng chứng ủng hộ chiến lược còn lại.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Bỏ</TableHead>
                  <TableHead>Chiến lược còn lại</TableHead>
                  <TableHead>VAL adj-p (gốc → ablated)</TableHead>
                  <TableHead>TEST adj-p (gốc → ablated)</TableHead>
                  <TableHead>Mới vượt alpha?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ablation.rows.flatMap((row) =>
                  row.deltas.map((delta) => (
                    <TableRow key={`${row.removed}-${delta.strategy}`}>
                      <TableCell>{row.removed}</TableCell>
                      <TableCell>{delta.strategy}</TableCell>
                      <TableCell>
                        {formatP(delta.validation.originalAdjustedPValue)} → {formatP(delta.validation.ablatedAdjustedPValue)}
                      </TableCell>
                      <TableCell>
                        {formatP(delta.test.originalAdjustedPValue)} → {formatP(delta.test.ablatedAdjustedPValue)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            "verdict " +
                            (delta.validation.newlySignificantAfterAblation || delta.test.newlySignificantAfterAblation
                              ? "verdict-promising"
                              : "verdict-no_edge")
                          }
                        >
                          {delta.validation.newlySignificantAfterAblation || delta.test.newlySignificantAfterAblation
                            ? "CÓ"
                            : "không"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          </div>
          <p className="method-note">
            <span>{ablation.honestNote}</span>
          </p>
        </>
      )}

      {/* Portfolio Monte Carlo section */}
      <h3>Portfolio Monte Carlo — chẩn đoán độ công bằng cùng ngân sách</h3>
      {portfolioMcState === "loading" ? (
        <p className="table-hint" role="status">
          Đang tải kết quả Portfolio Monte Carlo…
        </p>
      ) : portfolioMcState === "missing" || !portfolioMc ? (
        <p className="method-note">
          <AlertTriangle aria-hidden="true" />
          <span>
            Chưa đọc được <code>public/data/portfolio-mc-summary.json</code>. Chạy{" "}
            <code>npm run research:portfolio-mc-summary</code> để xuất lại. Đây là dữ liệu tường thuật, không phải
            lỗi ứng dụng.
          </span>
        </p>
      ) : (
        <>
          <p id="portfolio-mc-table-note" className="table-hint">
            {portfolioMc.rows.length} mức ngân sách vé · seed={portfolioMc.rows[0]?.seed ?? "—"} ·
            simulationCount={portfolioMc.rows[0]?.simulationCount ?? "—"} · xuất lúc{" "}
            {formatTimestamp(portfolioMc.generatedAt)}. Kỳ quay là giả lập CÔNG BẰNG tổng hợp, không phải dữ liệu
            thật.
          </p>
          <div className="table-wrap" tabIndex={0} aria-describedby="portfolio-mc-table-note">
            <Table>
              <TableCaption>
                So sánh danh mục projective (`optimizePortfolio`) với n vé ngẫu nhiên độc lập, cùng ngân sách, trên
                cùng giả lập kỳ quay công bằng.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>n vé</TableHead>
                  <TableHead>Proj. mean best</TableHead>
                  <TableHead>Random mean best</TableHead>
                  <TableHead>Δ mean best</TableHead>
                  <TableHead>Proj. hit≥4</TableHead>
                  <TableHead>Random hit≥4</TableHead>
                  <TableHead>Proj. hit≥5</TableHead>
                  <TableHead>Random hit≥5</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfolioMc.rows.map((row) => (
                  <TableRow key={row.ticketCount}>
                    <TableCell>{row.ticketCount}</TableCell>
                    <TableCell>{row.projectiveMeanBestMatch.toFixed(3)}</TableCell>
                    <TableCell>{row.randomMeanBestMatch.toFixed(3)}</TableCell>
                    <TableCell>{row.meanBestMatchDelta >= 0 ? "+" : ""}{row.meanBestMatchDelta.toFixed(4)}</TableCell>
                    <TableCell>{formatPct(row.projectiveHitAtLeast4Rate)}</TableCell>
                    <TableCell>{formatPct(row.randomHitAtLeast4Rate)}</TableCell>
                    <TableCell>{formatPct(row.projectiveHitAtLeast5Rate)}</TableCell>
                    <TableCell>{formatPct(row.randomHitAtLeast5Rate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="method-note">
            <span>{portfolioMc.honestNote}</span>
          </p>
        </>
      )}
    </section>
  );
}
