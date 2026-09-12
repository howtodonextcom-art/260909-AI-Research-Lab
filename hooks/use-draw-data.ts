"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DATA_REFRESH_TTL_MS,
  loadDataset,
  refreshDataset,
  resetDatasetCache,
  shouldAutoRefresh,
  type DatasetOrigin,
  type LoadedDataset,
} from "@/lib/data/refresh";
import {
  REFRESH_ERROR_MESSAGE,
  refreshStateFromSummary,
  type RefreshUiState,
} from "@/lib/data/draw-data-state";
import type { DrawRecord, DatasetManifest } from "@/lib/data/types";

export type RefreshState = RefreshUiState;

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
  resetCache: () => void;
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

      const nextState = refreshStateFromSummary(summary);
      if (nextState.kind === "updated") {
        const next = await loadDataset(options.signal);
        if (!mountedRef.current) return;
        datasetRef.current = next;
        setDataset(next);
      }
      setRefresh(nextState);
    } catch {
      if (mountedRef.current) {
        setRefresh({ kind: "error", message: REFRESH_ERROR_MESSAGE });
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

  const resetCache = useCallback(() => {
    if (busyRef.current) return;
    void (async () => {
      busyRef.current = true;
      if (mountedRef.current) setBusy(true);
      try {
        const next = await resetDatasetCache();
        if (!mountedRef.current) return;
        datasetRef.current = next;
        setDataset(next);
        setRefresh({ kind: "idle" });
      } catch (error) {
        if (mountedRef.current) {
          setRefresh({
            kind: "error",
            message: error instanceof Error ? error.message : "Không thể xoá cache dữ liệu lúc này.",
          });
        }
      } finally {
        busyRef.current = false;
        if (mountedRef.current) setBusy(false);
      }
    })();
  }, []);

  return {
    records: dataset?.records ?? [],
    manifest: dataset?.manifest ?? null,
    origin: dataset?.origin ?? null,
    loading,
    loadError,
    refresh,
    busy,
    update,
    resetCache,
  };
}
