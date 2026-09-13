import assert from "node:assert/strict";
import test from "node:test";
import { DATA_REFRESH_TTL_MS, REFRESH_API_URL, chooseLoadedDataset, pickBestSnapshot, refreshDataset, shouldAutoRefresh, type LoadedDataset } from "./refresh";
import { ALLOWED_HOSTS, assertAllowedUrl, HttpError, MAX_REDIRECTS } from "./http";
import { VIETLOTT_DATA_URL } from "./sources/vietlott-data";
import type { DatasetManifest, DrawRecord } from "./types";

const draw = (id: string, date: string): DrawRecord => ({ id, date, result: [1, 2, 3, 4, 5, 6] });

function manifestWith(lastSuccessfulSync: string | null): DatasetManifest {
  return {
    schemaVersion: 2,
    product: "mega645",
    recordCount: 1,
    firstDrawId: "00198",
    firstDrawDate: "2017-10-25",
    latestDrawId: "00198",
    latestDrawDate: "2017-10-25",
    lastAttemptedSync: lastSuccessfulSync,
    lastSuccessfulSync,
    source: { primary: { id: "vietlott-data", url: VIETLOTT_DATA_URL, license: "MIT" }, secondary: null },
    sourceEtag: null,
    datasetSha256: "0".repeat(64),
    validation: { valid: true, duplicates: 0, conflicts: 0, rejected: 0, missingIds: [] },
    crossCheck: { status: "NOT_RUN", sampleSize: 0, checkedAt: null },
  };
}

const NOW = Date.parse("2026-09-10T12:00:00.000Z");

test("chưa từng sync thành công thì phải tự cập nhật", () => {
  assert.equal(shouldAutoRefresh(null, NOW), true);
  assert.equal(shouldAutoRefresh(manifestWith(null), NOW), true);
});

test("dữ liệu còn trong TTL thì KHÔNG gọi mạng", () => {
  const oneHourAgo = new Date(NOW - 60 * 60 * 1000).toISOString();
  assert.equal(shouldAutoRefresh(manifestWith(oneHourAgo), NOW), false);
});

test("quá TTL thì tự cập nhật", () => {
  const thirteenHoursAgo = new Date(NOW - 13 * 60 * 60 * 1000).toISOString();
  assert.equal(shouldAutoRefresh(manifestWith(thirteenHoursAgo), NOW), true);
});

test("đúng mốc TTL được coi là hết hạn", () => {
  const exactly = new Date(NOW - DATA_REFRESH_TTL_MS).toISOString();
  assert.equal(shouldAutoRefresh(manifestWith(exactly), NOW), true);
});

test("timestamp hỏng thì coi như cần cập nhật", () => {
  assert.equal(shouldAutoRefresh(manifestWith("không-phải-ngày"), NOW), true);
});

test("TTL mặc định là 12 giờ", () => {
  assert.equal(DATA_REFRESH_TTL_MS, 12 * 60 * 60 * 1000);
});

const bundled: LoadedDataset = {
  records: [draw("00198", "2017-10-25"), draw("00199", "2017-10-27")],
  manifest: null,
  origin: "bundled",
};

test("không có cache thì dùng dữ liệu kèm theo", () => {
  assert.equal(pickBestSnapshot(bundled, null).origin, "bundled");
  assert.equal(pickBestSnapshot(bundled, { records: [], manifest: null }).origin, "bundled");
});

test("cache mới hơn được ưu tiên", () => {
  const cached = { records: [...bundled.records, draw("00200", "2017-10-29")], manifest: null };
  const picked = pickBestSnapshot(bundled, cached);
  assert.equal(picked.origin, "cache");
  assert.equal(picked.records.length, 3);
});

test("cache cũ hơn bị bỏ qua để không làm mất dữ liệu mới", () => {
  const cached = { records: [draw("00198", "2017-10-25")], manifest: null };
  const picked = pickBestSnapshot(bundled, cached);
  assert.equal(picked.origin, "bundled");
  assert.equal(picked.records.length, 2);
});

test("cùng ngày mới nhất thì lấy bộ nhiều bản ghi hơn", () => {
  const cached = {
    records: [draw("00197", "2017-10-24"), ...bundled.records],
    manifest: null,
  };
  assert.equal(pickBestSnapshot(bundled, cached).records.length, 3);
});

test("chooseLoadedDataset: bundled fail vẫn dùng cache hợp lệ (offline-first)", () => {
  const cached = { records: [draw("00200", "2017-10-29")], manifest: null };
  const picked = chooseLoadedDataset(null, cached, new Error("bundled offline"));
  assert.equal(picked.origin, "cache");
  assert.equal(picked.records.length, 1);
});

test("chooseLoadedDataset: cả hai nguồn hỏng thì throw lỗi bundled", () => {
  assert.throws(
    () => chooseLoadedDataset(null, null, new Error("bundled offline")),
    /bundled offline/,
  );
});

test("assertAllowedUrl chặn credential và port lạ", () => {
  assert.throws(() => assertAllowedUrl("https://user:pass@vietlott.vn/x"), HttpError);
  assert.throws(() => assertAllowedUrl("https://vietlott.vn:8443/x"), HttpError);
});

test("MAX_REDIRECTS hữu hạn và http module export redirect policy", () => {
  assert.equal(MAX_REDIRECTS, 5);
  assert.ok(MAX_REDIRECTS >= 1);
});

test("allowlist chặn host lạ (chống SSRF)", () => {
  assert.doesNotThrow(() => assertAllowedUrl(VIETLOTT_DATA_URL));
  for (const bad of [
    "https://evil.example.com/data.jsonl",
    "https://169.254.169.254/latest/meta-data/",
    "https://localhost:8787/admin",
    "http://raw.githubusercontent.com/x/y/main/z.jsonl",
    "file:///etc/passwd",
    "không-phải-url",
  ]) {
    assert.throws(() => assertAllowedUrl(bad), HttpError, `phải chặn ${bad}`);
  }
});

test("allowlist chỉ chứa host đã được kiểm chứng", () => {
  assert.deepEqual([...ALLOWED_HOSTS], ["raw.githubusercontent.com", "vietlott.vn"]);
  assert.equal(new URL(VIETLOTT_DATA_URL).hostname, "raw.githubusercontent.com");
});

test("refreshDataset gọi route nội bộ thay vì mirror browser adapter", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return Response.json({
      summary: {
        status: "not-modified",
        fetched: 0,
        valid: 0,
        added: 0,
        unchanged: 0,
        duplicates: 0,
        conflicts: 0,
        rejected: 0,
        totalAfterMerge: bundled.records.length,
        firstDrawDate: bundled.records[0]?.date ?? null,
        latestDrawDate: bundled.records.at(-1)?.date ?? null,
        source: "vietlott-official",
        fetchedAt: new Date(NOW).toISOString(),
        datasetHash: "0".repeat(64),
        issues: [],
        conflictDetails: [],
      },
    });
  }) as typeof fetch;

  try {
    const summary = await refreshDataset(bundled);
    assert.equal(summary.source, "vietlott-official");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, REFRESH_API_URL);
    assert.equal(calls[0].init?.method, "POST");
    assert.match(String(calls[0].init?.body), /"records"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
