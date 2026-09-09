/**
 * Sync orchestration.
 *
 * Deliberately free of `fs` and of any concrete clock: storage and time are
 * injected, so the entire pipeline — including every failure path — is
 * testable without touching the network or the disk.
 *
 * Invariant enforced here: a snapshot on disk is replaced only after the
 * merged dataset has passed validation. Any earlier failure returns
 * `status: "failed"` and leaves the previous snapshot exactly as it was.
 */
import { buildManifest } from "./manifest";
import { mergeDraws, validateDataset } from "./merge";
import { serializeDrawsJsonl } from "./jsonl";
import { sha256Hex } from "./hash";
import type { DrawSourceAdapter } from "./sources/source-adapter";
import type {
  ConflictRecord,
  DatasetManifest,
  DrawRecord,
  SyncSummary,
  ValidationIssue,
} from "./types";

export type SnapshotState = {
  records: DrawRecord[];
  manifest: DatasetManifest | null;
};

export type SyncDeps = {
  adapter: DrawSourceAdapter;
  loadSnapshot(): Promise<SnapshotState>;
  /** Must write atomically: temp file first, then rename. */
  saveSnapshot(records: DrawRecord[], manifest: DatasetManifest): Promise<void>;
  /** Records an attempt without touching the dataset. */
  saveManifest(manifest: DatasetManifest): Promise<void>;
  now(): Date;
};

export type SyncOptions = {
  /** Ignores the stored ETag and re-fetches the whole snapshot. */
  force?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
};

function emptySummary(source: string, fetchedAt: string): SyncSummary {
  return {
    status: "failed",
    fetched: 0,
    valid: 0,
    added: 0,
    unchanged: 0,
    duplicates: 0,
    conflicts: 0,
    rejected: 0,
    totalAfterMerge: 0,
    firstDrawDate: null,
    latestDrawDate: null,
    source,
    fetchedAt,
    datasetHash: "",
    issues: [],
    conflictDetails: [],
  };
}

