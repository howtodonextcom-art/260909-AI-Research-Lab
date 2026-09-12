import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runSync, type SnapshotState, type SyncDeps } from "./sync";
import { normalizeDraw } from "./schema";
import { serializeDrawsJsonl } from "./jsonl";
import { loadSnapshot, resolvePaths, saveManifest, saveSnapshot } from "./persistence";
import { buildManifest } from "./manifest";
import type { DatasetManifest, DrawRecord, RawDraw, SourceResponse } from "./types";
import type { DrawSourceAdapter } from "./sources/source-adapter";

const draw = (id: string, date: string, result: number[]): DrawRecord => ({ id, date, result });

const BASE: DrawRecord[] = [
  draw("00198", "2017-10-25", [12, 17, 23, 25, 34, 38]),
  draw("00199", "2017-10-27", [4, 10, 13, 21, 22, 38]),
  draw("00200", "2017-10-29", [1, 7, 15, 28, 33, 45]),
];

/** Adapter driven entirely by the test: returns rows, a 304, or throws. */
class FakeAdapter implements DrawSourceAdapter {
  readonly id = "fake-source";
  readonly sourceUrl = "https://raw.githubusercontent.com/fake/fake/main/data.jsonl";
  readonly license = "MIT";
  calls = 0;
  lastEtagSent: string | null = null;

  constructor(
    private readonly behaviour: () => SourceResponse | Promise<SourceResponse>,
    readonly etag: string | null = 'W/"etag-1"',
  ) {}

  async fetchAll(): Promise<SourceResponse> {
    this.calls += 1;
    this.lastEtagSent = null;
    return this.behaviour();
  }

  async fetchSince(cursor: { etag: string | null }): Promise<SourceResponse> {
    this.calls += 1;
    this.lastEtagSent = cursor.etag;
    return this.behaviour();
  }

  normalize(raw: RawDraw) {
    return normalizeDraw(raw);
  }
}

type Store = {
  state: SnapshotState;
  savedSnapshots: number;
  savedManifests: DatasetManifest[];
};

function makeDeps(adapter: DrawSourceAdapter, initial: SnapshotState): { deps: SyncDeps; store: Store } {
  const store: Store = { state: initial, savedSnapshots: 0, savedManifests: [] };
  const deps: SyncDeps = {
    adapter,
    loadSnapshot: async () => ({ records: [...store.state.records], manifest: store.state.manifest }),
    saveSnapshot: async (records, manifest) => {
      store.state = { records, manifest };
      store.savedSnapshots += 1;
      store.savedManifests.push(manifest);
    },
    saveManifest: async (manifest) => {
      store.state = { ...store.state, manifest };
      store.savedManifests.push(manifest);
    },
    now: () => new Date("2026-09-10T00:00:00.000Z"),
  };
  return { deps, store };
}

const rowsOf = (records: DrawRecord[]): RawDraw[] => records.map((r) => ({ ...r }));

test("dataset local rỗng thì tải toàn bộ lịch sử", async () => {
  const adapter = new FakeAdapter(() => ({ raw: rowsOf(BASE), etag: 'W/"etag-1"' }));
  const { deps, store } = makeDeps(adapter, { records: [], manifest: null });

  const summary = await runSync(deps);

  assert.equal(summary.status, "ok");
  assert.equal(summary.added, 3);
  assert.equal(summary.totalAfterMerge, 3);
  assert.equal(summary.firstDrawDate, "2017-10-25");
  assert.equal(summary.latestDrawDate, "2017-10-29");
  assert.equal(store.savedSnapshots, 1);
});

test("dataset đã đầy đủ thì added = 0 và hash không đổi", async () => {
  const adapter = new FakeAdapter(() => ({ raw: rowsOf(BASE), etag: 'W/"etag-1"' }));
  const { deps, store } = makeDeps(adapter, { records: BASE, manifest: null });

  const first = await runSync(deps);
  assert.equal(first.status, "ok");
  assert.equal(first.added, 0);
  assert.equal(first.unchanged, 3);

  const second = await runSync({ ...deps, loadSnapshot: async () => store.state });
  assert.equal(second.added, 0);
  assert.equal(second.datasetHash, first.datasetHash, "sync lặp lại phải cho cùng hash");
});

