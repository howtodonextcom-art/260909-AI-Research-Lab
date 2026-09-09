"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DATA_REFRESH_TTL_MS,
  loadDataset,
  refreshDataset,
  shouldAutoRefresh,
  type DatasetOrigin,
  type LoadedDataset,
} from "@/lib/data/refresh";
import type { DrawRecord, DatasetManifest } from "@/lib/data/types";

export type RefreshState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "updated"; added: number; total: number; latestDate: string | null }
  | { kind: "up-to-date" }
  | { kind: "conflict"; count: number; message: string }
  | { kind: "error"; message: string };

export type DrawDataState = {
  records: DrawRecord[];
  manifest: DatasetManifest | null;
  origin: DatasetOrigin | null;
  loading: boolean;
  loadError: string | null;
  refresh: RefreshState;
  /** True while a network check is in flight, for disabling the button. */
  busy: boolean;
  update: () => void;
};

/**
 * Owns the dataset the research UI renders.
 *
 * Order of operations matters: the bundled snapshot (or a newer cached one) is
 * rendered first and a network check only happens afterwards, so the app is
 * never blocked on connectivity. A failed refresh leaves the currently loaded
 * data untouched — it only changes the status message.
 */
export function useDrawData(): DrawDataState {
  const [dataset, setDataset] = useState<LoadedDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState<RefreshState>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  const datasetRef = useRef<LoadedDataset | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runRefresh = useCallback(async (options: { signal?: AbortSignal } = {}) => {
    const current = datasetRef.current;
    // Guard against double-click and against two effects racing on mount.
    if (!current || busyRef.current) return;

    busyRef.current = true;
    if (mountedRef.current) {
      setBusy(true);
      setRefresh({ kind: "checking" });
    }

    try {
      const summary = await refreshDataset(current, { signal: options.signal });
      if (!mountedRef.current) return;

      // Nothing new upstream: the rendered dataset is already correct.
      if (summary.status === "not-modified" || (summary.status === "ok" && summary.added === 0)) {
        setRefresh({ kind: "up-to-date" });
        return;
      }

      if (summary.status === "ok") {
        const next = await loadDataset(options.signal);
        if (!mountedRef.current) return;
        datasetRef.current = next;
        setDataset(next);
        setRefresh({
          kind: "updated",
          added: summary.added,
          total: summary.totalAfterMerge,
          latestDate: summary.latestDrawDate,
        });
        return;
      }

      if (summary.conflicts > 0) {
        setRefresh({
          kind: "conflict",
          count: summary.conflicts,
          message: "Nguồn trả về kết quả khác với dữ liệu đang lưu. Dữ liệu cũ được giữ nguyên.",
        });
        return;
      }

      setRefresh({
        kind: "error",
        message: "Không thể cập nhật lúc này. Ứng dụng đang sử dụng bộ dữ liệu hợp lệ gần nhất.",
      });
    } catch {
      if (mountedRef.current) {
        setRefresh({
          kind: "error",
          message: "Không thể cập nhật lúc này. Ứng dụng đang sử dụng bộ dữ liệu hợp lệ gần nhất.",
        });
      }
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const initial = await loadDataset(controller.signal);
        if (controller.signal.aborted || !mountedRef.current) return;
        datasetRef.current = initial;
        setDataset(initial);
        setLoading(false);

        if (shouldAutoRefresh(initial.manifest, Date.now(), DATA_REFRESH_TTL_MS)) {
          await runRefresh({ signal: controller.signal });
        }
      } catch (error) {
        if (controller.signal.aborted || !mountedRef.current) return;
        setLoadError(error instanceof Error ? error.message : String(error));
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [runRefresh]);

  const update = useCallback(() => {
    void runRefresh();
  }, [runRefresh]);

  return {
    records: dataset?.records ?? [],
    manifest: dataset?.manifest ?? null,
    origin: dataset?.origin ?? null,
    loading,
    loadError,
    refresh,
    busy,
    update,
  };
}
