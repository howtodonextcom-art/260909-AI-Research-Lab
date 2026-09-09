/**
 * Node-only snapshot persistence. Never imported by client code.
 *
 * Writes go to a temporary file in the same directory and are then renamed,
 * which is atomic on the same filesystem. A reader therefore sees either the
 * old file or the new one, never a half-written one. The temp file is removed
 * on both success and failure.
 */
import { readFile, rename, rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { parseDrawsJsonl, serializeDrawsJsonl } from "./jsonl";
import { isManifest } from "./manifest";
import type { SnapshotState } from "./sync";
import type { DatasetManifest, DrawRecord } from "./types";

export const DATA_DIR = "public/data";
export const SNAPSHOT_FILE = "power645.jsonl";
export const MANIFEST_FILE = "power645.manifest.json";

export type SnapshotPaths = { snapshot: string; manifest: string };

export function resolvePaths(root: string): SnapshotPaths {
  return {
    snapshot: path.join(root, DATA_DIR, SNAPSHOT_FILE),
    manifest: path.join(root, DATA_DIR, MANIFEST_FILE),
  };
}

async function readIfPresent(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function loadSnapshot(paths: SnapshotPaths): Promise<SnapshotState> {
  const text = await readIfPresent(paths.snapshot);
  if (text === null) return { records: [], manifest: null };

  const parsed = parseDrawsJsonl(text);
  if (parsed.issues.length) {
    throw new Error(
      `Snapshot local hỏng: ${parsed.issues.length} bản ghi lỗi. ` +
        `Ví dụ: ${parsed.issues[0].reason}`,
    );
  }

  const manifestText = await readIfPresent(paths.manifest);
  let manifest: DatasetManifest | null = null;
  if (manifestText) {
    try {
      const candidate: unknown = JSON.parse(manifestText);
      manifest = isManifest(candidate) ? candidate : null;
    } catch {
      manifest = null; // A broken manifest is recoverable; the dataset is the source of truth.
    }
  }

  return { records: parsed.records, manifest };
}

async function writeAtomic(target: string, contents: string): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(temp, contents, "utf8");
    await rename(temp, target);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

/** Dataset first, manifest last: the manifest must never describe a file that is not there yet. */
export async function saveSnapshot(
  paths: SnapshotPaths,
  records: DrawRecord[],
  manifest: DatasetManifest,
): Promise<void> {
  await writeAtomic(paths.snapshot, serializeDrawsJsonl(records));
  await writeAtomic(paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
}

export async function saveManifest(paths: SnapshotPaths, manifest: DatasetManifest): Promise<void> {
  await writeAtomic(paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
}
