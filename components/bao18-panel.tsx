"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, FlaskConical, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseBao18Summary, type Bao18Summary } from "@/lib/research/bao18-summary";

type FetchState = "loading" | "ok" | "missing";

const RULE_LABELS: Record<string, string> = {
  RANDOM18: "RANDOM18 (đối chứng ngẫu nhiên)",
  HOT18: "HOT18",
  COLD18: "COLD18",
  OVERDUE18: "OVERDUE18",
  BALANCED18: "BALANCED18",
};

function pct(value: number): string {
  return (value * 100).toFixed(3) + "%";
}

function formatP(value: number | null): string {
  if (value == null) return "—";
  return value < 0.001 ? "<0.001" : value.toFixed(3);
}

/**
 * Bao-18 reverse-proof read-only panel (Master Prompt v2.0 exposure): fetches
 * the compact `public/data/bao18-summary.json` published by
 * `scripts/export-bao18-summary.ts` and renders it, following the exact
 * client-fetch-and-render pattern `components/experiment-scorecard.tsx`
 * already established for the prospective scorecard.
 *
 * Strictly read-only and strictly NOT a ticket-purchase surface: this panel
 * never lists the actual 18 pool numbers for any rule, has no call-to-action,
 * and its single job is to make the difference between the tautological
 * Protocol A (reverse peek) and the valid Protocol B (walk-forward) as
 * unmissable as possible.
 */
