/**
 * IndexedDB cache for the draw dataset.
 *
 * IndexedDB rather than localStorage: the dataset is ~150 KB today and grows
 * every draw, which is the wrong shape for a synchronous 5 MB string store.
 *
 * Every operation degrades to a no-op instead of throwing. A browser with
 * storage disabled, a private window, or a server render must still leave the
 * app fully usable on the bundled snapshot.
 */
import { isManifest } from "./manifest";
import { normalizeDraw, sortDraws } from "./schema";
import type { DatasetManifest, DrawRecord } from "./types";

const DB_NAME = "mega645-research-lab";
const DB_VERSION = 1;
const STORE = "snapshot";
const RECORDS_KEY = "records";
const MANIFEST_KEY = "manifest";

export type CachedSnapshot = {
  records: DrawRecord[];
  manifest: DatasetManifest | null;
};

function hasIndexedDb(): boolean {
  return typeof globalThis !== "undefined" && typeof globalThis.indexedDB !== "undefined";
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) return Promise.resolve(null);
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function runTransaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return new Promise((resolve) => {
    let request: IDBRequest<T>;
    try {
      request = work(db.transaction(STORE, mode).objectStore(STORE));
    } catch {
      resolve(null);
      return;
    }
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

/**
 * Reads the cache, re-validating every record on the way out.
 * Cached data is treated as untrusted: it may have been written by an older
 * version of this code, or edited by hand in devtools.
 */
export async function readCache(): Promise<CachedSnapshot | null> {
  const db = await openDatabase();
  if (!db) return null;
  try {
    const rawRecords = await runTransaction<unknown>(db, "readonly", (store) => store.get(RECORDS_KEY));
    if (!Array.isArray(rawRecords)) return null;

    const records: DrawRecord[] = [];
    for (const raw of rawRecords) {
      const outcome = normalizeDraw(raw);
      if (!outcome.ok) return null; // A single bad row invalidates the whole cache.
      records.push(outcome.record);
    }
    if (!records.length) return null;

    const rawManifest = await runTransaction<unknown>(db, "readonly", (store) => store.get(MANIFEST_KEY));
    return {
      records: sortDraws(records),
      manifest: isManifest(rawManifest) ? rawManifest : null,
    };
  } finally {
    db.close();
  }
}

export async function writeCache(records: DrawRecord[], manifest: DatasetManifest): Promise<boolean> {
  const db = await openDatabase();
  if (!db) return false;
  try {
    const stored = await runTransaction(db, "readwrite", (store) => store.put(records, RECORDS_KEY));
    if (stored === null) return false;
    await runTransaction(db, "readwrite", (store) => store.put(manifest, MANIFEST_KEY));
    return true;
  } finally {
    db.close();
  }
}

export async function writeCachedManifest(manifest: DatasetManifest): Promise<boolean> {
  const db = await openDatabase();
  if (!db) return false;
  try {
    const stored = await runTransaction(db, "readwrite", (store) => store.put(manifest, MANIFEST_KEY));
    return stored !== null;
  } finally {
    db.close();
  }
}

export async function clearCache(): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  try {
    await runTransaction(db, "readwrite", (store) => store.clear());
  } finally {
    db.close();
  }
}
