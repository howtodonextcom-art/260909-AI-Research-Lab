"use client";

import { useMemo } from "react";
import { AlertTriangle, Check, CloudDownload, Database, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DrawDataState } from "@/hooks/use-draw-data";
import { analyzeContinuity } from "@/lib/data/continuity";
import { assessFreshness } from "@/lib/data/freshness";
import { CURRENT_PROTOCOL, classifyEvidence, type ProtocolLock } from "@/lib/research/protocol";
import type { ExperimentFamilySummary } from "@/lib/research/experiments";
import { spentAlphaForLook } from "@/lib/research/alpha-spending";
import { EXPECTED_MATCHES, PRIMARY_ENDPOINT } from "@/lib/research/statistics";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("vi-VN");
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "chưa từng";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "chưa từng" : parsed.toLocaleString("vi-VN");
}

/** Status label plus the tone used to colour it. */
function describe(state: DrawDataState): { label: string; tone: "ok" | "busy" | "warn" | "bad" } {
  if (state.loading) return { label: "Đang tải dữ liệu", tone: "busy" };
  if (state.loadError) return { label: "Không đọc được dữ liệu", tone: "bad" };

  switch (state.refresh.kind) {
    case "checking":
      return { label: "Đang kiểm tra", tone: "busy" };
    case "updated":
      return { label: "Có dữ liệu mới", tone: "ok" };
    case "up-to-date":
      return { label: "Không thấy kỳ mới lần này", tone: "ok" };
    case "conflict":
      return { label: "Dữ liệu xung đột", tone: "bad" };
    case "error":
      return { label: "Cập nhật thất bại", tone: "warn" };
    default:
      return state.origin === "cache"
        ? { label: "Đang dùng dữ liệu lưu trên thiết bị", tone: "ok" }
        : { label: "Đã cập nhật", tone: "ok" };
  }
}

function Message({ state }: { state: DrawDataState }) {
  const { refresh } = state;
  if (refresh.kind === "updated") {
    return (
      <p className="data-status-message data-status-ok">
        <Check aria-hidden="true" /> Đã thêm {refresh.added.toLocaleString("vi-VN")} kỳ mới. Tổng cộng{" "}
        {refresh.total.toLocaleString("vi-VN")} kỳ. Dữ liệu mới nhất: {formatDate(refresh.latestDate)}.
      </p>
    );
  }
  if (refresh.kind === "up-to-date") {
    const tip = state.records.at(-1);
    return (
      <p className="data-status-message data-status-ok">
        <Check aria-hidden="true" /> Không thấy kỳ mới hơn trong lần kiểm tra nguồn vừa rồi
        {tip ? (
          <>
            {" "}
            — bộ dữ liệu local hiện tới #{tip.id} ({formatDate(tip.date)}).
          </>
        ) : (
          "."
        )}{" "}
        Đây không phải lời khẳng định tuyệt đối rằng Vietlott sẽ không công bố kỳ mới ngay sau đó.
      </p>
    );
  }
  if (refresh.kind === "conflict") {
    return (
      <p className="data-status-message data-status-bad">
        <AlertTriangle aria-hidden="true" /> Phát hiện {refresh.count} kỳ xung đột. {refresh.message}
      </p>
    );
  }
  if (refresh.kind === "error") {
    return (
      <p className="data-status-message data-status-warn">
        <AlertTriangle aria-hidden="true" /> {refresh.message}
      </p>
    );
  }
  return null;
}

/**
 * Data provenance panel and the manual update control.
 *
 * User snapshots live on this device. Any server cache is only a politeness
 * proxy in front of the official crawl — not a user store and not a source of truth.
 */
