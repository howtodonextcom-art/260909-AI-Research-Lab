import assert from "node:assert/strict";
import test from "node:test";
import { DATA_REFRESH_TTL_MS, pickBestSnapshot, shouldAutoRefresh, type LoadedDataset } from "./refresh";
import { ALLOWED_HOSTS, assertAllowedUrl, HttpError } from "./http";
import { VIETLOTT_DATA_URL, browserVietlottDataAdapter, vietlottDataAdapter } from "./sources/vietlott-data";
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

// Regression: gửi If-None-Match từ browser làm request thành non-simple, kích
// hoạt CORS preflight OPTIONS mà raw.githubusercontent.com trả về non-2xx, nên
// toàn bộ lần cập nhật thất bại. Lỗi này chỉ lộ ra khi chạy thật trên trình duyệt.
test("adapter cho browser KHÔNG gửi header gây CORS preflight", async () => {
  const body = Array.from({ length: 120 }, (_, index) =>
    JSON.stringify({
      date: `2018-01-${String((index % 28) + 1).padStart(2, "0")}`,
      id: String(index + 1).padStart(5, "0"),
      result: [1, 2, 3, 4, 5, 6],
    }),
  ).join("\n");

  const captured: Array<Record<string, string>> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    captured.push({ ...((init?.headers as Record<string, string>) ?? {}) });
    return new Response(body, { status: 200, headers: { ETag: 'W/"x"' } });
  }) as typeof fetch;

  try {
    await browserVietlottDataAdapter.fetchSince({ etag: 'W/"x"', latestDrawDate: null, latestId: null });
    assert.deepEqual(captured.at(-1), {}, "browser phải gửi GET không kèm header tuỳ chỉnh");

    await vietlottDataAdapter.fetchSince({ etag: 'W/"x"', latestDrawDate: null, latestId: null });
    assert.equal(captured.at(-1)?.["If-None-Match"], 'W/"x"', "CLI vẫn dùng request có điều kiện");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
