import { generateRequestId, logEvent } from "@/lib/observability/logger";
import { applySecurityHeaders } from "@/lib/security/headers";

/**
 * Trivial liveness probe (§17). Proves the Worker isolate itself is up and
 * can execute a route handler — nothing more. No dataset/manifest/upstream
 * checks here; that is `/api/readiness`'s job. A platform load balancer or
 * uptime monitor should be able to hit this at high frequency without
 * touching any real dependency.
 */
export async function GET() {
  const requestId = generateRequestId();
  const now = new Date();
  logEvent({ level: "info", event: "health.check", requestId });
  const headers = applySecurityHeaders(new Headers({ "Cache-Control": "no-store", "X-Request-Id": requestId }));
  return Response.json({ status: "ok", timestamp: now.toISOString() }, { status: 200, headers });
}
