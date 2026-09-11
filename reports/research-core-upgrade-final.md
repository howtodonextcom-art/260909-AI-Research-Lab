# Research Core Upgrade — Final Report

Master prompt: "Upgrade Mega 6/45 AI Research Lab to Scientific Research
Core." Baseline captured in `reports/research-core-upgrade-baseline.md`
(commit `ff101f4`); this report covers everything since.

## A. Executive summary

The primary data source is now the official `vietlott.vn` history table
(previously a GitHub mirror was the only source). A live crawl run during
this implementation replaced the canonical dataset with the full verified
history — 1561 records, `#00001` (2016-07-20) through `#01561`
(2026-09-11), zero gaps, cross-checked `PASS` against both the official
detail page and the mirror. The chi-square "fairness" diagnostic the UI
showed, which asserted an incorrect `chi-square(44)` reference
distribution, was replaced with a Monte Carlo-calibrated diagnostic. An
experiment registry, a hashable frozen research protocol, and a
mandatory negative-control battery were added. A real experiment run
(committed, `reports/experiments/`) shows the expected null-hypothesis-
consistent result: no demonstrated edge for HOT/COLD/BALANCED versus
random on the TEST holdout.

**Verdict: PARTIALLY COMPLETE.** All P0 items (data truth, statistical
correctness) and the mandatory P1 negative-control battery are done,
verified, and tested. Two P1 items are intentionally partial — the full
8-module `lib/research/` split (§15) was done additively rather than by
gutting the already-well-tested `analytics.ts`, and the multiple-testing
family (§23) is registered but not yet consulted for correction — both are
documented below and in the ADRs, not silently skipped. See §H/§I.

## B. Baseline

See `reports/research-core-upgrade-baseline.md`. Summary: 83/83 tests
passing at commit `ff101f4`, lint clean, build clean. Primary dataset:
mirror-sourced, 1362 records, 2017-10-25 → 2026-09-06 — missing the
product's first ~15 months versus the donor repo's already-fetched
official dataset (1561 records, 2016-07-20 → 2026-09-11).

## C. Changes implemented

Commits (this branch, chronological):

```
1db0281 chore: capture research lab baseline
303fcc1 feat(data): add official Vietlott source adapter
3da6b2c feat(data): add continuity and cross-source verification
8c2d111 data: replace incomplete Mega 6/45 snapshot with full official history
d9dfc09 feat(stats): add exact null model, Monte Carlo engine, and fairness diagnostic
2c7f18a feat(research): add experiment registry and protocol hashing
4d7483f feat(ui): surface scientific status; rename ambiguous portfolio API
```

Each commit message includes its own source → runtime → impact narrative;
§ references below point to the relevant master-prompt section.

## D. Architecture before → after

```
BEFORE                                    AFTER
lib/data/sources/                         lib/data/sources/
  vietlott-data.ts   (only adapter,         vietlott-data.ts   (demoted: cross-check only,
   de facto primary)                          never merged into the canonical snapshot)
                                             vietlott-official.ts (NEW — primary, explicit
                                               parse-state semantics, §8)
(no continuity check)                     lib/data/continuity.ts   (NEW)
(no cross-source check)                   lib/data/cross-check.ts (NEW)
manifest v1 (flat source)                 manifest v2 (source.primary/secondary, continuity,
                                             crossCheck — additive, v1 field names unchanged)
(chi-square shown as df=44)               lib/research/statistics.ts (NEW — exact null,
                                             Monte Carlo engine, fairness diagnostic)
(no protocol object/hash)                 lib/research/protocol.ts (NEW — frozen protocol +
                                             SHA-256 hash, retro/prospective classifier)
(no experiment registry)                  lib/research/experiments.ts (NEW) +
                                             scripts/run-experiment.ts +
                                             reports/experiments/ (registry.jsonl + artifacts)
(no negative controls beyond              lib/research/negative-controls.ts (NEW — Control
 future-mutation tests)                     A/B/C; Control D = existing analytics.test.ts)
PortfolioOdds.atLeast4/jackpot            PortfolioOdds.exactProbabilityAtLeast4/Jackpot
 (ambiguous names)                          (+ proof doc comment, §30/§31)
```