test("upstream thêm một kỳ thì added = 1", async () => {
  const extended = [...BASE, draw("00201", "2017-11-01", [2, 4, 6, 8, 10, 12])];
  const adapter = new FakeAdapter(() => ({ raw: rowsOf(extended), etag: 'W/"etag-2"' }));
  const { deps, store } = makeDeps(adapter, { records: BASE, manifest: null });

  const summary = await runSync(deps);

  assert.equal(summary.status, "ok");
  assert.equal(summary.added, 1);
  assert.equal(summary.totalAfterMerge, 4);
  assert.equal(summary.latestDrawDate, "2017-11-01");
  assert.equal(store.state.records.length, 4);
});

test("xung đột từ upstream không ghi đè snapshot", async () => {
  const conflicting = [draw("00198", "2017-10-25", [1, 2, 3, 4, 5, 6]), ...BASE.slice(1)];
  const adapter = new FakeAdapter(() => ({ raw: rowsOf(conflicting), etag: 'W/"etag-3"' }));
  const { deps, store } = makeDeps(adapter, { records: BASE, manifest: null });

  const summary = await runSync(deps);

  assert.equal(summary.status, "failed");
  assert.equal(summary.conflicts, 1);
  assert.ok(summary.error?.includes("xung đột"));
  assert.equal(store.savedSnapshots, 0, "không được ghi snapshot khi có xung đột");
  assert.deepEqual(store.state.records.find((r) => r.id === "00198")!.result, [12, 17, 23, 25, 34, 38]);
});

test("lỗi mạng giữa chừng thì snapshot cũ nguyên vẹn", async () => {
  const adapter = new FakeAdapter(() => {
    throw new Error("ECONNRESET giữa chừng");
  });
  const { deps, store } = makeDeps(adapter, { records: BASE, manifest: null });

  const summary = await runSync(deps);

  assert.equal(summary.status, "failed");
  assert.ok(summary.error?.includes("Tải dữ liệu thất bại"));
  assert.equal(summary.totalAfterMerge, 3, "báo cáo vẫn phản ánh dữ liệu đang có");
  assert.equal(store.savedSnapshots, 0);
  assert.equal(store.state.records.length, 3);
});

test("timeout được xử lý như lỗi, không mất dữ liệu", async () => {
  const adapter = new FakeAdapter(() => {
    const error = new Error("timeout");
    error.name = "AbortError";
    throw error;
  });
  const { deps, store } = makeDeps(adapter, { records: BASE, manifest: null });

  const summary = await runSync(deps);
  assert.equal(summary.status, "failed");
  assert.equal(store.state.records.length, 3);
});

test("bản ghi lỗi từ upstream chặn toàn bộ lần ghi", async () => {
  const adapter = new FakeAdapter(() => ({
    raw: [...rowsOf(BASE), { date: "2026-02-30", id: "00299", result: [1, 2, 3, 4, 5, 6] }],
    etag: null,
  }));
  const { deps, store } = makeDeps(adapter, { records: BASE, manifest: null });

  const summary = await runSync(deps);

  assert.equal(summary.status, "failed");
  assert.equal(summary.rejected, 1);
  assert.equal(summary.issues.length, 1);
  assert.equal(store.savedSnapshots, 0);
});

test("upstream đổi schema thì bị từ chối chứ không ghi dữ liệu rác", async () => {
  const adapter = new FakeAdapter(() => ({
    raw: [{ drawDate: "2026-09-08", numbers: "1,2,3,4,5,6" }],
    etag: null,
  }));
  const { deps, store } = makeDeps(adapter, { records: BASE, manifest: null });

  const summary = await runSync(deps);
  assert.equal(summary.status, "failed");
  assert.equal(summary.rejected, 1);
  assert.equal(store.savedSnapshots, 0);
});

