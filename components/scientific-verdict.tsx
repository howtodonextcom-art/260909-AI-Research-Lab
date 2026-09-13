"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MEGA_645 } from "@/lib/mega645";
import type { ProtocolLock } from "@/lib/research/protocol";
import { parseProspectiveSummary, type ProspectiveSummary } from "@/lib/research/prospective-summary";
import { parseBao18Summary, type Bao18Summary } from "@/lib/research/bao18-summary";

type FetchState = "loading" | "ok" | "missing";

/**
 * Executive Scientific Verdict panel: the FIRST substantive scientific
 * content in the Research tab, on purpose — a beginner-readable summary in
 * plain Vietnamese, before any HAC/Holm/protocol-hash jargon further down
 * (`DataStatus`, the walk-forward/holdout tables). It must never imply a
 * predictive edge exists; every fact rendered here is read from data the app
 * already fetches (or fetches here) from `public/data/*.json` — nothing is
 * computed or asserted client-side beyond formatting.
 *
 * Read-only: no controls, no calls to action, no "buy this" framing. If the
 * underlying data isn't ready yet, this renders an honest loading/fallback
 * state rather than a stale or invented number.
 */
export function ScientificVerdict({ protocolLock }: { protocolLock: ProtocolLock | null }) {
  const [prospective, setProspective] = useState<ProspectiveSummary | null>(null);
  const [prospectiveState, setProspectiveState] = useState<FetchState>("loading");
  const [bao18, setBao18] = useState<Bao18Summary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/data/prospective-summary.json")
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseProspectiveSummary(raw);
        setProspective(parsed);
        setProspectiveState(parsed ? "ok" : "missing");
      });
    void fetch("/data/bao18-summary.json")
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        setBao18(parseBao18Summary(raw));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const jackpotFraction = `1 / ${MEGA_645.totalCombinations.toLocaleString("vi-VN")}`;

  return (
    <section className="analysis-card scientific-verdict-card" aria-labelledby="scientific-verdict-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Tóm tắt cho người mới bắt đầu</p>
          <h2 id="scientific-verdict-heading">Kết luận khoa học hiện tại</h2>
        </div>
        <Badge variant="outline" className="verdict verdict-no_edge">
          Grade C — Chưa có bằng chứng
        </Badge>
      </div>

      <dl className="verdict-fact-grid">
        <div>
          <dt>Lợi thế dự đoán</dt>
          <dd>CHƯA CHỨNG MINH</dd>
          <small>
            Không có chiến lược nào trong dự án này (kể cả các chiến lược nâng cao như Bao-18) cho thấy lợi thế dự
            đoán được xác nhận trên dữ liệu chưa từng dùng để chọn.
          </small>
        </div>
        <div>
          <dt>Xác suất trúng Jackpot mỗi vé</dt>
          <dd>{jackpotFraction}</dd>
          <small>Không đổi dù bạn chọn số nóng, số lạnh, số lâu chưa ra, hay bất kỳ chiến lược nào khác.</small>
        </div>
        <div>
          <dt>Lợi thế cấu trúc danh mục (Portfolio)</dt>
          <dd>CÓ — nhỏ nhưng chính xác</dd>
          <small>
            Toán tổ hợp/xác suất trong tab <strong>Portfolio 4+</strong> là phép tính chính xác (không mô phỏng),
            nhưng mức tăng thực tế so với chọn ngẫu nhiên cùng ngân sách là NHỎ — xem con số lift chính xác trong tab
            Portfolio. Đây là lợi thế về độ phủ tổ hợp, không phải dự đoán số nào sẽ ra, và không làm tăng xác suất
            Jackpot của từng vé.
          </small>
        </div>
        <div>
          <dt>Bằng chứng prospective (kỳ thật, đã đóng băng trước khi biết kết quả)</dt>
          <dd>
            {prospectiveState === "loading"
              ? "Đang tải…"
              : `${prospective?.pendingCount ?? 0} đang chờ · ${prospective?.scoredCount ?? 0} đã chấm điểm`}
          </dd>
          <small>
            Đây là loại bằng chứng mạnh nhất chống lại nhìn trước (peeking) — càng nhiều kỳ SCORED, càng đáng tin,
            nhưng hiện vẫn còn rất ít. Tính từ kỳ{" "}
            {protocolLock?.prospectiveStartDrawId ? `#${protocolLock.prospectiveStartDrawId}` : "—"} (protocol{" "}
            {protocolLock?.protocolVersion ?? "—"}).
          </small>
        </div>
        <div>
          <dt>Khuyến nghị hiện tại</dt>
          <dd>Không có chiến lược nào được khuyến nghị</dd>
          <small>Toàn bộ nội dung dưới đây chỉ để khảo sát và học thống kê, không phải lời khuyên mua vé.</small>
        </div>
      </dl>

      {bao18 ? (
        <p className="method-note">
          <ShieldCheck aria-hidden="true" />
          <span>
            Kiểm định bổ sung Bao-18 (18 số, walk-forward hợp lệ) cũng cho kết luận <strong>{bao18.finalVerdict}</strong>{" "}
            — hạng khoa học <strong>{bao18.scientificGrade}</strong>. Xem panel &quot;Bao-18 reverse-proof&quot; bên
            dưới để biết chi tiết theo từng luật chọn số.
          </span>
        </p>
      ) : (
        <p className="method-note">
          <AlertTriangle aria-hidden="true" />
          <span>Đang tải kết luận kiểm định Bao-18…</span>
        </p>
      )}

      <a className="scientific-verdict-capability-link" href="#capability-inspector">
        Xem đầy đủ năng lực hệ thống (kể cả các phần chỉ chạy qua CLI) ↓
      </a>
    </section>
  );
}