export function DataStatus({
  state,
  protocolLock = null,
  familySummary = null,
}: {
  state: DrawDataState;
  protocolLock?: ProtocolLock | null;
  familySummary?: ExperimentFamilySummary | null;
}) {
  const status = describe(state);
  const manifest = state.manifest;
  const latestRecord = state.records.at(-1);
  const continuity = useMemo(() => analyzeContinuity(state.records), [state.records]);
  const freshness = useMemo(
    () => assessFreshness(manifest?.lastSuccessfulSync),
    [manifest?.lastSuccessfulSync],
  );
  const latestEvidence =
    latestRecord && protocolLock ? classifyEvidence(latestRecord.id, protocolLock) : null;

  return (
    <section className="analysis-card data-status-card" aria-labelledby="data-status-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Nguồn dữ liệu</p>
          <h2 id="data-status-heading">Trạng thái bộ dữ liệu</h2>
        </div>
        <div className="data-status-badges">
          <Badge
            variant="outline"
            className={`data-status-badge data-freshness-${freshness.label.toLowerCase()}`}
            title={freshness.detailVi}
          >
            Độ tươi: {freshness.badgeVi}
          </Badge>
          <Badge variant="outline" className={`data-status-badge data-status-${status.tone}`}>
            {status.tone === "busy" ? <Loader2 className="spin" aria-hidden="true" /> : <Database aria-hidden="true" />}
            {status.label}
          </Badge>
        </div>
      </div>

      <p className={`data-freshness-note data-freshness-${freshness.label.toLowerCase()}`} role="status">
        {freshness.detailVi}
      </p>

      <dl className="data-status-grid">
        <div>
          <dt>Độ tươi (Fresh / Delayed / Stale / Unknown)</dt>
          <dd>{freshness.badgeVi}</dd>
        </div>
        <div>
          <dt>Số kỳ hợp lệ</dt>
          <dd>{state.records.length.toLocaleString("vi-VN")}</dd>
        </div>
        <div>
          <dt>Khoảng thời gian</dt>
          <dd>
            {formatDate(state.records[0]?.date)} → {formatDate(latestRecord?.date)}
          </dd>
        </div>
        <div>
          <dt>Kỳ mới nhất</dt>
          <dd>{latestRecord ? `#${latestRecord.id}` : "—"}</dd>
        </div>
        <div>
          <dt>Cập nhật thành công gần nhất</dt>
          <dd>{formatTimestamp(manifest?.lastSuccessfulSync)}</dd>
        </div>
        <div>
          <dt>Nguồn</dt>
          <dd>{manifest ? `${manifest.source.primary.id} (${manifest.source.primary.license})` : "vietlott-official"}</dd>
        </div>
        <div>
          <dt>Đang đọc từ</dt>
          <dd>{state.origin === "cache" ? "bộ nhớ trên thiết bị" : "dữ liệu kèm theo ứng dụng"}</dd>
        </div>
        <div>
          <dt>Tính liên tục dữ liệu</dt>
          <dd>{continuity.continuous ? "Đầy đủ, không thiếu kỳ" : `Thiếu ${continuity.missingIds.length} kỳ, trùng ${continuity.duplicateIds.length}`}</dd>
        </div>
        <div>
          <dt>SHA-256 bộ dữ liệu</dt>
          <dd>{manifest ? `${manifest.datasetSha256.slice(0, 12)}…` : "—"}</dd>
        </div>
        <div>
          <dt>Đối chiếu chéo (mirror)</dt>
          <dd>{manifest?.crossCheck.status ?? "NOT_RUN"}</dd>
        </div>
        <div>
          <dt>Phiên bản giao thức nghiên cứu</dt>
          <dd>{CURRENT_PROTOCOL.version}</dd>
        </div>
        <div>
          <dt>Protocol hash</dt>
          <dd>{protocolLock ? `${protocolLock.protocolHash.slice(0, 12)}…` : "—"}</dd>
        </div>
        <div>
          <dt>Prospective từ kỳ</dt>
          <dd>{protocolLock?.prospectiveStartDrawId ? `#${protocolLock.prospectiveStartDrawId}` : "—"}</dd>
        </div>
        <div>
          <dt>Bằng chứng kỳ mới nhất</dt>
          <dd>{latestEvidence ?? "—"}</dd>
        </div>
        <div>
          <dt>Số giả thuyết (Holm / registry)</dt>
          <dd>{familySummary ? familySummary.hypothesisCount : "—"}</dd>
        </div>
        <div>
          <dt>Số lần nhìn dữ liệu (look)</dt>
          <dd>{familySummary ? familySummary.lookCount : "—"}</dd>
        </div>
        <div>
          <dt>Alpha look hiện tại (Pocock)</dt>
          <dd>{familySummary ? spentAlphaForLook(familySummary.lookCount, CURRENT_PROTOCOL.alpha) : "—"}</dd>
        </div>
        <div>
          <dt>Endpoint chính</dt>
          <dd>{PRIMARY_ENDPOINT.id}</dd>
        </div>
        <div>
          <dt>Kỳ vọng số trùng (null)</dt>
          <dd>{EXPECTED_MATCHES.toFixed(1)}</dd>
        </div>
      </dl>

      <div className="data-status-actions">
        <Button
          type="button"
          className="primary-action"
          onClick={state.update}
          disabled={state.busy || state.loading}
          aria-busy={state.busy}
        >
          {state.busy ? <Loader2 className="spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
          {state.busy ? "Đang cập nhật…" : "Cập nhật dữ liệu"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="secondary-action"
          onClick={state.resetCache}
          disabled={state.busy || state.loading || state.origin !== "cache"}
        >
          <Trash2 aria-hidden="true" />
          Xóa cache
        </Button>
        <span className="data-status-note">
          <CloudDownload aria-hidden="true" /> Dữ liệu người dùng lưu trên thiết bị này. Máy chủ không giữ kho của bạn; cache (nếu có) chỉ là proxy lịch sự tới nguồn official trong TTL, không phải server store.
        </span>
      </div>

      <div aria-live="polite" role="status" className="data-status-live">
        <Message state={state} />
      </div>
    </section>
  );
}