test("304 Not Modified giữ nguyên dữ liệu và báo không có gì mới", async () => {
  const adapter = new FakeAdapter(() => ({ raw: null, etag: 'W/"etag-1"' }));
  const manifest = await buildManifest({
    records: BASE,
    source: { id: "fake-source", url: "https://raw.githubusercontent.com/fake/fake/main/data.jsonl", license: "MIT" },
    attemptedAt: "2026-09-01T00:00:00.000Z",
    succeededAt: "2026-09-01T00:00:00.000Z",
    sourceEtag: 'W/"etag-1"',
    duplicates: 0,
    conflicts: 0,
    rejected: 0,
  });
  const { deps, store } = makeDeps(adapter, { records: BASE, manifest });

  const summary = await runSync(deps);

  assert.equal(summary.status, "not-modified");
  assert.equal(summary.added, 0);
  assert.equal(summary.totalAfterMerge, 3);
  assert.equal(adapter.lastEtagSent, 'W/"etag-1"', "phải gửi kèm ETag đã lưu");
  assert.equal(store.savedSnapshots, 0);
});

test("lastSuccessfulSync không đổi khi sync thất bại", async () => {
  const previous = await buildManifest({
    records: BASE,
    source: { id: "fake-source", url: "https://raw.githubusercontent.com/fake/fake/main/data.jsonl", license: "MIT" },
    attemptedAt: "2026-09-01T00:00:00.000Z",
    succeededAt: "2026-09-01T00:00:00.000Z",
    sourceEtag: null,
    duplicates: 0,
    conflicts: 0,
    rejected: 0,
  });
  const adapter = new FakeAdapter(() => {
    throw new Error("mạng hỏng");
  });
  const { deps, store } = makeDeps(adapter, { records: BASE, manifest: previous });

  const summary = await runSync(deps);

  assert.equal(summary.status, "failed");
  const latest = store.savedManifests.at(-1)!;
  assert.equal(latest.lastSuccessfulSync, "2026-09-01T00:00:00.000Z", "thành công gần nhất phải giữ nguyên");
  assert.equal(latest.lastAttemptedSync, "2026-09-10T00:00:00.000Z", "lần thử phải được cập nhật");
});

test("snapshot local hỏng thì dừng lại thay vì gộp tiếp", async () => {
  const adapter = new FakeAdapter(() => ({ raw: rowsOf(BASE), etag: null }));
  const corrupted = [BASE[0], { ...BASE[0] }];
  const { deps, store } = makeDeps(adapter, { records: corrupted, manifest: null });

  const summary = await runSync(deps);

  assert.equal(summary.status, "failed");
  assert.ok(summary.error?.includes("không hợp lệ"));
  assert.equal(adapter.calls, 0, "không gọi mạng khi dữ liệu nền đã hỏng");
  assert.equal(store.savedSnapshots, 0);
});

test("--force bỏ qua ETag và tải lại toàn bộ", async () => {
  const adapter = new FakeAdapter(() => ({ raw: rowsOf(BASE), etag: 'W/"etag-9"' }));
  const manifest = await buildManifest({
    records: BASE,
    source: { id: "fake-source", url: "https://raw.githubusercontent.com/fake/fake/main/data.jsonl", license: "MIT" },
    attemptedAt: "2026-09-01T00:00:00.000Z",
    succeededAt: "2026-09-01T00:00:00.000Z",
    sourceEtag: 'W/"etag-1"',
    duplicates: 0,
    conflicts: 0,
    rejected: 0,
  });
  const { deps } = makeDeps(adapter, { records: BASE, manifest });

  await runSync(deps, { force: true });
  assert.equal(adapter.lastEtagSent, null, "force phải bỏ qua ETag đã lưu");
});

