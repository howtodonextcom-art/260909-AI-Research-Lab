import assert from "node:assert/strict";
import test from "node:test";
import { clearCache, readCache, writeCache, writeCachedManifest } from "./browser-cache";
import type { DatasetManifest, DrawRecord } from "./types";

const records: DrawRecord[] = [{ id: "00001", date: "2016-07-20", result: [1, 2, 3, 4, 5, 6] }];

const manifest: DatasetManifest = {
  schemaVersion: 2,
  product: "mega645",
  recordCount: 1,
  firstDrawId: "00001",
  firstDrawDate: "2016-07-20",
  latestDrawId: "00001",
  latestDrawDate: "2016-07-20",
  lastAttemptedSync: null,
  lastSuccessfulSync: null,
  source: {
    primary: { id: "vietlott-official", url: "https://vietlott.vn", license: "public" },
    secondary: null,
  },
  sourceEtag: null,
  datasetSha256: "0".repeat(64),
  validation: { valid: true, duplicates: 0, conflicts: 0, rejected: 0, missingIds: [] },
  crossCheck: { status: "NOT_RUN", sampleSize: 0, checkedAt: null },
};

test("không có IndexedDB (Node): readCache trả null, write trả false, clear không throw", async () => {
  assert.equal(typeof globalThis.indexedDB, "undefined");
  assert.equal(await readCache(), null);
  assert.equal(await writeCache(records, manifest), false);
  assert.equal(await writeCachedManifest(manifest), false);
  await assert.doesNotReject(() => clearCache());
});
