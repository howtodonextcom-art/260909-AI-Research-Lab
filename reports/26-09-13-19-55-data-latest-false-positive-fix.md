# Data “latest” false-positive fix

**Generated:** 2026-09-13  
**HEAD (pre-commit local):** dirty tree after fix  
**Verdict:** `FIXED_VERIFIED` (local evidence)

## Repro

- Bundled tip before fix: `#01561` / `2026-09-11`
- UI copy: “Không có dữ liệu mới” + “Dữ liệu đã là phiên bản mới nhất”
- User date: **2026-09-13** — Mega 6/45 Sunday draw expected

## Upstream evidence

`npm run data:sync -- --force` (exit 0):

- added **1**
- latest **2026-09-13**
- recordCount **1562**
- tip `#01562` result `[4,12,31,34,38,41]`

`fetchSince({ latestId: "01561" })` returns `#01562` in ~1s when cache is cold.

## Root cause

1. **Official politeness cache** (`lib/data/official-fetch-cache.ts`) stored incremental `raw: null` (“no newer draws”) for **12h TTL**.
2. After Vietlott published `#01562` inside that window, soft UI refresh reused the cached empty result → sync `not-modified` / `added=0`.
3. UI mapped that to absolute copy **“Dữ liệu đã là phiên bản mới nhất”** — conflating “this attempt found nothing” with “world is complete”.

Public API correctly forbids admin `force` (full crawl); that was not the primary bug. The bug was caching emptiness + absolute messaging.

## Fix

1. **Do not cache** `raw: null` / empty arrays (`isCacheableOfficialResponse`).
2. Public-safe **`revalidateOfficialCache`**: bypass politeness cache without `fetchAll`; client always sends it on refresh.
3. Honest UI copy: “Không thấy kỳ mới hơn trong lần kiểm tra…” + local tip id/date; ban absolute “phiên bản mới nhất”.

## Tests

```text
node --import=tsx --test lib/data/official-fetch-cache.test.ts components/data-status.contract.test.ts lib/data/draw-data-state.test.ts
→ 20/20 PASS
```

## Browser / runtime

After rebuild with updated `public/data/power645.jsonl` (01562) + code fix: verify Research Data Status shows tip `#01562` / 13/9/2026 (clear device cache + Cập nhật if IndexedDB still holds 01561).
