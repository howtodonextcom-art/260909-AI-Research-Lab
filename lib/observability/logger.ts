/**
 * Structured, leveled logging helper for API routes (§17 observability).
 *
 * Emits exactly one JSON line per call to stdout (or stderr for
 * "error"/"warn" levels), never ad-hoc `console.log(string)` calls scattered
 * through route code. Pure formatting only — no batching, no network, no
 * external dependency — so it works unmodified inside a Cloudflare Worker
 * isolate (stdout/stderr there is captured by the platform's own log
 * pipeline) and in local Node dev/test the same way.
 *
 * Deliberately minimal: this is not a tracing SDK. It gives every route a
 * consistent shape (`level`, `event`, `requestId`, `durationMs`, ...) that a
 * log aggregator (or a human reading `wrangler tail`) can filter/group on,
 * without introducing a new dependency or changing any response body/status
 * this round explicitly forbids touching.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEvent = {
  level: LogLevel;
  event: string;
  requestId?: string;
  durationMs?: number;
  [key: string]: unknown;
};

/** Fixed field order (level/event/time first) for readable line-by-line scanning. */
export function formatLogLine(fields: LogEvent, now: () => Date = () => new Date()): string {
  const { level, event, ...rest } = fields;
  const line = { level, event, time: now().toISOString(), ...rest };
  return JSON.stringify(line);
}

/**
 * Emits one structured JSON line. `warn`/`error` go to stderr (so platform
 * log pipelines that split streams route them to alerting), everything else
 * to stdout.
 */
export function logEvent(fields: LogEvent, now?: () => Date): void {
  const line = formatLogLine(fields, now);
  if (fields.level === "error" || fields.level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

/** Short, collision-tolerant per-request id — no new dependency needed. */
export function generateRequestId(now: () => Date = () => new Date()): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `req_${now().getTime().toString(36)}_${random}`;
}