export async function runSync(deps: SyncDeps, options: SyncOptions = {}): Promise<SyncSummary> {
  const attemptedAt = deps.now().toISOString();
  const summary = emptySummary(deps.adapter.id, attemptedAt);

  let snapshot: SnapshotState;
  try {
    snapshot = await deps.loadSnapshot();
  } catch (error) {
    summary.error = `Không đọc được snapshot hiện tại: ${describe(error)}`;
    return summary;
  }

  // A corrupted local snapshot must not be silently used as a merge base.
  const snapshotCheck = validateDataset(snapshot.records);
  if (!snapshotCheck.valid) {
    summary.error = "Snapshot hiện tại không hợp lệ; dừng lại để tránh làm hỏng thêm dữ liệu.";
    summary.issues = snapshotCheck.issues;
    return summary;
  }

  const previousLatest = snapshot.records.length
    ? snapshot.records[snapshot.records.length - 1].date
    : null;
  const previousManifest = snapshot.manifest;
  const cursorEtag = options.force ? null : previousManifest?.sourceEtag ?? null;

  let response;
  try {
    response = cursorEtag
      ? await deps.adapter.fetchSince(
          { etag: cursorEtag, latestDrawDate: previousLatest, latestId: lastId(snapshot.records) },
          { signal: options.signal, timeoutMs: options.timeoutMs },
        )
      : await deps.adapter.fetchAll({ signal: options.signal, timeoutMs: options.timeoutMs });
  } catch (error) {
    summary.error = `Tải dữ liệu thất bại: ${describe(error)}`;
    summary.totalAfterMerge = snapshot.records.length;
    summary.firstDrawDate = snapshot.records[0]?.date ?? null;
    summary.latestDrawDate = previousLatest;
    summary.datasetHash = previousManifest?.datasetSha256 ?? "";
    await recordAttempt(deps, snapshot, previousManifest, attemptedAt);
    return summary;
  }

  // 304: nothing changed upstream. Refresh the attempt timestamp only.
  if (response.raw === null) {
    const serialized = serializeDrawsJsonl(snapshot.records);
    const manifest = await buildManifest({
      records: snapshot.records,
      source: {
        id: deps.adapter.id,
        url: deps.adapter.sourceUrl,
        license: deps.adapter.license,
      },
      attemptedAt,
      succeededAt: attemptedAt,
      sourceEtag: response.etag ?? cursorEtag,
      duplicates: 0,
      conflicts: 0,
      rejected: 0,
    });
    await deps.saveManifest(manifest);
    return {
      ...summary,
      status: "not-modified",
      totalAfterMerge: snapshot.records.length,
      firstDrawDate: snapshot.records[0]?.date ?? null,
      latestDrawDate: previousLatest,
      datasetHash: await sha256Hex(serialized),
    };
  }

  const issues: ValidationIssue[] = [];
  const normalized: DrawRecord[] = [];
  response.raw.forEach((raw, index) => {
    const outcome = deps.adapter.normalize(raw);
    if (outcome.ok) normalized.push(outcome.record);
    else issues.push({ index, id: outcome.id, reason: outcome.reason });
  });

  summary.fetched = response.raw.length;
  summary.valid = normalized.length;
  summary.rejected = issues.length;
  summary.issues = issues;

  if (issues.length) {
    summary.error = `${issues.length} bản ghi không hợp lệ từ nguồn; không ghi đè snapshot.`;
    summary.totalAfterMerge = snapshot.records.length;
    summary.firstDrawDate = snapshot.records[0]?.date ?? null;
    summary.latestDrawDate = previousLatest;
    summary.datasetHash = previousManifest?.datasetSha256 ?? "";
    await recordAttempt(deps, snapshot, previousManifest, attemptedAt);
    return summary;
  }

  const merged = mergeDraws(snapshot.records, normalized);
  summary.added = merged.added;
  summary.unchanged = merged.unchanged;
  summary.duplicates = merged.duplicates;
  summary.conflicts = merged.conflicts.length;
  summary.conflictDetails = merged.conflicts;

  if (merged.conflicts.length) {
    summary.error = conflictMessage(merged.conflicts);
    summary.totalAfterMerge = snapshot.records.length;
    summary.firstDrawDate = snapshot.records[0]?.date ?? null;
    summary.latestDrawDate = previousLatest;
    summary.datasetHash = previousManifest?.datasetSha256 ?? "";
    await recordAttempt(deps, snapshot, previousManifest, attemptedAt);
    return summary;
  }

  const datasetCheck = validateDataset(merged.records, previousLatest);
  if (!datasetCheck.valid) {
    summary.error = "Dữ liệu sau khi gộp không đạt kiểm tra toàn vẹn; giữ nguyên snapshot cũ.";
    summary.issues = [...issues, ...datasetCheck.issues];
    summary.totalAfterMerge = snapshot.records.length;
    summary.firstDrawDate = snapshot.records[0]?.date ?? null;
    summary.latestDrawDate = previousLatest;
    summary.datasetHash = previousManifest?.datasetSha256 ?? "";
    await recordAttempt(deps, snapshot, previousManifest, attemptedAt);
    return summary;
  }

  const manifest = await buildManifest({
    records: merged.records,
    source: { id: deps.adapter.id, url: deps.adapter.sourceUrl, license: deps.adapter.license },
    attemptedAt,
    succeededAt: attemptedAt,
    sourceEtag: response.etag,
    duplicates: merged.duplicates,
    conflicts: 0,
    rejected: 0,
  });

  try {
    await deps.saveSnapshot(merged.records, manifest);
  } catch (error) {
    summary.error = `Ghi snapshot thất bại: ${describe(error)}`;
    summary.totalAfterMerge = snapshot.records.length;
    summary.latestDrawDate = previousLatest;
    return summary;
  }

  return {
    ...summary,
    status: "ok",
    totalAfterMerge: merged.records.length,
    firstDrawDate: manifest.firstDrawDate,
    latestDrawDate: manifest.latestDrawDate,
    datasetHash: manifest.datasetSha256,
  };
}

function lastId(records: DrawRecord[]): string | null {
  return records.length ? records[records.length - 1].id : null;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function conflictMessage(conflicts: ConflictRecord[]): string {
  const sample = conflicts
    .slice(0, 3)
    .map((c) => `kỳ ${c.id}: đang có [${c.existing.result.join(",")}], nguồn trả [${c.incoming.result.join(",")}]`)
    .join("; ");
  return `Phát hiện ${conflicts.length} xung đột dữ liệu — không ghi đè. ${sample}`;
}

/** Failed attempts update `lastAttemptedSync` but never `lastSuccessfulSync`. */
async function recordAttempt(
  deps: SyncDeps,
  snapshot: SnapshotState,
  previousManifest: DatasetManifest | null,
  attemptedAt: string,
): Promise<void> {
  if (!previousManifest) return;
  try {
    await deps.saveManifest({
      ...previousManifest,
      recordCount: snapshot.records.length,
      lastAttemptedSync: attemptedAt,
    });
  } catch {
    // Losing the attempt timestamp is strictly less bad than masking the
    // original failure, so this is swallowed on purpose.
  }
}
