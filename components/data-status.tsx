"use client";

import { AlertTriangle, Check, CloudDownload, Database, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DrawDataState } from "@/hooks/use-draw-data";

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
      return { label: "Không có dữ liệu mới", tone: "ok" };
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
    return (
      <p className="data-status-message data-status-ok">
        <Check aria-hidden="true" /> Dữ liệu đã là phiên bản mới nhất.
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
 * Deliberately explicit that an update is stored on this device only: the app
 * has no server-side store, and telling the user their data was "saved" would
 * imply a durability that does not exist.
 */
export function DataStatus({ state }: { state: DrawDataState }) {
  const status = describe(state);
  const manifest = state.manifest;
  const latestRecord = state.records.at(-1);

  return (
    <section className="analysis-card data-status-card" aria-labelledby="data-status-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Nguồn dữ liệu</p>
          <h2 id="data-status-heading">Trạng thái bộ dữ liệu</h2>
        </div>
        <Badge variant="outline" className={`data-status-badge data-status-${status.tone}`}>
          {status.tone === "busy" ? <Loader2 className="spin" aria-hidden="true" /> : <Database aria-hidden="true" />}
          {status.label}
        </Badge>
      </div>

      <dl className="data-status-grid">
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
          <dd>{manifest ? `${manifest.source.id} (${manifest.source.license})` : "vietlott-data (MIT)"}</dd>
        </div>
        <div>
          <dt>Đang đọc từ</dt>
          <dd>{state.origin === "cache" ? "bộ nhớ trên thiết bị" : "dữ liệu kèm theo ứng dụng"}</dd>
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
        <span className="data-status-note">
          <CloudDownload aria-hidden="true" /> Bản cập nhật được lưu trên thiết bị này, không gửi lên máy chủ.
        </span>
      </div>

      <div aria-live="polite" role="status" className="data-status-live">
        <Message state={state} />
      </div>
    </section>
  );
}
