import { runSync, type SnapshotState } from "./sync";
import { VIETLOTT_DATA_SOURCE } from "./sources/vietlott-data";
import { vietlottOfficialAdapter } from "./sources/vietlott-official";
import type { DrawSourceAdapter } from "./sources/source-adapter";
import type { DatasetManifest, DrawRecord } from "./types";
import {
  resolveOfficialFetchCacheStore,
  wrapAdapterWithOfficialFetchCache,
  type OfficialFetchCacheStore,
} from "./official-fetch-cache";

export type RefreshRequest = {
  force?: boolean;
  records?: DrawRecord[];
  manifest?: DatasetManifest | null;
};

export type RefreshResult = {
  summary: Awaited<ReturnType<typeof runSync>>;
  records?: DrawRecord[];
  manifest?: DatasetManifest;
};

function withSecondary<T extends { source: { primary: unknown; secondary: unknown } }>(manifest: T): T {
  return { ...manifest, source: { ...manifest.source, secondary: VIETLOTT_DATA_SOURCE } };
}

export async function handleDataRefresh(
  body: RefreshRequest,
  deps: {
    adapter?: DrawSourceAdapter;
    cache?: OfficialFetchCacheStore;
    now?: () => Date;
  } = {},
): Promise<RefreshResult> {
  const snapshot: SnapshotState = {
    records: Array.isArray(body.records) ? body.records : [],
    manifest: body.manifest ?? null,
  };
  let savedRecords: DrawRecord[] | null = null;
  let savedManifest: DatasetManifest | null = null;
  const force = Boolean(body.force);
  const store = await resolveOfficialFetchCacheStore(deps.cache);
  const adapter = wrapAdapterWithOfficialFetchCache(deps.adapter ?? vietlottOfficialAdapter, { store, force });

  const summary = await runSync(
    {
      adapter,
      loadSnapshot: async () => snapshot,
      saveSnapshot: async (records, manifest) => {
        savedRecords = records;
        savedManifest = withSecondary(manifest);
      },
      saveManifest: async (manifest) => {
        savedManifest = withSecondary(manifest);
      },
      now: deps.now ?? (() => new Date()),
    },
    { force, timeoutMs: 30_000 },
  );

  return {
    summary,
    records: savedRecords ?? undefined,
    manifest: savedManifest ?? undefined,
  };
}
