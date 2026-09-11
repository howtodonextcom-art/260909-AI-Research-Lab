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

export type CrossCheckManifestSummary = {
  status: "PASS" | "FAIL" | "PARTIAL" | "EMPTY" | "NOT_RUN";
  sampleSize: number;
  checkedAt: string | null;
};

/**
 * Manifest v2 (§13 of the research-core upgrade). Additive over v1: every v1
 * field keeps its name and meaning (`shouldAutoRefresh` and the existing UI
 * read several of them directly), so a v1 manifest on disk still satisfies
 * `isManifest`. New in v2: `firstDrawId`/`latestDrawId`, `source.secondary`
 * (the mirror is now cross-check-only, never authoritative — see ADR-001),
 * `continuity` (§9) and `crossCheck` (§11). `source` was restructured from a
 * flat descriptor to `{ primary, secondary }`; the only reader of the old
 * shape (`components/data-status.tsx`) was updated alongside this type.
 */
export type DatasetManifest = {
  schemaVersion: number;
  product: ProductId;
  recordCount: number;
  firstDrawId: string | null;
  firstDrawDate: string | null;
  latestDrawId: string | null;
  latestDrawDate: string | null;
  lastAttemptedSync: string | null;
  lastSuccessfulSync: string | null;
  source: {
    primary: SourceDescriptor;
    secondary: SourceDescriptor | null;
  };
  /** Conditional-request token (or, for the official adapter, the last-synced draw id — see vietlott-official.ts) from the last successful fetch, when offered. */
  sourceEtag: string | null;
  datasetSha256: string;
  validation: {
    valid: boolean;
    duplicates: number;
    conflicts: number;
    rejected: number;
    missingIds: string[];
  };
  crossCheck: CrossCheckManifestSummary;
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
