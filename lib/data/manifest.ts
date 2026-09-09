/**
 * Manifest construction.
 *
 * Every field is derived from the canonical dataset. Nothing here is
 * hard-coded, so the manifest cannot drift away from the data it describes.
 * `lastAttemptedSync` and `lastSuccessfulSync` are deliberately separate: a
 * failed network call must not make the dataset look fresh.
 */
import { sha256Hex } from "./hash";
import { serializeDrawsJsonl } from "./jsonl";
import type { DatasetManifest, DrawRecord, SourceDescriptor } from "./types";
import { PRODUCT_ID } from "./types";

export const MANIFEST_SCHEMA_VERSION = 1;

export type BuildManifestInput = {
  records: DrawRecord[];
  source: SourceDescriptor;
  attemptedAt: string;
  /** Null when this attempt failed; the previous value should be carried over. */
  succeededAt: string | null;
  sourceEtag: string | null;
  duplicates: number;
  conflicts: number;
  rejected: number;
};

export async function buildManifest(input: BuildManifestInput): Promise<DatasetManifest> {
  const serialized = serializeDrawsJsonl(input.records);
  const datasetSha256 = await sha256Hex(serialized);
  const sorted = input.records;

  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    product: PRODUCT_ID,
    recordCount: sorted.length,
    firstDrawDate: sorted.length ? sorted[0].date : null,
    latestDrawDate: sorted.length ? sorted[sorted.length - 1].date : null,
    lastAttemptedSync: input.attemptedAt,
    lastSuccessfulSync: input.succeededAt,
    source: input.source,
    sourceEtag: input.sourceEtag,
    datasetSha256,
    validation: {
      valid: input.conflicts === 0 && input.rejected === 0,
      duplicates: input.duplicates,
      conflicts: input.conflicts,
      rejected: input.rejected,
    },
  };
}

export function isManifest(value: unknown): value is DatasetManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<DatasetManifest>;
  return (
    typeof manifest.schemaVersion === "number" &&
    manifest.product === PRODUCT_ID &&
    typeof manifest.recordCount === "number" &&
    typeof manifest.datasetSha256 === "string"
  );
}
