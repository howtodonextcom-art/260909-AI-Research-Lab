import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  REFRESH_CONFLICT_MESSAGE,
  REFRESH_ERROR_MESSAGE,
  refreshStateFromSummary,
} from "./draw-data-state";
import type { SyncSummary } from "./types";

function summary(partial: Partial<SyncSummary> & Pick<SyncSummary, "status">): SyncSummary {
  return {
    fetched: 0,
    valid: 0,
    added: 0,
    unchanged: 0,
    duplicates: 0,
    conflicts: 0,
    rejected: 0,
    totalAfterMerge: 10,
    firstDrawDate: "2016-07-20",
    latestDrawDate: "2026-09-12",
    source: "vietlott-official",
    fetchedAt: "2026-09-12T00:00:00.000Z",
    datasetHash: "a".repeat(64),
    issues: [],
    conflictDetails: [],
    ...partial,
  };
}

test("refreshStateFromSummary: not-modified / ok+added0 → up-to-date", () => {
  assert.deepEqual(refreshStateFromSummary(summary({ status: "not-modified" })), { kind: "up-to-date" });
  assert.deepEqual(refreshStateFromSummary(summary({ status: "ok", added: 0 })), { kind: "up-to-date" });
});

test("refreshStateFromSummary: ok với kỳ mới → updated", () => {
  assert.deepEqual(refreshStateFromSummary(summary({ status: "ok", added: 2, totalAfterMerge: 12, latestDrawDate: "2026-09-13" })), {
    kind: "updated",
    added: 2,
    total: 12,
    latestDate: "2026-09-13",
  });
});

test("refreshStateFromSummary: conflict / failed → conflict hoặc error", () => {
  assert.deepEqual(refreshStateFromSummary(summary({ status: "failed", conflicts: 3 })), {
    kind: "conflict",
    count: 3,
    message: REFRESH_CONFLICT_MESSAGE,
  });
  assert.deepEqual(refreshStateFromSummary(summary({ status: "failed", conflicts: 0 })), {
    kind: "error",
    message: REFRESH_ERROR_MESSAGE,
  });
});

test("use-draw-data wire resetDatasetCache + refreshStateFromSummary", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const source = readFileSync(path.join(root, "hooks/use-draw-data.ts"), "utf8");
  assert.match(source, /resetDatasetCache/);
  assert.match(source, /refreshStateFromSummary/);
  assert.match(source, /refreshDataset/);
  assert.match(source, /loadDataset/);
});
