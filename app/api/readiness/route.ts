import { checkReadiness, type ReadinessDeps } from "@/lib/observability/readiness";
import { generateRequestId, logEvent } from "@/lib/observability/logger";
import { applySecurityHeaders } from "@/lib/security/headers";

/**
 * Real dependency readiness probe (§17): bundled dataset present and
 * parseable, manifest present and hash-consistent with the dataset,
 * protocol lock present, and at least one other required bundled artifact
 * reachable. All four checks fetch this app's own same-origin static assets
 * under `/data/*` — the exact files `app/page.tsx` and `lib/data/refresh.ts`
 * already fetch client-side — never a third-party/upstream URL, so this
 * never becomes a live-Vietlott-uptime check (out of scope by design).
 *
 * 200 when every check passes; 503 with a JSON body naming every failing
 * check when any does not. Never a static/fabricated "always ready" 200.
 */
async function fetchJsonAsset(origin: string, pathname: string): Promise<unknown | null> {
  try {
    const response = await fetch(new URL(pathname, origin));
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchTextAsset(origin: string, pathname: string): Promise<string | null> {
  try {
    const response = await fetch(new URL(pathname, origin));
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const requestId = generateRequestId();
  const start = Date.now();
  const origin = new URL(request.url).origin;

  const deps: ReadinessDeps = {
    fetchDataset: () => fetchTextAsset(origin, "/data/power645.jsonl"),
    fetchManifest: () => fetchJsonAsset(origin, "/data/power645.manifest.json"),
    fetchProtocolLock: () => fetchJsonAsset(origin, "/data/protocol-lock.json"),
    fetchRequiredArtifact: () => fetchJsonAsset(origin, "/data/experiment-family.json"),
  };

  const report = await checkReadiness(deps);
  const durationMs = Date.now() - start;
  logEvent({
    level: report.ok ? "info" : "warn",
    event: "readiness.check",
    requestId,
    durationMs,
    ok: report.ok,
    failedChecks: report.checks.filter((c) => !c.ok).map((c) => c.name),
  });

  const headers = applySecurityHeaders(
    new Headers({ "Cache-Control": "no-store", "X-Request-Id": requestId }),
  );
  return Response.json(report, {
    status: report.ok ? 200 : 503,
    headers,
  });
}
