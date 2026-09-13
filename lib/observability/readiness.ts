/**
 * Pure readiness-check logic for `/api/readiness` (§17).
 *
 * Deliberately dependency-injected: the route handler supplies real fetchers
 * (same-origin `fetch` against the app's own bundled static assets under
 * `/data/*`, which is how this app already ships its dataset/manifest/lock —
 * see `lib/data/refresh.ts`'s `BUNDLED_SNAPSHOT_URL`/`BUNDLED_MANIFEST_URL`
 * and `app/page.tsx`'s `fetch("/data/protocol-lock.json")`), while tests
 * supply fixed/failing fetchers — no network, no filesystem access needed
 * here (a deployed Cloudflare Worker isolate has no writable/readable local
 * filesystem at request time; `lib/data/persistence.ts`'s Node `fs` access
 * is CLI/build-time only and is never imported by this module).
 *
 * This is NOT a check of live Vietlott upstream reachability — that would
 * make readiness depend on a third party this app doesn't control. It only
 * answers "can this Worker serve the research app correctly right now" by
 * checking the artifacts the app itself ships and depends on to render.
 */
import { parseDrawsJsonl, serializeDrawsJsonl } from "../data/jsonl";
import { isManifest } from "../data/manifest";
import { sha256Hex } from "../data/hash";
import { parseProtocolLock } from "../research/protocol";

export type ReadinessCheckResult = {
  name: string;
  ok: boolean;
  detail: string;
};

export type ReadinessReport = {
  ok: boolean;
  checkedAt: string;
  checks: ReadinessCheckResult[];
};

export type ReadinessDeps = {
  /** Raw text of `/data/power645.jsonl`, or null if unreachable/non-200. */
  fetchDataset: () => Promise<string | null>;
  /** Parsed JSON of `/data/power645.manifest.json`, or null if unreachable/non-200/invalid JSON. */
  fetchManifest: () => Promise<unknown | null>;
  /** Parsed JSON of `/data/protocol-lock.json`, or null if unreachable/non-200/invalid JSON. */
  fetchProtocolLock: () => Promise<unknown | null>;
  /**
   * Parsed JSON of one more required bundled artifact (this app checks
   * `/data/experiment-family.json`, but the check itself is generic —
   * "at least one required artifact directory reachable").
   */
  fetchRequiredArtifact: () => Promise<unknown | null>;
  now?: () => Date;
};

async function checkDataset(deps: ReadinessDeps): Promise<{ result: ReadinessCheckResult; datasetText: string | null }> {
  let text: string | null;
  try {
    text = await deps.fetchDataset();
  } catch (error) {
    return {
      result: { name: "dataset", ok: false, detail: `fetch lỗi: ${error instanceof Error ? error.message : String(error)}` },
      datasetText: null,
    };
  }
  if (text === null) {
    return { result: { name: "dataset", ok: false, detail: "không tải được power645.jsonl (unreachable / non-200)" }, datasetText: null };
  }
  const parsed = parseDrawsJsonl(text);
  if (parsed.issues.length) {
    return {
      result: { name: "dataset", ok: false, detail: `power645.jsonl có ${parsed.issues.length} bản ghi lỗi` },
      datasetText: text,
    };
  }
  if (!parsed.records.length) {
    return { result: { name: "dataset", ok: false, detail: "power645.jsonl rỗng" }, datasetText: text };
  }
  return {
    result: { name: "dataset", ok: true, detail: `${parsed.records.length} bản ghi, parseable` },
    datasetText: text,
  };
}

async function checkManifest(deps: ReadinessDeps, datasetText: string | null): Promise<ReadinessCheckResult> {
  let value: unknown;
  try {
    value = await deps.fetchManifest();
  } catch (error) {
    return { name: "manifest", ok: false, detail: `fetch lỗi: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (value === null) {
    return { name: "manifest", ok: false, detail: "không tải được power645.manifest.json (unreachable / non-200)" };
  }
  if (!isManifest(value)) {
    return { name: "manifest", ok: false, detail: "manifest không đúng schema DatasetManifest" };
  }
  if (datasetText === null) {
    return { name: "manifest", ok: false, detail: "có manifest nhưng không có dataset để đối chiếu hash" };
  }
  const parsedDataset = parseDrawsJsonl(datasetText);
  if (parsedDataset.issues.length) {
    return { name: "manifest", ok: false, detail: "dataset lỗi — bỏ qua đối chiếu hash manifest" };
  }
  const recomputedHash = await sha256Hex(serializeDrawsJsonl(parsedDataset.records));
  if (recomputedHash !== value.datasetSha256) {
    return {
      name: "manifest",
      ok: false,
      detail: `hash không khớp: manifest=${value.datasetSha256.slice(0, 12)}… dataset=${recomputedHash.slice(0, 12)}…`,
    };
  }
  return { name: "manifest", ok: true, detail: "hiện diện, đúng schema, hash khớp dataset" };
}

async function checkProtocolLock(deps: ReadinessDeps): Promise<ReadinessCheckResult> {
  let value: unknown;
  try {
    value = await deps.fetchProtocolLock();
  } catch (error) {
    return { name: "protocolLock", ok: false, detail: `fetch lỗi: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (value === null) {
    return { name: "protocolLock", ok: false, detail: "không tải được protocol-lock.json (unreachable / non-200)" };
  }
  const lock = parseProtocolLock(value);
  if (!lock) {
    return { name: "protocolLock", ok: false, detail: "protocol-lock.json không đúng schema ProtocolLock" };
  }
  return { name: "protocolLock", ok: true, detail: `hiện diện, version=${lock.protocolVersion}` };
}

async function checkRequiredArtifact(deps: ReadinessDeps): Promise<ReadinessCheckResult> {
  let value: unknown;
  try {
    value = await deps.fetchRequiredArtifact();
  } catch (error) {
    return { name: "requiredArtifact", ok: false, detail: `fetch lỗi: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (value === null) {
    return { name: "requiredArtifact", ok: false, detail: "không tải được artifact bắt buộc (unreachable / non-200)" };
  }
  if (typeof value !== "object" || value === null) {
    return { name: "requiredArtifact", ok: false, detail: "artifact bắt buộc không phải JSON object" };
  }
  return { name: "requiredArtifact", ok: true, detail: "artifact bắt buộc hiện diện, parseable" };
}

export async function checkReadiness(deps: ReadinessDeps): Promise<ReadinessReport> {
  const now = deps.now ?? (() => new Date());
  const { result: datasetResult, datasetText } = await checkDataset(deps);
  const manifestResult = await checkManifest(deps, datasetText);
  const protocolLockResult = await checkProtocolLock(deps);
  const requiredArtifactResult = await checkRequiredArtifact(deps);
  const checks = [datasetResult, manifestResult, protocolLockResult, requiredArtifactResult];
  return {
    ok: checks.every((c) => c.ok),
    checkedAt: now().toISOString(),
    checks,
  };
}