`lib/analytics.ts`'s internals (walk-forward, strategies, dev/val/test
split, Holm-Bonferroni-per-phase) were **not** restructured into the
8-module layout §15 suggests — see §H.

## E. Data provenance

| | Before | After |
|---|---|---|
| Primary source | `vietlott-data` GitHub mirror (MIT) | `vietlott.vn` official history table |
| Secondary source | none | `vietlott-data` mirror, cross-check only |
| Source adapter | `vietlott-data.ts` only | `vietlott-official.ts` (primary) + `vietlott-data.ts` (secondary) |
| Parser EOF semantics | none (mirror is a single flat file, no pagination) | Explicit `PARSE_SUCCESS`/`PARSE_EMPTY_VALID_PAGE`/`PARSE_STRUCTURE_CHANGED`/`FETCH_FAILED`; EOF requires positively reaching a known anchor id, never inferred from zero rows alone |

Regex patterns and page-boundary assumptions in `vietlott-official.ts` were
validated against **live fetches of vietlott.vn performed during this
implementation** (2026-09-11/12) — including deliberately probing pages
past the true end of history (194, 195, 196, 500) to observe real
boundary behavior before writing the anchor-based EOF logic. See
ADR-001.

## F. Dataset completeness

```
firstId:       00001  (2016-07-20)
latestId:      01561  (2026-09-11)
recordCount:   1561
missingIds:    []
duplicateIds:  []
conflicts:     0
datasetSha256: 8e26f348a8b241865facc7cfe690fbc428615b9b45ffc9732709a6267039c24e
crossCheck:    PASS (sample=8, seed=645, checked 2026-09-11T17:57:47.456Z)
```

Live crawl runtime evidence (`npm run data:sync --force`):

```
ĐỒNG BỘ THÀNH CÔNG
  Bản ghi nhận về   1561    Hợp lệ   1561    Thêm mới   199
  Xung đột          0       Bị từ chối   0
  Kỳ đầu tiên  2016-07-20   Kỳ mới nhất  2026-09-11
```

`npm run data:cross-check` (8 deterministic samples: first, latest,
middle, 5 seeded — ids `00001, 00270, 00639, 00677, 00781, 01241, 01404,
01561`) against both the official detail page and the mirror: **PASS**, 0
mismatches, 0 fetch errors. `npm run data:verify-live`: **PASS**, exit 0.

## G. Statistical changes

- **Primary endpoint** (§18, now explicit): mean matched numbers per
  ticket (`lib/research/statistics.ts:PRIMARY_ENDPOINT`). `EXPECTED_MATCHES
  = 0.8`, derived from the exact hypergeometric distribution
  (`lib/profit.ts:outcomes`), not hard-coded.
- **Exact null model** (§19): `matchProbability`, `tailProbabilityAtLeast`,
  `expectedPrizeFrequency` — all reused from the pre-existing, tested
  `outcomes` table.
- **Monte Carlo engine** (§20): `lib/research/rng.ts` (mulberry32) +
  `runMonteCarloNull()`. Deterministic — same `(drawCount, seed,
  simulationCount)` reproduces byte-identical samples (tested).
- **Chi-square fix** (§21): `monteCarloFairnessDiagnostic()` replaces the
  UI's previous "44 bậc tự do · giá trị gần 44 nghĩa là phù hợp quay công
  bằng" framing (a real, user-visible correctness bug — that statement was
  not strictly true for a without-replacement 6/45 draw) with a Monte
  Carlo-calibrated p-value, simulation count and seed shown together.
  Verified rendering correctly in-browser against the live dataset
  (screenshot-checked during implementation; no console errors).
- **CI/testing method** (§22): unchanged — the existing paired z-test on
  per-draw (strategy − random) differences already satisfies "prefer
  paired procedures"; a bootstrap/permutation alternative was not added
  (deferred, §I).
