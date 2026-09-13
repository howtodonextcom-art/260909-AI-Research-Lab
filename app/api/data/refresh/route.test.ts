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
