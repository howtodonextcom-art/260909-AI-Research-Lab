"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FlaskConical, Hourglass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STRATEGIES, type DrawRecord } from "@/lib/analytics";
import type { ExperimentFamilySummary } from "@/lib/research/experiments";
import type { ProtocolLock } from "@/lib/research/protocol";
import { parseProspectiveSummary, type ProspectiveSummary } from "@/lib/research/prospective-summary";
import { runControlsSummary } from "@/lib/research/controls-summary";

type FetchState = "loading" | "ok" | "missing";

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("vi-VN");
}

/**
 * Experiment / prospective scorecard panel (blueprint G2): read-only
 * provenance for the current protocol lock + experiment family (already
 * fetched by the caller — `ResearchLab` — from `public/data/*.json`, the
 * exact pattern `components/data-status.tsx` uses) plus the prospective
 * scorecard summary exported by `scripts/export-prospective-summary.ts` to
 * `public/data/prospective-summary.json`.
 *
 * Strictly read-only: no controls to freeze or append predictions from the
 * UI. Those stay CLI-only (`npm run research:prospective-freeze` /
 * `-append`) so this panel cannot become a second, UI-driven path around the
 * anti-peeking guarantees `lib/research/prospective.ts` enforces.
 */
export function ExperimentScorecard({
  protocolLock,
  familySummary,
  draws,
}: {
  protocolLock: ProtocolLock | null;
  familySummary: ExperimentFamilySummary | null;
  /** Optional: when provided, also renders a compact A–F negative-control summary (S1's `controls-summary.ts`). */
  draws?: DrawRecord[];
}) {
  const [summary, setSummary] = useState<ProspectiveSummary | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>("loading");
  const controls = useMemo(() => (draws ? runControlsSummary(draws) : null), [draws]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/data/prospective-summary.json")
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseProspectiveSummary(raw);
        setSummary(parsed);
        setFetchState(parsed ? "ok" : "missing");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="analysis-card scorecard-card" aria-labelledby="scorecard-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sổ điểm thực nghiệm</p>
          <h2 id="scorecard-heading">Protocol · registry · prospective scorecard</h2>
        </div>
        <FlaskConical aria-hidden="true" />
      </div>

      {protocolLock ? (
        <dl className="data-status-grid scorecard-provenance">
          <div>
            <dt>Phiên bản protocol</dt>
            <dd>{protocolLock.protocolVersion}</dd>
          </div>
          <div>
            <dt>Protocol hash</dt>
            <dd>{protocolLock.protocolHash.slice(0, 16)}…</dd>
          </div>
          <div>
            <dt>Khóa lúc</dt>
            <dd>{formatTimestamp(protocolLock.protocolLockedAt)}</dd>
          </div>
          <div>
            <dt>Prospective từ kỳ</dt>
            <dd>{protocolLock.prospectiveStartDrawId ? `#${protocolLock.prospectiveStartDrawId}` : "—"}</dd>
          </div>
          <div>
            <dt>Family registry</dt>
            <dd>{familySummary?.familyId ?? "—"}</dd>
          </div>
          <div>
            <dt>Số giả thuyết / số lần nhìn</dt>
            <dd>{familySummary ? `${familySummary.hypothesisCount} / ${familySummary.lookCount}` : "—"}</dd>
          </div>
        </dl>
      ) : (
        <p className="table-hint" role="status">
          Đang tải protocol lock…
        </p>
      )}

      {controls ? (
        <div className="controls-summary-list" role="list" aria-label="Kiểm định đối chứng A đến F">
          <p className="table-hint">
            Kiểm định đối chứng (negative controls) — mô tả, không phải cổng quyết định. n={controls.drawCount} kỳ
            thật.
          </p>
          {controls.items.map((item) => (
            <div key={item.id} role="listitem" className="controls-summary-item">
              <span className="controls-summary-title">{item.title}</span>
              <Badge
                variant="outline"
                className={
                  "verdict " +
                  (item.status === "PASS"
                    ? "verdict-verified"
                    : item.status === "ĐÁNG CHÚ Ý"
                      ? "verdict-promising"
                      : "verdict-no_edge")
                }
              >
                {item.status}
              </Badge>
              <small>
                {item.keyNumberLabel}: {item.keyNumber.toFixed(3)} — {item.note}
              </small>
            </div>
          ))}
        </div>
      ) : null}

      {fetchState === "loading" ? (
        <p className="table-hint" role="status">
          Đang tải sổ điểm prospective…
        </p>
      ) : fetchState === "missing" ? (
        <p className="method-note">
          <AlertTriangle aria-hidden="true" />
          <span>
            Chưa đọc được <code>public/data/prospective-summary.json</code>. Chạy{" "}
            <code>npm run research:prospective-summary</code> để xuất lại từ{" "}
            <code>reports/prospective-scorecard.jsonl</code>. Đây là dữ liệu tường thuật, không phải lỗi ứng dụng.
          </span>
        </p>
      ) : summary && summary.totalFrozen > 0 ? (
        <>
          <p id="scorecard-table-note" className="table-hint">
            {summary.pendingCount} đang chờ kết quả thật (PENDING) · {summary.scoredCount} đã chấm điểm (SCORED). Xuất
            lúc {formatTimestamp(summary.generatedAt)}. Bảng rộng có thể cuộn ngang trên màn hình nhỏ.
          </p>
          <div className="table-wrap" tabIndex={0} aria-describedby="scorecard-table-note">
            <Table>
              <TableCaption>
                Dự đoán đã đóng băng trước khi biết kết quả thật (§27) — mỗi dòng là một chiến lược cho một kỳ.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Kỳ</TableHead>
                  <TableHead>Chiến lược</TableHead>
                  <TableHead>Đóng băng lúc</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Kết quả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.entries.map((entry) => (
                  <TableRow key={`${entry.drawId}-${entry.strategyId}`}>
                    <TableCell>#{entry.drawId}</TableCell>
                    <TableCell>{STRATEGIES[entry.strategyId]?.name ?? entry.strategyId}</TableCell>
                    <TableCell>{formatTimestamp(entry.frozenAt)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={"verdict " + (entry.status === "SCORED" ? "verdict-verified" : "verdict-promising")}
                      >
                        {entry.status === "SCORED" ? "SCORED" : <><Hourglass aria-hidden="true" /> PENDING</>}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.status === "SCORED" ? `${entry.matches}/6 · ${entry.tier}` : "chưa có kết quả thật"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <p className="table-hint" role="status">
          Chưa có dữ liệu prospective — chưa kỳ nào đạt mốc{" "}
          {protocolLock?.prospectiveStartDrawId ? `#${protocolLock.prospectiveStartDrawId}` : "prospective"}. Đây là
          trạng thái bình thường, không phải lỗi.
        </p>
      )}
    </section>
  );
}