- **Multiple testing** (§23): Holm-Bonferroni unchanged in `analytics.ts`
  (still per-phase, currently-visible strategies only); `familyId` now
  exists and is recorded on every registered experiment, but the
  correction itself does not yet read the full family history from the
  registry (deferred, §I).

## H. Negative controls (§28, mandatory)

| Control | Implementation | Result on this run |
|---|---|---|
| A — IID synthetic | `runIidSyntheticControl`: 25 replications of a 260-draw fair synthetic dataset, lookback 60 | All three non-RANDOM strategies clear all 3 in-sample gates well under half the time under a fair null (tested, bounded `<= 0.6`) |
| B — Time shuffle | `runTimeShuffleControl`: full pipeline re-run on chronologically shuffled + re-dated data | Runs correctly end to end; comparison is descriptive (§28's own wording: "if a temporal strategy still shows identical signal, investigate" is guidance for a human, not a fixed test bound) |
| C — Random baseline | `runRandomBaselineControl`: RANDOM's own average matches vs. `EXPECTED_MATCHES` | Within 0.15 of 0.8 on a 400-draw synthetic run (tested) |
| D — Future mutation | Pre-existing in `lib/analytics.test.ts` ("validation không thay đổi khi sửa kỳ holdout tương lai", "thay đổi toàn bộ tập test không làm đổi ứng viên được chọn") | Passing (unchanged by this work) |

These are coarse sanity controls run at a size that keeps `npm test` fast
(well under a second added), not certified false-positive-rate
measurements — documented as such in `lib/research/negative-controls.ts`.

## I. Experiment registry (§24/§25)

Real run, committed (`reports/experiments/registry.jsonl` +
`reports/experiments/protocol-2026-09-10.1-primary-strategies-{hot,cold,balanced}-8e26f348.json`):

```
familyId:      protocol-2026-09-10.1-primary-strategies
protocolHash:  089e16b90b1d168e69142faf678b5bc66e831310cf99b30c4f0db259c27badef
datasetHash:   8e26f348a8b241865facc7cfe690fbc428615b9b45ffc9732709a6267039c24e
gitCommit:     d9dfc09e583732d1f1180a23aa599c74b94e8cd0

HOT        edge(test)=-0.017  p=0.666  adj.p=1.000
COLD       edge(test)=-0.028  p=0.753  adj.p=1.000
BALANCED   edge(test)= 0.018  p=0.327  adj.p=0.981
```

No demonstrated edge for any strategy on the TEST holdout — the expected,
scientifically valid outcome per the lab's default null hypothesis (§3).
This is real output from `npm run research:experiment` against the real
dataset, not a fabricated example.

## J. Protocol freeze (§26/§27)

`lib/research/protocol.ts:CURRENT_PROTOCOL` (version `2026-09-10.1`,
kept equal to `analytics.ts`'s pre-existing `PROTOCOL_VERSION` by hand —
see ADR-002 for why not by import): primary endpoint, alpha=0.05,
lookback=90, strategies=[RANDOM,HOT,COLD,BALANCED], the existing
50/25/25 chronological split rule, the existing validation-only selection
rule, Holm-Bonferroni. `computeProtocolHash()` is a canonical-JSON SHA-256
over that whole object — tested to change when any single field changes
(alpha, lookback, or the strategy list) and to reproduce identically
otherwise.

`classifyEvidence(drawId, lock)` implements the retrospective/prospective
boundary as a function, not just a label — tested. `ProtocolLock` (with
`protocolLockedAt`/`prospectiveStartDrawId`) is defined but no persisted
"lock" action was wired up in this pass (deferred, §I below refers to the
next section — see "Deferred work").

## K. Tests

```
                    BEFORE   AFTER   NEW   REMOVED
business tests        23      46     23      0
data tests             60      97     37      0
                    ------  ------  ----   ------
total                  83     143     60      0
```

No test was removed. Two pre-existing tests had their manifest object
literals updated for the additive v2 shape (`refresh.test.ts`); this is a
literal-shape update, not a behavior change, and both still assert the
same TTL/refresh logic as before.

```
npm test        -> 143/143 passed
npm run lint     -> clean
npx tsc --noEmit -> clean
npm run build    -> succeeded (vinext build, exit 0)
```

## L. Runtime verification

```
npm run data:sync --force   -> ĐỒNG BỘ THÀNH CÔNG, 1561 records (see §F)
npm run data:check          -> Tất cả kiểm tra đạt (hash, recordCount, canonical form)
npm run data:cross-check    -> PASS, 8/8 samples, 0 mismatches
npm run data:verify-live    -> LIVE VERIFICATION = PASS, exit 0
npm run research:experiment -> 3 experiments registered+completed (see §I)
```

Live network **was** available in this environment and was exercised for
real (not mocked) at every step above — this is genuine runtime evidence,
not a fabricated example. `data:verify-live`'s `NOT EXECUTED` path (exit 2,
distinct from a real failure) was implemented but not exercised this run
since the network was reachable; it is unit-testable via the same
`isNetworkUnreachable()` classification logic if needed later.

