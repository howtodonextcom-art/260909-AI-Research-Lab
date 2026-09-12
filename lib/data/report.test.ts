import assert from "node:assert/strict";
import test from "node:test";
import { formatManifestStatus, formatSyncReport } from "./report";
import type { DatasetManifest, SyncSummary } from "./types";

const baseSummary = (): SyncSummary => ({
  status: "ok",
  fetched: 3,
  valid: 3,
  added: 1,
  unchanged: 2,
  duplicates: 0,
  conflicts: 0,
  rejected: 0,
  totalAfterMerge: 10,
  firstDrawDate: "2016-07-20",
  latestDrawDate: "2026-09-12",
  source: "vietlott-official",
  fetchedAt: "2026-09-12T00:00:00.000Z",
  datasetHash: "abcdef0123456789" + "0".repeat(48),
  issues: [],
  conflictDetails: [],
});

test("formatSyncReport: ok / not-modified / failed có header đúng", () => {
  assert.match(formatSyncReport(baseSummary()), /ĐỒNG BỘ THÀNH CÔNG/);
  assert.match(formatSyncReport({ ...baseSummary(), status: "not-modified" }), /KHÔNG CÓ DỮ LIỆU MỚI/);
  assert.match(
    formatSyncReport({ ...baseSummary(), status: "failed", error: "mạng" }),
    /ĐỒNG BỘ THẤT BẠI[\s\S]*Lỗi: mạng/,
  );
});

test("formatManifestStatus: thiếu manifest hướng dẫn sync", () => {
  const text = formatManifestStatus(null, 12);
  assert.match(text, /Không có manifest/);
  assert.match(text, /12/);
  assert.match(text, /data:sync/);
});

test("formatManifestStatus: có manifest in nguồn và hash", () => {
  const manifest: DatasetManifest = {
    schemaVersion: 2,
    product: "mega645",
    recordCount: 5,
    firstDrawId: "00001",
    firstDrawDate: "2016-07-20",
    latestDrawId: "00005",
    latestDrawDate: "2016-07-29",
    lastAttemptedSync: "2026-09-12T00:00:00.000Z",
    lastSuccessfulSync: "2026-09-12T00:00:00.000Z",
    source: {
      primary: { id: "vietlott-official", url: "https://vietlott.vn/x", license: "public" },
      secondary: { id: "vietlott-data", url: "https://raw.githubusercontent.com/x", license: "MIT" },
    },
    sourceEtag: null,
    datasetSha256: "f".repeat(64),
    validation: { valid: true, duplicates: 0, conflicts: 0, rejected: 0, missingIds: [] },
    crossCheck: { status: "PASS", sampleSize: 8, checkedAt: "2026-09-12T00:00:00.000Z" },
  };
  const text = formatManifestStatus(manifest, 5);
  assert.match(text, /TRẠNG THÁI DỮ LIỆU/);
  assert.match(text, /vietlott-official/);
  assert.match(text, /f{16,}/);
  assert.match(text, /PASS/);
});
