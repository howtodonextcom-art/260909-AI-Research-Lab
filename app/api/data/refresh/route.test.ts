import assert from "node:assert/strict";
import test from "node:test";
import { POST, refreshRateLimiterState } from "./route";

/**
 * These tests exercise the route's soft rate limit only. They deliberately
 * send bodies that fail validation *before* `handleDataRefresh` would ever
 * touch the network (`force: true` is always rejected on the public route —
 * see `lib/data/refresh-handler.ts`), so a request that gets past the rate
 * limiter still never performs a real fetch. This keeps the test offline
 * and deterministic while still proving the rate limiter runs first, ahead
 * of body parsing.
 */
function rejectedBodyRequest(): Request {
  return new Request("https://example.test/api/data/refresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ force: true }),
  });
}

test("route refresh: cho phép tới đúng số lượng request cấu hình trong cửa sổ, request vượt hạn mức bị 429", async () => {
  refreshRateLimiterState.reset();

  // First 5 requests get past the rate limiter and are rejected for the
  // actual reason (force:true not allowed on the public API) — proves the
  // limiter does not interfere with normal request handling below the limit.
  for (let i = 0; i < 5; i += 1) {
    const response = await POST(rejectedBodyRequest());
    assert.equal(response.status, 403, `request thứ ${i + 1} phải qua rate limit và bị 403 vì force:true`);
  }

  // 6th request within the same short window must be rejected by the rate
  // limiter itself (429), before body validation ever runs.
  const limited = await POST(rejectedBodyRequest());
  assert.equal(limited.status, 429);
  assert.ok(limited.headers.get("Retry-After"));
  assert.equal(limited.headers.get("X-RateLimit-Scope"), "single-isolate");
  assert.match(limited.headers.get("Content-Security-Policy") ?? "", /default-src 'self'/);
  assert.match(limited.headers.get("X-Request-Id") ?? "", /^req_/);
  const body = (await limited.json()) as { error: string };
  assert.match(body.error, /Quá nhiều yêu cầu/);

  refreshRateLimiterState.reset();
});

test("route refresh: reset() trả rate limiter về trạng thái ban đầu (test-only escape hatch)", async () => {
  refreshRateLimiterState.reset();
  for (let i = 0; i < 5; i += 1) {
    await POST(rejectedBodyRequest());
  }
  const blocked = await POST(rejectedBodyRequest());
  assert.equal(blocked.status, 429);

  refreshRateLimiterState.reset();
  const afterReset = await POST(rejectedBodyRequest());
  assert.equal(afterReset.status, 403, "sau reset() request đầu tiên phải qua rate limit lại từ đầu");

  refreshRateLimiterState.reset();
});

test("route refresh: 429 kèm Retry-After là số nguyên dương hợp lý (≤ độ dài cửa sổ)", async () => {
  refreshRateLimiterState.reset();
  for (let i = 0; i < 5; i += 1) {
    await POST(rejectedBodyRequest());
  }
  const limited = await POST(rejectedBodyRequest());
  assert.equal(limited.status, 429);
  const retryAfter = Number(limited.headers.get("Retry-After"));
  assert.ok(Number.isInteger(retryAfter));
  assert.ok(retryAfter >= 1 && retryAfter <= 10);

  refreshRateLimiterState.reset();
});

/**
 * §17 structured logging (additive, does not change any response body or
 * status code — see the tests above, unmodified and still green). One
 * success-shaped path (validation failure, still 2xx-adjacent structured
 * log) and one failure-shaped path (rate limit) are asserted here.
 */
test("route refresh: emit log có event=refresh.request.start và requestId khi request bắt đầu", async () => {
  refreshRateLimiterState.reset();
  const originalLog = console.log;
  const lines: string[] = [];
  console.log = (line: string) => lines.push(line);
  try {
    await POST(rejectedBodyRequest());
  } finally {
    console.log = originalLog;
  }
  const startLine = lines.map((l) => JSON.parse(l)).find((l) => l.event === "refresh.request.start");
  assert.ok(startLine, "phải có dòng log refresh.request.start");
  assert.equal(startLine.level, "info");
  assert.equal(typeof startLine.requestId, "string");
  refreshRateLimiterState.reset();
});

test("route refresh: emit log warn với event=refresh.rate_limited khi bị 429 (failure path)", async () => {
  refreshRateLimiterState.reset();
  for (let i = 0; i < 5; i += 1) await POST(rejectedBodyRequest());

  const originalError = console.error;
  const lines: string[] = [];
  console.error = (line: string) => lines.push(line);
  try {
    await POST(rejectedBodyRequest());
  } finally {
    console.error = originalError;
  }
  const rateLimitLine = lines.map((l) => JSON.parse(l)).find((l) => l.event === "refresh.rate_limited");
  assert.ok(rateLimitLine, "phải có dòng log refresh.rate_limited khi 429");
  assert.equal(rateLimitLine.level, "warn");
  assert.equal(typeof rateLimitLine.retryAfterSeconds, "number");

  refreshRateLimiterState.reset();
});

test("route refresh: emit log warn với event=refresh.validation_failed khi body sai schema (failure path)", async () => {
  refreshRateLimiterState.reset();
  const originalError = console.error;
  const lines: string[] = [];
  console.error = (line: string) => lines.push(line);
  try {
    await POST(rejectedBodyRequest()); // force:true is always rejected on the public route
  } finally {
    console.error = originalError;
  }
  const validationLine = lines.map((l) => JSON.parse(l)).find((l) => l.event === "refresh.validation_failed");
  assert.ok(validationLine, "phải có dòng log refresh.validation_failed");
  assert.equal(validationLine.level, "warn");
  assert.equal(validationLine.reason, "schema_invalid");

  refreshRateLimiterState.reset();
});
