import { runSync, type SnapshotState } from "@/lib/data/sync";
import { VIETLOTT_DATA_SOURCE } from "@/lib/data/sources/vietlott-data";
import { vietlottOfficialAdapter } from "@/lib/data/sources/vietlott-official";
import type { DatasetManifest, DrawRecord } from "@/lib/data/types";

type RefreshRequest = {
  force?: boolean;
  records?: DrawRecord[];
  manifest?: DatasetManifest | null;
};

function withSecondary<T extends { source: { primary: unknown; secondary: unknown } }>(manifest: T): T {
  return { ...manifest, source: { ...manifest.source, secondary: VIETLOTT_DATA_SOURCE } };
}

export async function POST(request: Request) {
  let body: RefreshRequest;
  try {
    body = (await request.json()) as RefreshRequest;
  } catch {
    return Response.json({ error: "JSON body không hợp lệ." }, { status: 400 });
  }

  const snapshot: SnapshotState = {
    records: Array.isArray(body.records) ? body.records : [],
    manifest: body.manifest ?? null,
  };
  let savedRecords: DrawRecord[] | null = null;
  let savedManifest: DatasetManifest | null = null;

  const summary = await runSync(
    {
      adapter: vietlottOfficialAdapter,
      loadSnapshot: async () => snapshot,
      saveSnapshot: async (records, manifest) => {
        savedRecords = records;
        savedManifest = withSecondary(manifest);
      },
      saveManifest: async (manifest) => {
        savedManifest = withSecondary(manifest);
      },
      now: () => new Date(),
    },
    { force: Boolean(body.force), timeoutMs: 30_000 },
  );

  return Response.json({
    summary,
    records: savedRecords ?? undefined,
    manifest: savedManifest ?? undefined,
  });
}