test("ghi snapshot là atomic và không để lại file tạm", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mega645-sync-"));
  const paths = resolvePaths(root);
  const manifest = await buildManifest({
    records: BASE,
    source: { id: "fake-source", url: "https://raw.githubusercontent.com/fake/fake/main/data.jsonl", license: "MIT" },
    attemptedAt: "2026-09-10T00:00:00.000Z",
    succeededAt: "2026-09-10T00:00:00.000Z",
    sourceEtag: null,
    duplicates: 0,
    conflicts: 0,
    rejected: 0,
  });

  await saveSnapshot(paths, BASE, manifest);

  const entries = await readdir(path.join(root, "public/data"));
  assert.deepEqual(entries.filter((name) => name.endsWith(".tmp")), [], "không được còn file .tmp");
  assert.equal(await readFile(paths.snapshot, "utf8"), serializeDrawsJsonl(BASE));

  const reloaded = await loadSnapshot(paths);
  assert.equal(reloaded.records.length, 3);
  assert.equal(reloaded.manifest?.datasetSha256, manifest.datasetSha256);

  await saveManifest(paths, { ...manifest, lastAttemptedSync: "2026-09-11T00:00:00.000Z" });
  const after = await readdir(path.join(root, "public/data"));
  assert.deepEqual(after.filter((name) => name.endsWith(".tmp")), []);
});

test("loadSnapshot từ chối file local hỏng", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mega645-corrupt-"));
  const paths = resolvePaths(root);
  await saveSnapshot(paths, BASE, await buildManifest({
    records: BASE,
    source: { id: "fake-source", url: "https://raw.githubusercontent.com/fake/fake/main/data.jsonl", license: "MIT" },
    attemptedAt: "2026-09-10T00:00:00.000Z",
    succeededAt: "2026-09-10T00:00:00.000Z",
    sourceEtag: null,
    duplicates: 0,
    conflicts: 0,
    rejected: 0,
  }));
  await writeFile(paths.snapshot, '{"date":"2017-10-25","id":"00198","result":[12,17,23]}\n', "utf8");

  await assert.rejects(() => loadSnapshot(paths), /Snapshot local hỏng/);
});

test("dataset sau merge bị đứt kỳ thì fail-closed, không ghi", async () => {
  const gapped = [BASE[0], BASE[2]];
  const adapter = new FakeAdapter(() => ({ raw: rowsOf(gapped), etag: 'W/"etag-gap"' }));
  const { deps, store } = makeDeps(adapter, { records: [], manifest: null });

  const summary = await runSync(deps);

  assert.equal(summary.status, "failed");
  assert.match(summary.error ?? "", /không liên tục|Dataset rỗng/);
  assert.equal(store.savedSnapshots, 0);
});

test("--allow-gaps cho phép ghi snapshot đứt kỳ", async () => {
  const gapped = [BASE[0], BASE[2]];
  const adapter = new FakeAdapter(() => ({ raw: rowsOf(gapped), etag: 'W/"etag-gap"' }));
  const { deps, store } = makeDeps(adapter, { records: [], manifest: null });

  const summary = await runSync(deps, { allowGaps: true });

  assert.equal(summary.status, "ok");
  assert.equal(store.savedSnapshots, 1);
  assert.equal(store.state.records.length, 2);
});

test("manifest được tính từ dữ liệu, không hard-code", async () => {
  const manifest = await buildManifest({
    records: BASE,
    source: { id: "fake-source", url: "https://raw.githubusercontent.com/fake/fake/main/data.jsonl", license: "MIT" },
    attemptedAt: "2026-09-10T00:00:00.000Z",
    succeededAt: null,
    sourceEtag: null,
    duplicates: 0,
    conflicts: 2,
    rejected: 0,
  });
  assert.equal(manifest.recordCount, 3);
  assert.equal(manifest.firstDrawDate, "2017-10-25");
  assert.equal(manifest.latestDrawDate, "2017-10-29");
  assert.equal(manifest.lastSuccessfulSync, null);
  assert.equal(manifest.validation.valid, false, "có xung đột thì không thể hợp lệ");
  assert.match(manifest.datasetSha256, /^[0-9a-f]{64}$/);
});
