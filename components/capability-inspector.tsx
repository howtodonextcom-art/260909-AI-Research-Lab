"use client";

import { Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ExperimentFamilySummary } from "@/lib/research/experiments";
import type { ProtocolLock } from "@/lib/research/protocol";

type CapabilityStatus = "END_TO_END" | "READ_ONLY" | "OPERATOR_GATED" | "STUB_NOT_PROMOTED";

const STATUS_LABEL: Record<CapabilityStatus, string> = {
  END_TO_END: "End-to-end",
  READ_ONLY: "Chỉ đọc (read-only)",
  OPERATOR_GATED: "CLI-only, người vận hành chạy tay",
  STUB_NOT_PROMOTED: "Khung thử nghiệm, chưa được phép dùng",
};

const STATUS_CLASS: Record<CapabilityStatus, string> = {
  END_TO_END: "verdict-verified",
  READ_ONLY: "verdict-promising",
  OPERATOR_GATED: "verdict-promising",
  STUB_NOT_PROMOTED: "verdict-no_edge",
};

type CapabilityRow = {
  id: string;
  title: string;
  status: CapabilityStatus;
  note: string;
};

/**
 * Advanced Research / Capability Inspector: a single expandable panel
 * listing EVERY meaningful capability in the system with an honest status
 * label, so nothing stays invisible just because it is CLI-only. This is a
 * static, mostly-textual index — it references numbers already fetched and
 * rendered by `DataStatus`/`ExperimentScorecard` above rather than
 * duplicating those fetches (only `protocolLock`/`familySummary`, already
 * loaded by `ResearchLab`, are accepted as props for that purpose).
 *
 * Never imports `lib/research/ranking-score` (enforced by
 * `app/ui-ranking-score-ban.contract.test.ts` project-wide, and re-checked
 * for this file specifically by `app/ui-scientific-verdict-bao18.contract.test.ts`):
 * this panel only *describes*, in plain text, that the ranking-score
 * scaffold exists and is gated — it never calls or renders its output.
 */
export function CapabilityInspector({
  protocolLock,
  familySummary,
}: {
  protocolLock: ProtocolLock | null;
  familySummary: ExperimentFamilySummary | null;
}) {
  const rows: CapabilityRow[] = [
    {
      id: "protocol-lock",
      title: "Protocol lock (khóa giao thức nghiên cứu)",
      status: "END_TO_END",
      note: protocolLock
        ? `Phiên bản ${protocolLock.protocolVersion}, hash ${protocolLock.protocolHash.slice(0, 12)}… — xem đầy đủ ở "Trạng thái bộ dữ liệu" phía trên.`
        : "Đang tải — xem đầy đủ ở \"Trạng thái bộ dữ liệu\" phía trên.",
    },
    {
      id: "experiment-registry",
      title: "Registry giả thuyết / số lần nhìn dữ liệu (Holm family)",
      status: "READ_ONLY",
      note: familySummary
        ? `${familySummary.hypothesisCount} giả thuyết đã đăng ký, ${familySummary.lookCount} lần nhìn — xem đầy đủ ở "Sổ điểm thực nghiệm" phía trên.`
        : "Xem đầy đủ ở \"Sổ điểm thực nghiệm\" phía trên.",
    },
    {
      id: "prospective-freeze",
      title: "Đóng băng / nhập kết quả prospective",
      status: "OPERATOR_GATED",
      note:
        "Chỉ chạy qua CLI: npm run research:prospective-freeze (đóng băng dự đoán trước khi biết kết quả thật) và " +
        "npm run research:prospective-append (nhập kết quả thật sau đó). Không có nút bấm trên UI cho việc này — " +
        "đây là thiết kế cố ý để giữ nguyên tính chống nhìn trước (anti-peeking), không phải một tính năng còn thiếu.",
    },
    {
      id: "ablation",
      title: "Ablation harness (đóng góp biên của từng chiến lược)",
      status: "OPERATOR_GATED",
      note: "CLI-only, chạy npm run research:ablation. Hiện chưa có báo cáo JSON công khai để hiển thị trên UI.",
    },
    {
      id: "portfolio-monte-carlo",
      title: "Portfolio Monte Carlo (chẩn đoán độ công bằng cho danh mục)",
      status: "OPERATOR_GATED",
      note: "CLI-only, chạy npm run research:portfolio-mc. Kết quả in ra console, chưa xuất JSON tĩnh để hiển thị trên tab Portfolio.",
    },
    {
      id: "ranking-score",
      title: "Ranking Score scaffold (khung xếp hạng thử nghiệm)",
      status: "STUB_NOT_PROMOTED",
      note:
        "Chỉ là khung hợp đồng (contract) cho một lane xếp hạng trong tương lai, KHÔNG phải một bộ dự đoán AI. " +
        "Chưa qua promotion gate, không hiển thị ở UI dự đoán — bị cấm import trong app/ và components/ và có contract " +
        "test bảo vệ điều đó (app/ui-ranking-score-ban.contract.test.ts).",
    },
    {
      id: "bao18-audit",
      title: "Kiểm định Bao-18 reverse-proof (walk-forward)",
      status: "READ_ONLY",
      note: "Xem panel \"Bao-18 reverse-proof\" ngay bên dưới để biết chi tiết Protocol A / Protocol B theo từng luật.",
    },
    {
      id: "negative-controls",
      title: "Kiểm định đối chứng A–F (negative controls)",
      status: "READ_ONLY",
      note: "Đã hiển thị ở \"Sổ điểm thực nghiệm\" phía trên — không lặp lại ở đây.",
    },
    {
      id: "data-provenance",
      title: "Nguồn gốc dữ liệu / SHA-256 bộ dữ liệu",
      status: "END_TO_END",
      note: "Đã hiển thị ở \"Trạng thái bộ dữ liệu\" phía trên — không lặp lại ở đây.",
    },
    {
      id: "provenance-verifier",
      title: "Bộ xác minh nguồn gốc (provenance verifier)",
      status: "OPERATOR_GATED",
      note: "CLI-only verification, xem npm run research:verify-provenance.",
    },
  ];

  return (
    <details className="analysis-card capability-inspector-card" open>
      <summary className="capability-inspector-summary">
        <Layers aria-hidden="true" />
        <span>
          <p className="eyebrow">Nâng cao</p>
          <h2>Bản đồ năng lực hệ thống (Capability Inspector)</h2>
        </span>
      </summary>
      <p className="method-note">
        <span>
          Danh sách đầy đủ mọi năng lực khoa học đã tồn tại trong dự án, kể cả những phần chỉ chạy qua CLI — để không
          có gì &quot;vô hình&quot; chỉ vì chưa có nút bấm trên giao diện. Đây là bảng tra cứu tĩnh, không tính toán
          gì thêm.
        </span>
      </p>
      <div className="capability-list" role="list" aria-label="Danh sách năng lực hệ thống">
        {rows.map((row) => (
          <div key={row.id} role="listitem" className="controls-summary-item capability-row">
            <span className="controls-summary-title">{row.title}</span>
            <Badge variant="outline" className={"verdict " + STATUS_CLASS[row.status]}>
              {STATUS_LABEL[row.status]}
            </Badge>
            <small>{row.note}</small>
          </div>
        ))}
      </div>
    </details>
  );
}
