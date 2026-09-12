# Algorithm forensics remediation — PASS

**Source audit:** `reports/26-09-12-23-31-algorithm-forensics-audit.md`  
**Verdict (audit):** B — Keep but refactor  
**Gate:** PASS (required P0/P1 items in scope)

## Scope executed

| ID | Change | Status |
|---|---|---|
| P0-1 | Newey–West HAC SE for overlapping walk-forward; `SE = max(HAC, naive)`; `varianceMethod: "newey-west-hac"`; UI method note | PASS |
| P0-2 | `INTERACTIVE_FAIRNESS_SIMULATION_COUNT = 300` for ResearchLab MC; protocol canonical stays ≥2000 (no silent hash change) | PASS |
| P1-4 | Live UI passes `familySize` from `CURRENT_PROTOCOL`; fetches `public/data/protocol-lock.json`; surfaces hash / prospective start / `classifyEvidence` | PASS |
| P1-2 | Control B returns `edgeDeltaByStrategy` + `temporalSignalCollapsed`; CLI comparison table; unit tests | PASS |

**Out of scope (unchanged):** P1-1 server cache, P1-3 alpha-spending, extra baselines, full permutation test, prospective L5 job, KIT_ONLY purge.

## Honesty constraint

Remediation fixes overconfident variance and UI/protocol surfaces. It does **not** claim a new predictive edge. Retrospective honesty remains: no demonstrated edge unless prospective evidence says otherwise. Do not claim L5 without a prospective mechanism.

## Key artifacts

- `lib/analytics.ts` — `neweyWestStandardError`, `dependenceAwareStandardError`
- `lib/research/statistics.ts` — `INTERACTIVE_FAIRNESS_SIMULATION_COUNT`
- `app/page.tsx` — interactive MC, familySize, lock/evidence wiring
- `components/data-status.tsx` — protocol lock fields
- `lib/research/negative-controls.ts` + `scripts/research-controls.ts` — Control B summary
- `public/data/protocol-lock.json` (+ `reports/protocol-lock.json`) — hash `9b864bec…`, `prospectiveStartDrawId: "01562"`

## Verification

```
npm test                 → 65 business + 113 data, all green
npm run data:check       → PASS (1561 records, hash match)
npm run research:controls → A/B/C printed; Control B original vs shuffled table
```

## Control B snapshot (local data)

| Strategy | edge_original | edge_shuffled | Δ |
|---|---:|---:|---:|
| HOT | -0.0132 | -0.0560 | 0.0428 |
| COLD | -0.0431 | 0.0276 | -0.0707 |
| BALANCED | 0.0004 | -0.0016 | 0.0020 |

`temporalSignalCollapsed=false` (edges move under shuffle; not identical ghost signal).

## PASS criteria met

1. HAC used for z/p/CI path; SE never below naive under positive dependence design.
2. UI MC interactive count ≠ protocol canonical; protocol hash unchanged by this split.
3. UI familySize + protocol lock + evidence classification visible.
4. Control B prints and tests original vs shuffled comparison.
5. Full test + data:check green.
