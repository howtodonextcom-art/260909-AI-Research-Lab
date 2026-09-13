import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

/**
 * These tests run offline (no dev server listening at the request origin),
 * so every same-origin `/data/*` fetch this route makes will fail — that is
 * itself the behavior under test: a route that cannot reach its bundled
 * assets must fail closed with 503 and name every failing check, never
 * fabricate a static 200. The pure success/partial-failure paths of the
 * underlying check logic are covered with injected fixtures in
 * `lib/observability/readiness.test.ts`.
 */
function readinessRequest(): Request {
  return new Request("https://example.test/api/readiness");
}

test("GET /api/readiness: khi không truy cập được asset nào => 503, ok:false, liệt kê đủ 4 check thất bại", async () => {
  const response = await GET(readinessRequest());
  assert.equal(response.status, 503);
  const body = (await response.json()) as { ok: boolean; checks: { name: string; ok: boolean }[]; checkedAt: string };
  assert.equal(body.ok, false);
  assert.equal(body.checks.length, 4);
  assert.ok(body.checks.every((c) => c.ok === false));
  assert.deepEqual(
    body.checks.map((c) => c.name).sort(),
    ["dataset", "manifest", "protocolLock", "requiredArtifact"].sort(),
  );
  assert.ok(!Number.isNaN(Date.parse(body.checkedAt)));
});

test("GET /api/readiness: không cache (Cache-Control: no-store)", async () => {
  const response = await GET(readinessRequest());
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("GET /api/readiness: gắn CSP + X-Request-Id", async () => {
  const response = await GET(readinessRequest());
  assert.match(response.headers.get("Content-Security-Policy") ?? "", /default-src 'self'/);
  assert.match(response.headers.get("X-Request-Id") ?? "", /^req_/);
});

test("GET /api/readiness: log một dòng JSON warn khi not-ready, kèm failedChecks", async () => {
  const originalError = console.error;
  const lines: string[] = [];
  console.error = (line: string) => lines.push(line);
  try {
    await GET(readinessRequest());
  } finally {
    console.error = originalError;
  }
  assert.ok(lines.length >= 1);
  const parsed = JSON.parse(lines[lines.length - 1]);
  assert.equal(parsed.event, "readiness.check");
  assert.equal(parsed.level, "warn");
  assert.equal(parsed.ok, false);
  assert.ok(Array.isArray(parsed.failedChecks) && parsed.failedChecks.length === 4);
  assert.equal(typeof parsed.durationMs, "number");
});
