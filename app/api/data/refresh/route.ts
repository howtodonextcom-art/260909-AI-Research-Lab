import { handleDataRefresh, parseRefreshRequest, type RefreshRequest } from "@/lib/data/refresh-handler";
import { createRateLimiterState, REFRESH_RATE_LIMIT } from "@/lib/data/rate-limit";

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

export async function POST(request: Request) {
  const rate = refreshRateLimiterState.check(Date.now());
  if (!rate.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil(rate.retryAfterMs / 1000));
    return Response.json(
      {
        error: `Quá nhiều yêu cầu cập nhật trong thời gian ngắn — thử lại sau ${retryAfterSeconds} giây.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_REFRESH_BODY_BYTES) {
    return Response.json(
      { error: `Body vượt giới hạn ${MAX_REFRESH_BODY_BYTES} bytes.` },
      { status: 413 },
    );
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return Response.json({ error: "Không đọc được body." }, { status: 400 });
  }
  if (text.length > MAX_REFRESH_BODY_BYTES) {
    return Response.json(
      { error: `Body vượt giới hạn ${MAX_REFRESH_BODY_BYTES} bytes.` },
      { status: 413 },
    );
  }

  let raw: unknown;
  try {
    raw = text.length ? JSON.parse(text) : {};
  } catch {
    return Response.json({ error: "JSON body không hợp lệ." }, { status: 400 });
  }

  const parsed = parseRefreshRequest(raw, { maxRecords: MAX_REFRESH_RECORDS, allowForce: false });
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: parsed.status });
  }

  const result = await handleDataRefresh(parsed.value);
  return Response.json(result);
}

export type { RefreshRequest };
