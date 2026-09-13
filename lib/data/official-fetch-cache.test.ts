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
    // Non-empty so the politeness cache may store it (empty/null is intentionally not cached).
    return { raw: [{ id: "00201", date: "2017-11-01", result: [1, 2, 3, 4, 5, 6] }], etag: "00201" };
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

test("không cache raw:null / mảng rỗng — tránh khóa 'không có kỳ mới' trong TTL 12h", async () => {
  class EmptySinceAdapter extends CountingAdapter {
    async fetchSince(cursor: SyncCursor): Promise<SourceResponse> {
      this.calls += 1;
      this.lastKind = "since";
      return { raw: null, etag: cursor.latestId };
    }
  }
  const adapter = new EmptySinceAdapter();
  const cache = createMemoryOfficialFetchCache();
  const wrapped = wrapAdapterWithOfficialFetchCache(adapter, { store: cache });
  const cursor = { etag: "01561", latestDrawDate: "2026-09-11", latestId: "01561" };
  await wrapped.fetchSince(cursor);
  await wrapped.fetchSince(cursor);
  assert.equal(adapter.calls, 2, "empty incremental phải revalidate mỗi lần");
  assert.equal(cache.size(), 0);
});

test("revalidateOfficialCache trên public path bỏ qua cache nhưng không fetchAll", async () => {
  const adapter = new CountingAdapter();
  const cache = createMemoryOfficialFetchCache();
  const manifest = {
    schemaVersion: 2 as const,
    product: "mega645" as const,
    recordCount: BASE.length,
    firstDrawId: "00198",
    firstDrawDate: "2017-10-25",
    latestDrawId: "00200",
    latestDrawDate: "2017-10-29",
    lastAttemptedSync: "2017-10-29T00:00:00.000Z",
    lastSuccessfulSync: "2017-10-29T00:00:00.000Z",
    source: { primary: { id: "vietlott-official", url: "https://vietlott.vn/history", license: "public" }, secondary: null },
    sourceEtag: "00200",
    datasetSha256: "0".repeat(64),
    validation: { valid: true, duplicates: 0, conflicts: 0, rejected: 0, missingIds: [] },
    crossCheck: { status: "NOT_RUN" as const, sampleSize: 0, checkedAt: null },
  };
  await handleDataRefresh({ records: BASE, manifest }, { adapter, cache });
  assert.equal(adapter.calls, 1);
  assert.equal(adapter.lastKind, "since");
  await handleDataRefresh({ records: BASE, manifest }, { adapter, cache });
  assert.equal(adapter.calls, 1, "payload dương vẫn được cache");
  await handleDataRefresh(
    { records: BASE, manifest, revalidateOfficialCache: true },
    { adapter, cache },
  );
  assert.equal(adapter.calls, 2, "revalidate phải bỏ qua cache");
  assert.equal(adapter.lastKind, "since", "revalidate không được ép fetchAll");
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
  await handleDataRefresh({ records: [], force: true }, { adapter, cache, allowForce: true });
  assert.equal(adapter.calls, 2);
});

test("handleDataRefresh bỏ qua force trên đường public (allowForce mặc định false)", async () => {
  const adapter = new CountingAdapter();
  const cache = createMemoryOfficialFetchCache();
  await handleDataRefresh({ records: [] }, { adapter, cache });
  assert.equal(adapter.calls, 1);
  await handleDataRefresh({ records: [], force: true }, { adapter, cache });
  assert.equal(adapter.calls, 1, "force không có allowForce không được phá cache");
});

test("hai cache miss đồng thời chỉ tạo một upstream call (single-flight in-process)", async () => {
  const adapter = new CountingAdapter();
  const cache = createMemoryOfficialFetchCache();
  const wrapped = wrapAdapterWithOfficialFetchCache(adapter, { store: cache });
  await Promise.all([wrapped.fetchAll(), wrapped.fetchAll()]);
  assert.equal(adapter.calls, 1);
});

test("parseRefreshRequest từ chối force công khai và records quá lớn", async () => {
  const { parseRefreshRequest } = await import("./refresh-handler");
  const forced = parseRefreshRequest({ force: true, records: [] }, { allowForce: false });
  assert.equal(forced.ok, false);
  if (!forced.ok) assert.equal(forced.status, 403);
  const oversized = parseRefreshRequest({ records: Array.from({ length: 3_001 }, () => draw("00198", "2017-10-25")) });
  assert.equal(oversized.ok, false);
  if (!oversized.ok) assert.equal(oversized.status, 413);
});

test("route refresh bọc adapter official bằng cache injectable", () => {
  const route = readFileSync(path.join(fileURLToPath(new URL("../..", import.meta.url)), "app/api/data/refresh/route.ts"), "utf8");
  assert.match(route, /handleDataRefresh/);
  assert.match(route, /parseRefreshRequest/);
  assert.match(route, /allowForce:\s*false/);
  const handler = readFileSync(fileURLToPath(new URL("./refresh-handler.ts", import.meta.url)), "utf8");
  assert.match(handler, /wrapAdapterWithOfficialFetchCache/);
  assert.match(handler, /vietlottOfficialAdapter/);
  assert.doesNotMatch(handler, /body\.records.*cache/);
});
