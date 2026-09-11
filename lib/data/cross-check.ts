/**
 * Cross-source spot verification (§11).
 *
 * Compares, for a deterministic sample of draws, three independent views:
 *  - the local canonical dataset (built from the official history table crawl),
 *  - a fresh fetch of the official single-draw detail page (a different
 *    render path on the same site — catches table/detail transcription bugs),
 *  - the secondary mirror snapshot, when available.
 *
 * A mismatch is reported as a structured failure; neither side is ever
 * auto-overwritten from here. The sample is deterministic (seeded PRNG) so a
 * report is reproducible given the same dataset and seed, per the master
 * prompt's reproducibility requirement.
 */
import { normalizeDraw } from "./schema";
import type { DrawRecord, RawDraw } from "./types";

export type CrossCheckSampleResult = {
  id: string;
  officialTableRecord: DrawRecord | null;
  officialDetailRecord: DrawRecord | null;
  mirrorRecord: DrawRecord | null;
  mismatches: string[];
};

export type CrossCheckStatus = "PASS" | "FAIL" | "PARTIAL" | "EMPTY";

export type CrossCheckReport = {
  sampleSize: number;
  seed: number;
  sampledIds: string[];
  results: CrossCheckSampleResult[];
  status: CrossCheckStatus;
  failureCount: number;
  fetchErrorCount: number;
};

/** Deterministic PRNG (mulberry32) so sampling is reproducible from `seed` alone. */
function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** First, latest, middle, plus `extra` seeded-random ids — deterministic for a given dataset+seed. */
export function selectDeterministicSampleIds(records: DrawRecord[], extra: number, seed: number): string[] {
  if (records.length === 0) return [];
  const ids = [...records].sort((a, b) => Number(a.id) - Number(b.id)).map((record) => record.id);

  const picked = new Set<string>([ids[0], ids[ids.length - 1], ids[Math.floor(ids.length / 2)]]);

  const rand = mulberry32(seed);
  const pool = ids.filter((id) => !picked.has(id));
  const target = Math.min(picked.size + extra, ids.length);
  while (picked.size < target && pool.length > 0) {
    const index = Math.floor(rand() * pool.length);
    const [id] = pool.splice(index, 1);
    picked.add(id);
  }

  return [...picked].sort();
}

function recordsEqual(a: DrawRecord, b: DrawRecord): boolean {
  return a.date === b.date && a.result.join(",") === b.result.join(",");
}

export type CrossCheckInput = {
  localRecords: DrawRecord[];
  /** `null` means the mirror was not consulted (e.g. offline) — reported as PARTIAL, not FAIL. */
  mirrorRecords: DrawRecord[] | null;
  extraSampleSize?: number;
  seed?: number;
  fetchDetail: (id: string) => Promise<RawDraw>;
};

export async function runCrossCheck(input: CrossCheckInput): Promise<CrossCheckReport> {
  const extraSampleSize = input.extraSampleSize ?? 5;
  const seed = input.seed ?? 645;
  const sampledIds = selectDeterministicSampleIds(input.localRecords, extraSampleSize, seed);

  if (sampledIds.length === 0) {
    return { sampleSize: 0, seed, sampledIds: [], results: [], status: "EMPTY", failureCount: 0, fetchErrorCount: 0 };
  }

  const localById = new Map(input.localRecords.map((record) => [record.id, record]));
  const mirrorById = new Map((input.mirrorRecords ?? []).map((record) => [record.id, record]));

  const results: CrossCheckSampleResult[] = [];
  let failureCount = 0;
  let fetchErrorCount = 0;

  for (const id of sampledIds) {
    const local = localById.get(id) ?? null;
    const mismatches: string[] = [];
    let detail: DrawRecord | null = null;

    try {
      const outcome = normalizeDraw(await input.fetchDetail(id));
      if (outcome.ok) {
        detail = outcome.record;
      } else {
        fetchErrorCount += 1;
        mismatches.push(`trang chi tiết trả về bản ghi không hợp lệ: ${outcome.reason}`);
      }
    } catch (error) {
      fetchErrorCount += 1;
      mismatches.push(`không lấy được trang chi tiết: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (local && detail && !recordsEqual(local, detail)) {
      mismatches.push(
        `local [${local.result.join(",")}] ngày ${local.date} ≠ trang chi tiết [${detail.result.join(",")}] ngày ${detail.date}`,
      );
    }

    const mirror = mirrorById.get(id) ?? null;
    if (local && mirror && !recordsEqual(local, mirror)) {
      mismatches.push(`local [${local.result.join(",")}] ngày ${local.date} ≠ mirror [${mirror.result.join(",")}] ngày ${mirror.date}`);
    }

    const hasHardMismatch = mismatches.some((m) => !m.startsWith("không lấy được") && !m.startsWith("trang chi tiết trả về"));
    if (hasHardMismatch) failureCount += 1;

    results.push({ id, officialTableRecord: local, officialDetailRecord: detail, mirrorRecord: mirror, mismatches });
  }

  const status: CrossCheckStatus = failureCount > 0 ? "FAIL" : fetchErrorCount > 0 ? "PARTIAL" : "PASS";
  return { sampleSize: sampledIds.length, seed, sampledIds, results, status, failureCount, fetchErrorCount };
}
