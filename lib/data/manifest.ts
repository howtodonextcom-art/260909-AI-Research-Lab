/**
 * Manifest construction.
 *
 * Every field is derived from the canonical dataset. Nothing here is
 * hard-coded, so the manifest cannot drift away from the data it describes.
 * `lastAttemptedSync` and `lastSuccessfulSync` are deliberately separate: a
 * failed network call must not make the dataset look fresh.
 */
import { analyzeContinuity } from "./continuity";
import type { CrossCheckReport } from "./cross-check";
import { sha256Hex } from "./hash";
import { serializeDrawsJsonl } from "./jsonl";
import type { CrossCheckManifestSummary, DatasetManifest, DrawRecord, SourceDescriptor } from "./types";
import { PRODUCT_ID } from "./types";

export const MANIFEST_SCHEMA_VERSION = 2;

export type BuildManifestInput = {
  records: DrawRecord[];
  source: SourceDescriptor;
  /** The demoted cross-check-only source, when one was consulted for this build. */
  secondarySource?: SourceDescriptor | null;
  attemptedAt: string;
  /** Null when this attempt failed; the previous value should be carried over. */
  succeededAt: string | null;
  sourceEtag: string | null;
  duplicates: number;
  conflicts: number;
  rejected: number;
  /** Result of the last cross-source spot verification, if one has been run at all. */
  crossCheck?: CrossCheckReport | null;
  /** Carried forward from a previous manifest when this build did not itself run a cross-check. */
  previousCrossCheck?: CrossCheckManifestSummary | null;
};

function crossCheckSummary(input: BuildManifestInput): CrossCheckManifestSummary {
  if (input.crossCheck) {
    return {
      status: input.crossCheck.status,
      sampleSize: input.crossCheck.sampleSize,
      checkedAt: input.attemptedAt,
    };
  }
  return input.previousCrossCheck ?? { status: "NOT_RUN", sampleSize: 0, checkedAt: null };
}

export async function buildManifest(input: BuildManifestInput): Promise<DatasetManifest> {
  const serialized = serializeDrawsJsonl(input.records);
  const datasetSha256 = await sha256Hex(serialized);
  const sorted = input.records;
  const continuity = analyzeContinuity(sorted);

  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    product: PRODUCT_ID,
    recordCount: sorted.length,
    firstDrawId: continuity.firstId,
    firstDrawDate: sorted.length ? sorted[0].date : null,
    latestDrawId: continuity.latestId,
    latestDrawDate: sorted.length ? sorted[sorted.length - 1].date : null,
    lastAttemptedSync: input.attemptedAt,
    lastSuccessfulSync: input.succeededAt,
    source: { primary: input.source, secondary: input.secondarySource ?? null },
    sourceEtag: input.sourceEtag,
    datasetSha256,
    validation: {
      valid: input.conflicts === 0 && input.rejected === 0,
      duplicates: input.duplicates,
      conflicts: input.conflicts,
      rejected: input.rejected,
      missingIds: continuity.missingIds,
    },
    crossCheck: crossCheckSummary(input),
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
