/**
 * Canonical data contracts for the Mega 6/45 draw dataset.
 *
 * Schema note: the on-disk record shape is intentionally identical to the
 * upstream JSONL (`date`, `id`, `result`, `process_time`) so the bundled
 * snapshot stays byte-compatible with the source and with existing analytics
 * code. Provenance that is constant for the whole file (product, source,
 * license, fetch time) lives in the manifest rather than being repeated on
 * every record.
 */

export const PRODUCT_ID = "mega645" as const;
export type ProductId = typeof PRODUCT_ID;

/** A validated draw. `result` is always six distinct integers in 1..45, ascending. */
export type DrawRecord = {
  date: string; // YYYY-MM-DD
  id: string;
  result: number[];
  process_time?: string;
};

/** Whatever a source hands back before normalization. Shape is untrusted. */
export type RawDraw = unknown;

export type ValidationIssue = {
  /** Index within the fetched batch, when known. */
  index: number | null;
  id: string | null;
  reason: string;
};

export type ConflictRecord = {
  id: string;
  existing: DrawRecord;
  incoming: DrawRecord;
};

export type MergeResult = {
  records: DrawRecord[];
  added: number;
  unchanged: number;
  duplicates: number;
  conflicts: ConflictRecord[];
};

export type SyncStatus = "ok" | "not-modified" | "failed";

export type SyncSummary = {
  status: SyncStatus;
  fetched: number;
  valid: number;
  added: number;
  unchanged: number;
  duplicates: number;
  conflicts: number;
  rejected: number;
  totalAfterMerge: number;
  firstDrawDate: string | null;
  latestDrawDate: string | null;
  source: string;
  fetchedAt: string;
  datasetHash: string;
  issues: ValidationIssue[];
  conflictDetails: ConflictRecord[];
  /** Present when status is "failed". */
  error?: string;
};

export type SourceDescriptor = {
  id: string;
  url: string;
  license: string;
};

export type DatasetManifest = {
  schemaVersion: number;
  product: ProductId;
  recordCount: number;
  firstDrawDate: string | null;
  latestDrawDate: string | null;
  lastAttemptedSync: string | null;
  lastSuccessfulSync: string | null;
  source: SourceDescriptor;
  /** Conditional-request token from the last successful fetch, when offered. */
  sourceEtag: string | null;
  datasetSha256: string;
  validation: {
    valid: boolean;
    duplicates: number;
    conflicts: number;
    rejected: number;
  };
};

/** Cursor handed to a source so it can skip work when nothing changed. */
export type SyncCursor = {
  etag: string | null;
  latestDrawDate: string | null;
  latestId: string | null;
};

export type FetchOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

/**
 * `null` means "the source reports nothing changed" (e.g. HTTP 304); it is
 * distinct from an empty array, which would mean "the source returned no rows".
 */
export type SourceResponse = {
  raw: RawDraw[] | null;
  etag: string | null;
};