export function Bao18Panel() {
  const [summary, setSummary] = useState<Bao18Summary | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>("loading");

  useEffect(() => {
    let cancelled = false;
    void fetch("/data/bao18-summary.json")
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseBao18Summary(raw);
        setSummary(parsed);
        setFetchState(parsed ? "ok" : "missing");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="analysis-card bao18-panel-card" aria-labelledby="bao18-panel-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Kiểm định bổ sung · Bao-18</p>
          <h2 id="bao18-panel-heading">Bao-18 reverse-proof: reverse-peek vs walk-forward hợp lệ</h2>
        </div>
        <FlaskConical aria-hidden="true" />
      </div>

      <p className="bao18-takeaway">
        <ShieldAlert aria-hidden="true" />
        <span>
          <strong>
            Reverse-peek có thể trông hoàn hảo vì nó rò rỉ đáp án. Walk-forward hợp lệ hiện chưa cho thấy edge dự đoán nào được chứng minh.
          </strong>
        </span>
      </p>

      {fetchState === "loading" ? (
        <p className="table-hint" role="status">
          Đang tải kết quả kiểm định Bao-18…
        </p>
      ) : fetchState === "missing" || !summary ? (
        <p className="method-note">
          <AlertTriangle aria-hidden="true" />
          <span>
            Chưa đọc được <code>public/data/bao18-summary.json</code>. Chạy <code>npm run research:bao18-audit</code>{" "}
            rồi <code>npm run research:bao18-summary</code> để xuất lại. Đây là dữ liệu tường thuật, không phải lỗi
            ứng dụng.
          </span>
        </p>
      ) : (
        <>
          <div className="bao18-protocol-block bao18-protocol-a">
            <div className="section-heading">
              <h3>Protocol A — Reverse Peek (control âm tính, cố ý rò rỉ)</h3>
              <Badge variant="outline" className="verdict bao18-invalid-badge">
                INVALID_AS_EVIDENCE_OF_EDGE
              </Badge>
            </div>
            {summary.protocolA ? (
              <p className="method-note">
                <span>
                  Đánh giá trên {summary.protocolA.evaluatedDraws.toLocaleString("vi-VN")} kỳ, tỉ lệ trúng 6/6 ={" "}
                  <strong>{pct(summary.protocolA.hit6Rate)}</strong> (mã gốc trong báo cáo: {summary.protocolA.sourceVerdict}
                  ). Đây là một control âm tính CỐ Ý: pool được xây từ chính kết quả thật của kỳ đó, nên PHẢI trúng
                  100% theo định nghĩa — nó chỉ dùng để chứng minh bộ kiểm định có khả năng phát hiện rò rỉ, tuyệt đối
                  không phải một phương pháp dự đoán.
                </span>
              </p>
            ) : (
              <p className="table-hint">Không có dữ liệu Protocol A trong báo cáo nguồn.</p>
            )}
          </div>

          <div className="bao18-protocol-block bao18-protocol-b">
            <div className="section-heading">
              <h3>Protocol B — Walk-forward hợp lệ (chỉ dùng dữ liệu quá khứ)</h3>
              <Badge variant="outline">
                {summary.protocolB.evaluatedCount ? `${summary.protocolB.evaluatedCount.toLocaleString("vi-VN")} kỳ` : "—"}
              </Badge>
            </div>
            <p id="bao18-table-note" className="table-hint">
              Bảng rộng có thể cuộn ngang trên màn hình nhỏ.
            </p>
            <div className="table-wrap" tabIndex={0} aria-describedby="bao18-table-note">
              <Table>
                <TableCaption>
                  Mỗi hàng là một luật chọn 18 số, đánh giá walk-forward (pool tại kỳ t chỉ dùng dữ liệu trước kỳ t).
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Luật</TableHead>
                    <TableHead>n</TableHead>
                    <TableHead>Hit 6/6</TableHead>
                    <TableHead>Kỳ vọng null</TableHead>
                    <TableHead>Raw p</TableHead>
                    <TableHead>Holm-adj p</TableHead>
                    <TableHead>TB số trùng (K)</TableHead>
                    <TableHead>≥4 số</TableHead>
                    <TableHead>≥5 số</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.protocolB.rules.map((row) => (
                    <TableRow key={row.rule}>
                      <TableCell>{RULE_LABELS[row.rule] ?? row.rule}</TableCell>
                      <TableCell>{row.n.toLocaleString("vi-VN")}</TableCell>
                      <TableCell>
                        {row.hit6Count} ({pct(row.hit6Rate)})
                      </TableCell>
                      <TableCell>{row.expectedNullHits.toFixed(2)}</TableCell>
                      <TableCell>{formatP(row.rawPValue)}</TableCell>
                      <TableCell>{formatP(row.adjustedPValue)}</TableCell>
                      <TableCell>{row.meanIntersection.toFixed(3)}</TableCell>
                      <TableCell>{pct(row.hit4PlusRate)}</TableCell>
                      <TableCell>{pct(row.hit5PlusRate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="bao18-verdict-list" role="list" aria-label="Kết luận từng luật">
              {summary.protocolB.rules
                .filter((row) => !row.isBaseline)
                .map((row) => (
                  <div key={row.rule} role="listitem" className="controls-summary-item">
                    <span className="controls-summary-title">{RULE_LABELS[row.rule] ?? row.rule}</span>
                    <Badge
                      variant="outline"
                      className={"verdict " + (row.verdict === "NO_EDGE" ? "verdict-no_edge" : "verdict-promising")}
                    >
                      {row.verdict ?? "CHƯA CÓ KẾT LUẬN"}
                    </Badge>
                    {row.reasons.length > 0 ? <small>{row.reasons.join("; ")}</small> : null}
                  </div>
                ))}
            </div>

            {summary.nullCalibration ? (
              <p className="method-note">
                <AlertTriangle aria-hidden="true" />
                <span>
                  Cảnh báo hiệu năng thống kê: kỳ vọng số lần trúng 6/6 theo null lý thuyết chỉ là{" "}
                  {summary.nullCalibration.nullExpectedCount.toFixed(2)}
                  {summary.nullCalibration.nullPredictiveInterval95
                    ? ` (khoảng dự đoán 95%: ${summary.nullCalibration.nullPredictiveInterval95[0]}–${summary.nullCalibration.nullPredictiveInterval95[1]})`
                    : ""}
                  {" "}— con số quá nhỏ để phân biệt một lợi thế vừa phải với nhiễu ngẫu nhiên. Kết luận NO_EDGE hôm
                  nay phản ánh &quot;chưa quan sát được lợi thế&quot;, không phải &quot;đã chứng minh không có lợi
                  thế nào tồn tại&quot;.
                </span>
              </p>
            ) : null}

            <p className="method-note">
              <FlaskConical aria-hidden="true" />
              <span>
                Kết luận tổng quát: <strong>{summary.finalVerdict}</strong> — hạng khoa học:{" "}
                <strong>{summary.scientificGrade}</strong>. Nguồn: <code>reports/{summary.sourceReportFile}</code>.
              </span>
            </p>
          </div>
        </>
      )}
    </section>
  );
}
