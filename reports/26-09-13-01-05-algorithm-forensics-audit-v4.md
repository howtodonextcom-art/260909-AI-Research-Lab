# Algorithm Forensics Audit — Re-run (v4)

Date: 2026-09-13 01:05 (UTC+7) · Method: source-first re-verification of `reports/26-09-13-00-55-algorithm-forensics-remaining-debt.md`'s "None of the five assigned IDs remain open" claim.

## Direct answer

**All 5 claimed fixes verify as genuine on independent re-check.** This is the second consecutive clean remediation round (v3 was the first). Combined with v3, every P0/P1/P2 finding from the original v1 audit is now either fixed-and-verified or a knowingly-scoped, disclosed research-maturity limitation (not a bug). **Not literally "100% PASS" in an absolute sense** — one gate (production `npm run build`) could not be independently re-run this pass due to an external process, and a small number of inherent, disclosed limitations remain by design (detailed below). Nothing outstanding rises to P0/P1.

## Verification (each re-derived from source, not taken from the remediation report)

| ID | Verified how | Verdict |
|---|---|---|
| P1-3 (alpha-spending) | `lib/research/alpha-spending.ts`: Pocock spending function implemented; ran it directly — `spentAlphaForLook(2, 0.05) = 0.018994274652086127`, matching the report's pinned value exactly. Traced wiring into the *actual* decision path: `lib/analytics.ts:543,582,588` — `spentAlpha` feeds both `significantAfterCorrection` and `selectCandidate`, not just a display field. `lib/research/experiments.ts:56-80` correctly splits `countFamilyHypotheses` (Holm denominator, does not grow with re-runs) from `countFamilyLooks` (distinct dataset hashes, feeds the spend). Currently inert on real data (`lookCount=1` → spend = nominal 0.05), honestly disclosed as such. | **VERIFIED FIXED** |
| P2-1 (gates alpha mismatch) | `lib/analytics.ts:307-309`: `screeningSignificant(zScore, alpha, isControl) = !isControl && oneSidedPValue(zScore) <= alpha`. Grepped the whole file for `1.96` used as a bare significance cutoff — the only remaining `1.96` is the (correct, unrelated) two-sided 95% CI multiplier, not a gate threshold. | **VERIFIED FIXED** |
| P2-2 (payout heavy-tail) | `lib/analytics.ts:33-34,311-321`: `ROBUST_PAYOUT_CAP = FIXED_PRIZE.SECOND` (giải Nhì/4-match, confirmed in `lib/mega645.ts`), `robustPayoutTotal` winsorizes, `outperformsOnRobustPayout` replaces the raw-sum comparison and is the function actually called at `analytics.ts:414`. | **VERIFIED FIXED** |
| N3 (HAC bandwidth) | `lib/analytics.ts:246-251`: `hacBandwidth(n, lookback) = min(lookback-1, max(1, floor(cbrt(n))))` — a real, standard automatic-bandwidth rule (cube-root rate, cited Newey-West 1994/Andrews 1991), not an ad hoc guess. Computed by hand for the real TEST-phase series (n=368): `cbrt(368)≈7.16 → 7`, matching the report's claimed lag exactly (was 89). | **VERIFIED FIXED** |
| P1-1 (no server cache) | `lib/data/official-fetch-cache.ts` + `lib/data/refresh-handler.ts`: a real shared cache (Cache API primary, in-memory fallback), keyed **only** on `officialFetchCacheKey("all"\|"since", cursor.latestId)` — never on client-supplied `body.records`/`body.manifest`. Verified via a dedicated test that two different (fake) client payloads hitting `fetchSince` with the same `latestId` share one cache entry and one upstream call, and that `force: true` always bypasses it. This is a real fix, not a relabeling — it reduces redundant upstream crawls without introducing any cross-user data-trust issue. | **VERIFIED FIXED** |

## Gate re-run (this session, independent)

```
npx tsc --noEmit    → exit 0
npm test            → typecheck + 80 business + 119 data = 199, all pass
npm run lint        → exit 0
npm run data:check  → 1561 records, hash matches manifest
npm run build       → COULD NOT RE-RUN: EPERM deleting dist/ — a workerd/wrangler
                       process (PID 7800/18168, started ~00:25-00:31) has the Cloudflare
                       Workers preview server open on that directory. This is an
                       environmental Windows file-lock conflict between `npm run start`
                       and `npm run build` running concurrently, not a code defect —
                       verified by inspecting every changed file directly (all above)
                       and confirming `tsc --noEmit` (which shares the same type surface
                       vinext's build step compiles) is clean. Build was last directly
                       confirmed green in v3, before this preview server started, and none
                       of this round's changes touch anything `tsc` wouldn't already catch.
```

## What "remains" — the honest list

Nothing at P0 or P1. What's left is either P2/P3 or an inherent, disclosed limitation of a system this young:

1. **HAC still resolves to the naive floor on the current real dataset** (`hac < naive` even with the corrected bandwidth) — this is disclosed in the remediation report itself and re-confirmed here; it means the corrected-vs-naive numbers are still numerically identical for now. Not a bug — a fact about this dataset's current autocorrelation structure, and now test-pinned (v3) so a future silent regression would be caught.
2. **Zero prospective (L5) data points exist yet** — `reports/protocol-lock.json` is real and wired into the UI, but no draw has arrived after the lock to be scored against it. Inherent to the system's age, not fixable by more code.
3. **Control B (time-shuffle) is a single shuffle, not a distribution over many shuffles** — reports one real comparison (fixed in the P1-2 round), not a sampling distribution. Disclosed limitation, not silently hidden.
4. **The in-memory cache fallback (P1-1's fix) does not share across multiple Workers isolates** if Cache API is ever unavailable — the primary path (`caches.default`) does, and is what Cloudflare Workers actually provides in production, so this is a defensive fallback for non-Workers environments, not a gap in the deployed target. Minor, newly-observed in this pass, not worth more than a footnote.
5. **`npm run build` was not independently re-confirmed this pass** due to the environmental lock above — recommend re-running it once the local wrangler preview is stopped, as a formality, since nothing found in source review suggests it would fail.

None of these are "issues" in the sense the earlier rounds' P0/P1 findings were — they are the honest residue of a real research system: known modeling limits, disclosed rather than hidden, and a build-gate re-confirmation blocked by something outside the code.

## Verdict

**B — Keep but refactor** is now closer to **"keep, and what needed refactoring has been refactored and verified."** Across four rounds (v1 audit → 3 remediation rounds, each independently re-verified rather than trusted) every P0 and P1 finding is closed with real, traced, tested fixes — not relabelings. The system's remaining gaps are the kind no amount of further code review closes: it needs a real future draw to arrive and be scored against the now-real protocol lock before this project can honestly claim more than retrospective validity.
