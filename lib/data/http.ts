/**
 * Guarded HTTP access shared by every source adapter.
 *
 * Guards, in order of importance:
 *  - hosts must be on an allowlist, so no caller can steer a request anywhere;
 *  - every request has a timeout and is abortable;
 *  - responses are size-capped while streaming, so a runaway body cannot
 *    exhaust memory before we notice;
 *  - retries are bounded, backed off, and only for errors worth retrying.
 */
import type { FetchOptions } from "./types";

export const ALLOWED_HOSTS = ["raw.githubusercontent.com"] as const;

export const DEFAULT_TIMEOUT_MS = 20_000;
export const MAX_RESPONSE_BYTES = 32 * 1024 * 1024;
export const MAX_ATTEMPTS = 3;

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function assertAllowedUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new HttpError(`URL không hợp lệ: ${url}`, null, false);
  }
  if (parsed.protocol !== "https:") {
    throw new HttpError(`Chỉ chấp nhận HTTPS, nhận được: ${parsed.protocol}`, null, false);
  }
  if (!(ALLOWED_HOSTS as readonly string[]).includes(parsed.hostname)) {
    throw new HttpError(`Host không nằm trong allowlist: ${parsed.hostname}`, null, false);
  }
  return parsed;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function readCapped(response: Response): Promise<string> {
  const declared = response.headers.get("content-length");
  if (declared && Number(declared) > MAX_RESPONSE_BYTES) {
    throw new HttpError(`Response quá lớn: ${declared} bytes`, response.status, false);
  }

  const body = response.body;
  if (!body) return response.text();

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        throw new HttpError(`Response vượt giới hạn ${MAX_RESPONSE_BYTES} bytes`, response.status, false);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export type GuardedResponse = {
  status: number;
  etag: string | null;
  /** Null when the server answered 304 Not Modified. */
  text: string | null;
};

/**
 * Performs one allowlisted GET with timeout, size cap and bounded retries.
 *
 * `etag` triggers a conditional request so an unchanged file costs one 304 —
 * but only when `avoidPreflight` is false.
 *
 * `avoidPreflight` exists because of a browser-only constraint verified at
 * runtime: `If-None-Match` (and a non-safelisted `Accept`) make the request
 * non-simple, so the browser sends a CORS preflight OPTIONS first, and
 * raw.githubusercontent.com answers OPTIONS with a non-2xx status. The GET
 * itself is perfectly CORS-enabled; only the preflight fails. Sending zero
 * custom headers keeps the request simple and it succeeds. `curl` never shows
 * this, because curl does not preflight.
 */
export async function fetchGuarded(
  url: string,
  {
    etag,
    avoidPreflight = false,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: FetchOptions & { etag?: string | null; avoidPreflight?: boolean } = {},
): Promise<GuardedResponse> {
  assertAllowedUrl(url);

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const onAbort = () => controller.abort(signal?.reason);
    if (signal) {
      if (signal.aborted) throw new HttpError("Yêu cầu đã bị hủy", null, false);
      signal.addEventListener("abort", onAbort, { once: true });
    }
    const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);

    try {
      const headers: Record<string, string> = {};
      if (!avoidPreflight) {
        headers.Accept = "text/plain, application/json";
        if (etag) headers["If-None-Match"] = etag;
      }

      const response = await fetch(url, { headers, signal: controller.signal, redirect: "follow" });

      if (response.status === 304) {
        return { status: 304, etag: response.headers.get("etag") ?? etag ?? null, text: null };
      }
      if (!response.ok) {
        throw new HttpError(
          `HTTP ${response.status} khi tải ${url}`,
          response.status,
          isRetryableStatus(response.status),
        );
      }

      return {
        status: response.status,
        etag: response.headers.get("etag"),
        text: await readCapped(response),
      };
    } catch (error) {
      lastError = error;
      const retryable = error instanceof HttpError ? error.retryable : !signal?.aborted;
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      const backoff = 300 * 2 ** (attempt - 1) + Math.floor(Math.random() * 200);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
    }
  }

  if (lastError instanceof HttpError) throw lastError;
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new HttpError(`Không thể tải ${url}: ${message}`, null, true);
}
