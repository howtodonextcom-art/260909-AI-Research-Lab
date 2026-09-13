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

export type ParseRefreshResult =
  | { ok: true; value: RefreshRequest }
  | { ok: false; error: string; status: 400 | 403 | 413 };

/**
 * Validates the public refresh body. `force` is rejected unless
 * `allowForce` is true (CLI/admin only — never the public Worker route).
 */
export function parseRefreshRequest(
  raw: unknown,
  options: { maxRecords?: number; allowForce?: boolean } = {},
): ParseRefreshResult {
  const maxRecords = options.maxRecords ?? 3_000;
  const allowForce = Boolean(options.allowForce);

  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Body phải là object JSON.", status: 400 };
  }
  const body = raw as Record<string, unknown>;

  if (body.force !== undefined && typeof body.force !== "boolean") {
    return { ok: false, error: "force phải là boolean.", status: 400 };
  }
  if (body.force === true && !allowForce) {
    return {
      ok: false,
      error: "force/backfill không được phép trên API công khai — dùng CLI quản trị (`npm run data:sync -- --force`).",
      status: 403,
    };
  }

  if (body.records !== undefined && !Array.isArray(body.records)) {
    return { ok: false, error: "records phải là mảng.", status: 400 };
  }
  if (Array.isArray(body.records) && body.records.length > maxRecords) {
    return {
      ok: false,
      error: `records vượt giới hạn ${maxRecords} phần tử.`,
      status: 413,
    };
  }

  if (body.manifest !== undefined && body.manifest !== null && (typeof body.manifest !== "object" || Array.isArray(body.manifest))) {
    return { ok: false, error: "manifest phải là object hoặc null.", status: 400 };
  }

  return {
    ok: true,
    value: {
      force: Boolean(body.force),
      records: Array.isArray(body.records) ? (body.records as DrawRecord[]) : [],
      manifest: (body.manifest as DatasetManifest | null | undefined) ?? null,
    },
  };
}

function withSecondary<T extends { source: { primary: unknown; secondary: unknown } }>(manifest: T): T {
  return { ...manifest, source: { ...manifest.source, secondary: VIETLOTT_DATA_SOURCE } };
}

export async function handleDataRefresh(
  body: RefreshRequest,
  deps: {
    adapter?: DrawSourceAdapter;
    cache?: OfficialFetchCacheStore;
    now?: () => Date;
    /** Admin/CLI only. Public route must leave this false. */
    allowForce?: boolean;
  } = {},
): Promise<RefreshResult> {
  const force = Boolean(body.force) && Boolean(deps.allowForce);
  const snapshot: SnapshotState = {
    records: Array.isArray(body.records) ? body.records : [],
    manifest: body.manifest ?? null,
  };
  let savedRecords: DrawRecord[] | null = null;
  let savedManifest: DatasetManifest | null = null;
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
