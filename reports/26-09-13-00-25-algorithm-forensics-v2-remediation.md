# Algorithm forensics v2 punch-list remediation — PASS

**Source audit:** `reports/26-09-13-00-15-algorithm-forensics-audit-v2.md`  
**Gate:** PASS (N1, P1-4a, N2 + `tsc` attached to `npm test`)

## Idea → verify (before code)

| ID | Options considered | Chosen | Why |
|---|---|---|---|
| N1 | (1) restore `MonteCarloNullOptions`; (2) inline param type | (1) | Same shape the two call sites already use; one export, tsc + a pin test catch deletion. |
| P1-4a | (1) public JSON + fetch like protocol-lock; (2) API route; (3) bundle `registry.jsonl` into the client | (1) | No new server store; CLI already owns the registry write; UI already fetches `/data/*.json`. API is out of scope (P1-1). |
| N2 | Pin synthetic-only vs pin HOT/TEST on bundled `power645.jsonl` | Bundled snapshot | Audit v2: synthetic AR test cannot catch “always naive on real data”. |

## Scope executed

| ID | Change | Status |
|---|---|---|
| N1 | Restore `export type MonteCarloNullOptions`; pin export in `statistics.test.ts` | PASS |
| P1-4a | Shared `countFamilyExperiments` / `resolveHolmFamilySize` / `primaryStrategyFamilyId`; `public/data/experiment-family.json`; UI fetch; fallback 3 if empty | PASS |
| N2 | `walkForwardPairedDifferences` + test on real HOT/TEST: HAC ≠ naive, `se === max(hac, naive)`, pin **HAC < naive** (do not require HAC > naive) | PASS |
| Gate | `"typecheck": "tsc --noEmit"`; `npm test` runs typecheck first; `package.deploy.test.ts` locks that | PASS |

**Unchanged (correctly out of scope):** P0-2 interactive MC 300, P1-2 Control B, P1-4b protocol lock UI, P1-1 cache, P1-3 alpha-spending, HAC bandwidth `lookback-1` (N3, documented only).

## Honesty

- Registry family count on this snapshot is **3** — same *number* as the old protocol-constant, different *source*. Adding a fourth experiment in that family and re-running `research:experiment` will write `familySize: 4` and Holm in the UI will use 4.
- HAC on current HOT/TEST is still **smaller than naive**, so `max(HAC, naive)` is still the naive floor. p/CI for this dataset are not claimed to have moved.
- No new predictive edge. No protocol field changed; hash not relocked.

## Verification

```
npx tsc --noEmit          → exit 0
npm test                  → typecheck + 72 business + 113 data, all green
npm run data:check        → PASS (1561 records, hash match)
npm run lint              → exit 0
```

`npm test` alone is no longer a typecheck-free path.

## PASS criteria

1. `MonteCarloNullOptions` declared and used; `tsc` clean.
2. UI does not assign familySize from `CURRENT_PROTOCOL.strategies.filter`. Contract tests fail if that regresses. Published JSON matches `countFamilyExperiments` on `reports/experiments/registry.jsonl`.
3. Real-data HAC test fails if HAC equals naive (dead path) or if `dependenceAware` drops the `max` floor.
4. Full gate includes `tsc`.
5. No regress of P0-2 / P1-2 / P1-4b. Protocol hash untouched.

## N3 (not fixed — debt)

HAC lag = `lookback - 1` is still an unvalidated bandwidth choice versus `n^{1/3}`. Left as P2 modeling; estimator unchanged.
