/**
 * Client-side dataset loading and refresh.
 *
 * Reuses `runSync` with browser-backed storage, so the client and the CLI
 * share one implementation of normalization, merging, conflict handling and
 * dataset validation. A rule enforced in one place cannot drift between the
 * two surfaces.
 *
 * The source is fetched directly: it serves `Access-Control-Allow-Origin: *`,
 * so no server proxy is involved and there is no server-side request for a
 * caller to steer.
 */
import { parseDrawsJsonl } from "./jsonl";
import { clearCache, readCache, writeCache, writeCachedManifest } from "./browser-cache";
import type { DatasetManifest, DrawRecord, SyncSummary } from "./types";

/** Single place the freshness window is defined. */
export const DATA_REFRESH_TTL_MS = 12 * 60 * 60 * 1000;

export const BUNDLED_SNAPSHOT_URL = "/data/power645.jsonl";
export const BUNDLED_MANIFEST_URL = "/data/power645.manifest.json";
export const REFRESH_API_URL = "/api/data/refresh";

export type DatasetOrigin = "bundled" | "cache";

export type LoadedDataset = {
  records: DrawRecord[];
  manifest: DatasetManifest | null;
  origin: DatasetOrigin;
};

/**
 * Decides whether the stored dataset is stale enough to warrant a network call.
 * Pure so the policy can be tested without a browser or a clock.
 */
export function shouldAutoRefresh(
  manifest: DatasetManifest | null,
  now: number,
  ttlMs: number = DATA_REFRESH_TTL_MS,
): boolean {
  if (!manifest?.lastSuccessfulSync) return true;
  const last = Date.parse(manifest.lastSuccessfulSync);
  if (!Number.isFinite(last)) return true;
  return now - last >= ttlMs;
}

/** Later coverage wins; ties go to the larger dataset, then to the cache. */
export function pickBestSnapshot(
  bundled: LoadedDataset,
  cached: { records: DrawRecord[]; manifest: DatasetManifest | null } | null,
): LoadedDataset {
  if (!cached || !cached.records.length) return bundled;

  const bundledLatest = bundled.records.at(-1)?.date ?? "";
  const cachedLatest = cached.records.at(-1)?.date ?? "";

  if (cachedLatest > bundledLatest) return { ...cached, origin: "cache" };
  if (cachedLatest < bundledLatest) return bundled;
  return cached.records.length >= bundled.records.length
    ? { ...cached, origin: "cache" }
    : bundled;
}

async function fetchBundled(signal?: AbortSignal): Promise<LoadedDataset> {
  const response = await fetch(BUNDLED_SNAPSHOT_URL, { signal });
  if (!response.ok) throw new Error(`Không đọc được dữ liệu kèm theo (HTTP ${response.status}).`);
  const parsed = parseDrawsJsonl(await response.text());
  if (parsed.issues.length) {
    throw new Error(`Dữ liệu kèm theo lỗi: ${parsed.issues[0].reason}`);
  }

  let manifest: DatasetManifest | null = null;
  try {
    const manifestResponse = await fetch(BUNDLED_MANIFEST_URL, { signal });
    if (manifestResponse.ok) manifest = (await manifestResponse.json()) as DatasetManifest;
  } catch {
    manifest = null; // The manifest is metadata; its absence must not block the app.
  }

  return { records: parsed.records, manifest, origin: "bundled" };
}

/**
 * Loads the dataset the app should render right now: the bundled snapshot,
 * upgraded to the cached one when the cache is valid and covers more draws.
 */
export async function loadDataset(signal?: AbortSignal): Promise<LoadedDataset> {
  const bundled = await fetchBundled(signal);
  let cached = null;
  try {
    cached = await readCache();
  } catch {
    cached = null;
  }
  return pickBestSnapshot(bundled, cached);
}

export async function resetDatasetCache(signal?: AbortSignal): Promise<LoadedDataset> {
  await clearCache();
  return fetchBundled(signal);
}

let inFlight: Promise<SyncSummary> | null = null;

type RefreshApiResponse = {
  summary: SyncSummary;
  records?: DrawRecord[];
  manifest?: DatasetManifest;
};

/**
 * Fetches upstream and merges into the cached dataset.
 * Concurrent callers share one request, so a double-click or two components
 * mounting at once cannot produce two network calls.
 */
export function refreshDataset(current: LoadedDataset, options: { force?: boolean; signal?: AbortSignal } = {}): Promise<SyncSummary> {
  if (inFlight) return inFlight;

  inFlight = fetch(REFRESH_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: options.signal,
    body: JSON.stringify({
      force: Boolean(options.force),
      records: current.records,
      manifest: current.manifest,
    }),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Không gọi được dịch vụ cập nhật dữ liệu (HTTP ${response.status}).`);
      const payload = (await response.json()) as RefreshApiResponse;
      if (payload.records && payload.manifest) {
        await writeCache(payload.records, payload.manifest);
      } else if (payload.manifest) {
        await writeCachedManifest(payload.manifest);
      }
      return payload.summary;
    })
    .finally(() => {
    inFlight = null;
  });

  return inFlight;
}
