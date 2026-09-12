import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { normalizeDraw } from "./schema";
import { handleDataRefresh } from "./refresh-handler";
import { DATA_REFRESH_TTL_MS } from "./refresh";
import {
  OFFICIAL_FETCH_CACHE_TTL_MS,
  createMemoryOfficialFetchCache,
  officialFetchCacheKey,
  wrapAdapterWithOfficialFetchCache,
} from "./official-fetch-cache";
import type { DrawSourceAdapter } from "./sources/source-adapter";
import type { DrawRecord, RawDraw, SourceResponse, SyncCursor } from "./types";

const draw = (id: string, date: string): DrawRecord => ({ id, date, result: [1, 2, 3, 4, 5, 6] });
const BASE = [draw("00198", "2017-10-25"), draw("00199", "2017-10-27"), draw("00200", "2017-10-29")];

class CountingAdapter implements DrawSourceAdapter {
  readonly id = "vietlott-official";
  readonly sourceUrl = "https://vietlott.vn/history";
  readonly license = "public";
  calls = 0;
  lastKind: "all" | "since" | null = null;

  async fetchAll(): Promise<SourceResponse> {
    this.calls += 1;
    this.lastKind = "all";
    return { raw: BASE.map((row) => ({ ...row })), etag: "00200" };
  }

  async fetchSince(cursor: SyncCursor): Promise<SourceResponse> {
    this.calls += 1;
    this.lastKind = "since";
    return { raw: null, etag: cursor.latestId };
  }

  normalize(raw: RawDraw) {
    return normalizeDraw(raw);
  }
}

test("TTL official cache khớp TTL dữ liệu 12h", () => {
  assert.equal(OFFICIAL_FETCH_CACHE_TTL_MS, DATA_REFRESH_TTL_MS);
  assert.equal(OFFICIAL_FETCH_CACHE_TTL_MS, 12 * 60 * 60 * 1000);
});

test("lần refresh thứ hai trong TTL không gọi lại mạng official", async () => {
  const adapter = new CountingAdapter();
  const cache = createMemoryOfficialFetchCache();
  const wrapped = wrapAdapterWithOfficialFetchCache(adapter, { store: cache });
  await wrapped.fetchAll();
  await wrapped.fetchAll();
  assert.equal(adapter.calls, 1);
  assert.equal(adapter.lastKind, "all");
});

test("cache miss / hết hạn / force:true vẫn đi official", async () => {
  let now = 1_000;
  const adapter = new CountingAdapter();
  const cache = createMemoryOfficialFetchCache(() => now);
  const wrapped = wrapAdapterWithOfficialFetchCache(adapter, { store: cache, ttlMs: 100 });
  await wrapped.fetchAll();
  now = 1_200;
  await wrapped.fetchAll();
  assert.equal(adapter.calls, 2);

  const forced = wrapAdapterWithOfficialFetchCache(adapter, { store: cache, force: true });
  await forced.fetchAll();
  assert.equal(adapter.calls, 3);
});

test("fetchSince cùng latestId dùng chung cache, không khóa theo records của user", async () => {
  const adapter = new CountingAdapter();
  const cache = createMemoryOfficialFetchCache();
  const wrapped = wrapAdapterWithOfficialFetchCache(adapter, { store: cache });
  const cursor = { etag: "x", latestDrawDate: "2017-10-29", latestId: "00200" };
  await wrapped.fetchSince(cursor);
  await wrapped.fetchSince({ ...cursor, etag: "other-user-etag" });
  assert.equal(adapter.calls, 1);
  assert.equal(officialFetchCacheKey("since", cursor), "official:vietlott-official:fetchSince:00200");
});

test("handleDataRefresh lần 2 trong TTL không hit official; force vẫn hit", async () => {
  const adapter = new CountingAdapter();
  const cache = createMemoryOfficialFetchCache();
  const first = await handleDataRefresh({ records: [] }, { adapter, cache });
  assert.equal(first.summary.status, "ok");
  assert.equal(adapter.calls, 1);
  const second = await handleDataRefresh({ records: [] }, { adapter, cache });
  assert.equal(adapter.calls, 1, "lần 2 trong TTL không gọi lại official; body.records không phải cache key");
  assert.equal(second.summary.status, "ok");
  await handleDataRefresh({ records: [], force: true }, { adapter, cache });
  assert.equal(adapter.calls, 2);
});

test("route refresh bọc adapter official bằng cache injectable", () => {
  const route = readFileSync(path.join(fileURLToPath(new URL("../..", import.meta.url)), "app/api/data/refresh/route.ts"), "utf8");
  assert.match(route, /handleDataRefresh/);
  const handler = readFileSync(fileURLToPath(new URL("./refresh-handler.ts", import.meta.url)), "utf8");
  assert.match(handler, /wrapAdapterWithOfficialFetchCache/);
  assert.match(handler, /vietlottOfficialAdapter/);
  assert.doesNotMatch(handler, /body\.records.*cache/);
});
