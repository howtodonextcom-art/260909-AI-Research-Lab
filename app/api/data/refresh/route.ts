import { handleDataRefresh, parseRefreshRequest, type RefreshRequest } from "@/lib/data/refresh-handler";
import { createRateLimiterState, REFRESH_RATE_LIMIT } from "@/lib/data/rate-limit";
import { generateRequestId, logEvent } from "@/lib/observability/logger";
import { applySecurityHeaders } from "@/lib/security/headers";

/** Hard cap before full JSON parse of a malicious/huge body. */
export const MAX_REFRESH_BODY_BYTES = 2 * 1024 * 1024;
export const MAX_REFRESH_RECORDS = 3_000;

/**
 * Soft, single-isolate rate limit — see `lib/data/rate-limit.ts` header for
 * honest limits (not cross-isolate, resets on cold start, not a security
 * control). Exported so tests can `reset()` between cases; production code
 * must never call `reset()`.
 */
export const refreshRateLimiterState = createRateLimiterState(REFRESH_RATE_LIMIT);

function jsonResponse(
  body: unknown,
  init: { status?: number; requestId: string; extraHeaders?: Record<string, string> },
) {
  const headers = applySecurityHeaders(
    new Headers({
      "Content-Type": "application/json",
      "X-Request-Id": init.requestId,
      // Honest scope label — never imply distributed enforcement.
      "X-RateLimit-Scope": "single-isolate",
      ...init.extraHeaders,
    }),
  );
  return Response.json(body, { status: init.status ?? 200, headers });
}

export async function POST(request: Request) {
  const requestId = generateRequestId();
  const start = Date.now();
  logEvent({ level: "info", event: "refresh.request.start", requestId });

  const rate = refreshRateLimiterState.check(Date.now());
  if (!rate.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil(rate.retryAfterMs / 1000));
    logEvent({
      level: "warn",
      event: "refresh.rate_limited",
      requestId,
      durationMs: Date.now() - start,
      retryAfterSeconds,
    });
    return jsonResponse(
      {
        error: `Quá nhiều yêu cầu cập nhật trong thời gian ngắn — thử lại sau ${retryAfterSeconds} giây.`,
      },
      {
        status: 429,
        requestId,
        extraHeaders: { "Retry-After": String(retryAfterSeconds) },
      },
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_REFRESH_BODY_BYTES) {
    logEvent({
      level: "warn",
      event: "refresh.validation_failed",
      requestId,
      durationMs: Date.now() - start,
      reason: "content_length_exceeded",
    });
    return jsonResponse(
      { error: `Body vượt giới hạn ${MAX_REFRESH_BODY_BYTES} bytes.` },
      { status: 413, requestId },
    );
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    logEvent({
      level: "warn",
      event: "refresh.validation_failed",
      requestId,
      durationMs: Date.now() - start,
      reason: "body_read_failed",
    });
    return jsonResponse({ error: "Không đọc được body." }, { status: 400, requestId });
  }
  if (text.length > MAX_REFRESH_BODY_BYTES) {
    logEvent({
      level: "warn",
      event: "refresh.validation_failed",
      requestId,
      durationMs: Date.now() - start,
      reason: "body_length_exceeded",
    });
    return jsonResponse(
      { error: `Body vượt giới hạn ${MAX_REFRESH_BODY_BYTES} bytes.` },
      { status: 413, requestId },
    );
  }

  let raw: unknown;
  try {
    raw = text.length ? JSON.parse(text) : {};
  } catch {
    logEvent({
      level: "warn",
      event: "refresh.validation_failed",
      requestId,
      durationMs: Date.now() - start,
      reason: "invalid_json",
    });
    return jsonResponse({ error: "JSON body không hợp lệ." }, { status: 400, requestId });
  }

  const parsed = parseRefreshRequest(raw, { maxRecords: MAX_REFRESH_RECORDS, allowForce: false });
  if (!parsed.ok) {
    logEvent({
      level: "warn",
      event: "refresh.validation_failed",
      requestId,
      durationMs: Date.now() - start,
      reason: "schema_invalid",
      status: parsed.status,
    });
    return jsonResponse({ error: parsed.error }, { status: parsed.status, requestId });
  }

  const upstreamStart = Date.now();
  const result = await handleDataRefresh(parsed.value);
  const upstreamDurationMs = Date.now() - upstreamStart;
  logEvent({
    level: "info",
    event: "refresh.request.end",
    requestId,
    durationMs: Date.now() - start,
    upstreamDurationMs,
    status: result.summary.status,
  });
  return jsonResponse(result, { requestId });
}

export type { RefreshRequest };
