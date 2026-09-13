/**
 * Soft, in-process sliding-window rate limiter for the public refresh route.
 *
 * Pure core (`checkSlidingWindow`) + a small mutable-state wrapper
 * (`createRateLimiterState`), mirroring this codebase's pure-logic /
 * stateful-glue split used throughout (e.g. `lib/research/prospective.ts`'s
 * header, `lib/data/sync.ts` vs `lib/data/persistence.ts`).
 *
 * Honest limits — read before assuming this is more than it is:
 * - **Single-isolate only, not cross-isolate/distributed.** A Cloudflare
 *   Worker can run many isolates concurrently across colocations; a client
 *   that lands on different isolates (or any moderately distributed caller)
 *   is not slowed down by this at all. Real edge-level or cross-isolate
 *   rate limiting (e.g. Cloudflare's platform WAF rate-limiting rules) is
 *   **operator-gated / BLOCKED_BY_REAL_WORLD_EVIDENCE** until a human with
 *   live Cloudflare credentials configures and drills it — see
 *   `docs/production-runbook.md` §8 and ADR-005.
 * - **Resets on cold start / redeploy.** State is an in-memory array, not a
 *   durable counter — a new isolate starts with a clean window.
 * - **A courtesy/abuse-deterrence measure, not a security control.** Its
 *   job is to blunt accidental request bursts (e.g. a buggy client retry
 *   loop) and to protect the official-fetch cache's upstream from a burst
 *   of concurrent misses — not to withstand a determined attacker.
 *
 * Complementary mitigations that ARE in this repo (still not distributed):
 * - Client single-flight in `lib/data/refresh.ts` (`inFlight`) — concurrent
 *   `refreshDataset` callers in one browser share one POST.
 * - Server official-fetch cache + in-process single-flight in
 *   `lib/data/official-fetch-cache.ts` — concurrent misses in one isolate
 *   share one upstream vietlott.vn call; 12h TTL reduces repeat storms.
 * Together these stop refresh *storms from a single client/isolate*; they
 * do **not** replace platform WAF rate limiting across isolates.
 */

export type RateLimitOptions = { windowMs: number; maxRequests: number };

export type RateLimitCheck = {
  allowed: boolean;
  /** Pruned (and, if allowed, appended) timestamps to keep for the next check. */
  timestamps: number[];
  /** Milliseconds until the oldest request in the window falls out of it. 0 when allowed. */
  retryAfterMs: number;
};

/**
 * Pure: given the timestamps currently considered "in window", the current
 * time, and the policy, decides whether this request is allowed and returns
 * the timestamps array to keep (already pruned of anything outside the
 * window, plus this request's timestamp when allowed).
 */
export function checkSlidingWindow(timestamps: number[], now: number, options: RateLimitOptions): RateLimitCheck {
  const pruned = timestamps.filter((t) => now - t < options.windowMs);
  if (pruned.length >= options.maxRequests) {
    const oldest = pruned[0];
    const retryAfterMs = Math.max(0, options.windowMs - (now - oldest));
    return { allowed: false, timestamps: pruned, retryAfterMs };
  }
  return { allowed: true, timestamps: [...pruned, now], retryAfterMs: 0 };
}

/** Default policy for the public refresh route: at most 5 requests per 10s, per isolate. */
export const REFRESH_RATE_LIMIT: RateLimitOptions = { windowMs: 10_000, maxRequests: 5 };

/**
 * One mutable-state instance per isolate. `reset()` exists for tests only —
 * production code should never need to call it.
 */
export function createRateLimiterState(options: RateLimitOptions = REFRESH_RATE_LIMIT) {
  let timestamps: number[] = [];
  return {
    check(now: number): RateLimitCheck {
      const result = checkSlidingWindow(timestamps, now, options);
      timestamps = result.timestamps;
      return result;
    },
    /** Test-only escape hatch — production code should never call this. */
    reset(): void {
      timestamps = [];
    },
  };
}

export type RateLimiterState = ReturnType<typeof createRateLimiterState>;