## M. Known limitations

1. **`lib/research/` split is additive, not a full §15 module extraction.**
   `analytics.ts` still holds the walk-forward engine, strategy
   implementations, and the temporal split — all pre-existing and
   already well-tested (23 tests). Rewriting/moving that code into
   `strategies.ts`/`walk-forward.ts`/`temporal-split.ts`/`baseline.ts` as
   §15 suggests was judged higher regression risk than value at this
   stage; the new research-extensibility surface (statistics, protocol,
   experiments, negative controls, rng) was built as new modules instead.
2. **Multiple-testing family not yet family-aware in practice.**
   `familyId` is recorded on every registered experiment, but
   `analytics.ts`'s live Holm-Bonferroni correction still runs over only
   the currently-visible strategy set per phase, not the full historical
   family read from `reports/experiments/registry.jsonl`.
3. **CI/testing method review (§22) not revisited.** The existing paired
   z-test was kept; bootstrap/permutation alternatives were not added.
4. **Protocol lock is not a persisted action.** `ProtocolLock` /
   `classifyEvidence()` exist and are tested, but nothing in this pass
   writes a lock record with a timestamp and a captured
   `prospectiveStartDrawId` — a future draw arriving today cannot yet be
   automatically classified without that lock being created first.
5. **`CURRENT_PROTOCOL.version` duplicates `analytics.ts`'s
   `PROTOCOL_VERSION` by hand** (a real circular-import constraint, not an
   oversight — documented in ADR-002); the two must be bumped together.
6. **UI Monte Carlo fairness diagnostic runs client-side** at a reduced
   simulation count (300) for responsiveness; the CLI/test default is
   2000+. This is a precision/interactivity tradeoff, not a correctness
   issue — both use the same, tested `monteCarloFairnessDiagnostic()`.
7. **`vietlott.vn` reachability is environment-dependent.** It answered
   normally in this environment; the donor repo's own history documents a
   Cloudflare 403 from some cloud hosts. `data:sync`/`data:verify-live`
   fail closed (old snapshot untouched; verify-live reports `NOT EXECUTED`)
   rather than guessing when it is unreachable.

## N. Deferred work

- Full §15 module split of `analytics.ts` (see M.1).
- Family-aware multiple-testing correction reading the experiment registry
  (see M.2).
- Bootstrap/permutation CI alternative for phases with small trial counts
  (see M.3).
- A persisted protocol-lock action (`npm run research:lock-protocol` or
  similar) that records `protocolLockedAt`/`prospectiveStartDrawId` so
  `classifyEvidence()` has something real to classify against going
  forward (see M.4).
- A stronger, sized negative-control run (more replications, a real
  false-positive-rate estimate with a confidence interval) as a separate,
  slower `npm run research:controls` script — the current battery is
  intentionally fast enough for `npm test` but is a coarse sanity check,
  not a certified measurement.
