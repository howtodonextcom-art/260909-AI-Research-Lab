# Algorithm Forensics Audit — Re-run (v3)

Date: 2026-09-13 00:40 (UTC+7) · Method: source-first re-verification of `reports/26-09-13-00-25-algorithm-forensics-v2-remediation.md`'s claims against current code, per the master prompt's "CODE THẮNG" policy. Nothing below is accepted from that report's own wording — every row was independently re-derived.

**Result: all four claimed items are genuinely fixed.** This is a clean remediation pass — the first of the three so far where every claim survived independent re-verification without a correction needed.

---

## Verification table

| ID | Claim | Independent verification this pass | Verdict |
|---|---|---|---|
| N1 | `MonteCarloNullOptions` restored; `tsc` clean | `lib/research/statistics.ts:58-61` — type declared exactly as before. `npx tsc --noEmit` → exit 0 (ran directly, not taken from the report). `lib/research/statistics.test.ts:14-18` — new test imports the type and constructs a value from it, so a future deletion breaks a *test*, not just `tsc`. | **VERIFIED FIXED** |
| Gate | `typecheck` script exists; `npm test` runs it first; `package.deploy.test.ts` locks this | `package.json:14`: `"test": "npm run typecheck && npm run test:business && npm run data:test"`. Ran `npm test` directly: 113 data + 72 business, all pass, typecheck ran first (silently, since it passed). `package.deploy.test.ts:20-25` asserts both `pkg.scripts.typecheck` matches `/tsc --noEmit/` and `pkg.scripts.test` matches `/typecheck/` — a real regression guard, not just a claim. | **VERIFIED FIXED** |
| P1-4a | Registry-derived `familySize` reaches the live UI via `public/data/experiment-family.json`, not `CURRENT_PROTOCOL.strategies.length` | Traced the full chain: `lib/research/experiments.ts:52-88` (`countFamilyExperiments`, `primaryStrategyFamilyId`, `resolveHolmFamilySize`, `buildExperimentFamilySummary`) → `scripts/run-experiment.ts:66-67,124-127` (computes from the real `registry.jsonl`, writes `public/data/experiment-family.json`) → `app/page.tsx:93,101` (`familySize = familySummary?.familySize ?? FALLBACK_HOLM_FAMILY_SIZE`, fetched from that exact file). Confirmed `public/data/experiment-family.json` content (`familyId: "protocol-2026-09-10.1-primary-strategies"`, `familySize: 3`) matches `countFamilyExperiments` over the actual `reports/experiments/registry.jsonl` (3 distinct experiment ids, same family). **Regression guard exists and is precise**: `app/page.a11y.test.ts:32-37` — `assert.doesNotMatch(source, /CURRENT_PROTOCOL\.strategies\.filter/)` plus positive assertions for `experiment-family.json`, `parseExperimentFamilySummary`, `FALLBACK_HOLM_FAMILY_SIZE`. This is exactly the fix v2 asked for, not a relabeling. | **VERIFIED FIXED** |
| N2 | A test pins the real dataset's HAC-vs-naive relationship so it can't silently regress | `lib/analytics.ts:424-437` (`walkForwardPairedDifferences`, new, extracts the exact same difference series the SE path consumes) + `lib/analytics.test.ts:207-229`. The test runs on the **bundled real snapshot** (`public/data/power645.jsonl`, ≥400 records asserted), computes HAC and naive SE on real HOT/TEST differences, asserts they differ by more than 1e-6 (catches a "dead" HAC path), asserts `se === max(hac, naive)`, and — the part that matters — explicitly pins `hac < naiveSe` for this dataset with an in-test comment warning not to invert this into a general rule. This is precisely the test v2 said was missing. | **VERIFIED FIXED** |

## Full gate re-run (independent, not copied from the remediation report)

```
npx tsc --noEmit   → exit 0
npm run lint       → exit 0
npm test           → typecheck + 72 business + 113 data = all pass
npm run build      → succeeded (vinext build)
```

## Items correctly left untouched (re-confirmed still open, not silently regressed or claimed-fixed)

| ID | Status |
|---|---|
| P1-1 (no server-side cache on `/api/data/refresh`) | Confirmed unchanged — no `KV`/Cache API reference in the route |
| P1-3 (family-size growth conflates hypotheses with re-runs on new data) | Confirmed unchanged — `experimentId` still embeds `datasetHash.slice(0,8)` (`scripts/run-experiment.ts:75`), so each new draw still mints 3 new family members on the next `research:experiment` run. **Worth noting: this is now a more consequential mechanism than before**, since the family size it grows is the one the live UI actually uses (post P1-4a) — previously this only affected a CLI-only number. Still correctly out of scope for this remediation round; flagging that its priority effectively rose now that it's wired to production. |
| P2-1 (`gates.significant` uses z≥1.96 ≈ p<0.025, one-sided-elsewhere alpha=0.05) | Confirmed unchanged (`lib/analytics.ts:359`) |
| P2-2 (RANDOM control's payout series heavy-tailed) | Confirmed unchanged (comment and logic identical) |
| N3 (HAC lag = `lookback-1` unvalidated against standard bandwidth rules) | Confirmed unchanged, and the remediation report explicitly re-lists it as accepted debt rather than silently dropping it |

## Updated verdict

**B — Keep but refactor** (unchanged). Statistical validity moves from "conditionally sound, flaw addressed in mechanism but not yet in outcome" (v2) to **"conditionally sound, flaw addressed and now test-pinned against silent regression"** — the HAC path is proven live on real data and can't quietly die again without a test failing. Research readiness moves up again: the family-size number the UI displays is now a real, traced, registry-derived value with a regression guard, not a second relabeled constant.

**Only remaining priority worth calling out explicitly:** P1-3's severity should be reconsidered now that its output feeds the live UI (see table above) — it was reasonable to leave as CLI-only debt when only `research:experiment`'s console output was affected; now that `app/page.tsx` reads the same number, a future re-run after new draws will silently change what real users see the Holm correction is based on, via a mechanism (look-count, not hypothesis-count) that isn't the textbook-correct one for that situation. Not a new defect — a re-prioritization given what P1-4a just connected it to.
