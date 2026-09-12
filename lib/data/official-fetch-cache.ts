/**
 * Shared short-TTL cache for official-source fetch results only.
 *
 * This is a politeness proxy in front of vietlott.vn. It is not a user store
 * and must never be keyed on client `records` / `manifest` payloads.
 */
import type { DrawSourceAdapter } from "./sources/source-adapter";
import type { FetchOptions, SourceResponse, SyncCursor } from "./types";

/** Same 12h window as `DATA_REFRESH_TTL_MS` — kept local so the route does not import the browser refresh module. */
export const OFFICIAL_FETCH_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export type OfficialFetchCacheStore = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
};

type MemoryEntry = { value: string; expiresAt: number };

export function createMemoryOfficialFetchCache(now: () => number = () => Date.now()): OfficialFetchCacheStore & {
  size(): number;
  clear(): void;
} {
  const map = new Map<string, MemoryEntry>();
  return {
    size: () => map.size,
    clear: () => map.clear(),
    async get(key) {
      const hit = map.get(key);
      if (!hit) return null;
      if (hit.expiresAt <= now()) {
        map.delete(key);
        return null;
      }
      return hit.value;
    },
    async set(key, value, ttlMs) {
      map.set(key, { value, expiresAt: now() + ttlMs });
    },
  };
}

const isolateMemory = createMemoryOfficialFetchCache();

export function officialFetchCacheKey(kind: "all" | "since", cursor?: Pick<SyncCursor, "latestId">): string {
  if (kind === "all") return "official:vietlott-official:fetchAll";
  return `official:vietlott-official:fetchSince:${cursor?.latestId ?? ""}`;
}

export function createCacheApiStore(cache: Cache): OfficialFetchCacheStore {
  const origin = "https://official-fetch-cache.local";
  return {
    async get(key) {
      const match = await cache.match(new Request(`${origin}/${encodeURIComponent(key)}`));
      return match ? match.text() : null;
    },
    async set(key, value, ttlMs) {
      const request = new Request(`${origin}/${encodeURIComponent(key)}`);
      const maxAge = Math.max(1, Math.floor(ttlMs / 1000));
      const response = new Response(value, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${maxAge}`,
        },
      });
      await cache.put(request, response);
    },
  };
}

export async function resolveOfficialFetchCacheStore(inject?: OfficialFetchCacheStore): Promise<OfficialFetchCacheStore> {
  if (inject) return inject;
  const cachesRef = (globalThis as { caches?: CacheStorage & { default?: Cache } }).caches;
  if (cachesRef?.default) return createCacheApiStore(cachesRef.default);
  if (typeof cachesRef?.open === "function") {
    try {
      return createCacheApiStore(await cachesRef.open("official-fetch"));
    } catch {
      // Isolate Map is the documented fallback, not a user store.
    }
  }
  return isolateMemory;
}

export function wrapAdapterWithOfficialFetchCache(
  adapter: DrawSourceAdapter,
  options: {
    store: OfficialFetchCacheStore;
    ttlMs?: number;
    force?: boolean;
  },
): DrawSourceAdapter {
  const ttlMs = options.ttlMs ?? OFFICIAL_FETCH_CACHE_TTL_MS;
  const force = Boolean(options.force);
  return {
    id: adapter.id,
    sourceUrl: adapter.sourceUrl,
    license: adapter.license,
    normalize: (raw) => adapter.normalize(raw),
    async fetchAll(fetchOptions?: FetchOptions) {
      const key = officialFetchCacheKey("all");
      if (!force) {
        const cached = await options.store.get(key);
        if (cached) return JSON.parse(cached) as SourceResponse;
      }
      const response = await adapter.fetchAll(fetchOptions);
      await options.store.set(key, JSON.stringify(response), ttlMs);
      return response;
    },
    async fetchSince(cursor: SyncCursor, fetchOptions?: FetchOptions) {
      const key = officialFetchCacheKey("since", cursor);
      if (!force) {
        const cached = await options.store.get(key);
        if (cached) return JSON.parse(cached) as SourceResponse;
      }
      const response = await adapter.fetchSince(cursor, fetchOptions);
      await options.store.set(key, JSON.stringify(response), ttlMs);
      return response;
    },
  };
}
