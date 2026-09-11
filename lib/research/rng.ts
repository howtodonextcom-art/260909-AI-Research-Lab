/**
 * Deterministic PRNG (mulberry32) for the Monte Carlo null engine (§20) and
 * the negative-control battery (§28). Never used for anything presented to a
 * user as "their random ticket" — that stays on `crypto.getRandomValues`
 * (see `mega645.ts:generateQuickPick`). Determinism here is the point:
 * research artifacts must be reproducible from a recorded seed.
 */
export function createRng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One fair, uniformly random Mega 6/45 draw: 6 distinct integers in 1..45, ascending. */
export function drawFairTicket(rng: () => number): number[] {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 6).sort((a, b) => a - b);
}
