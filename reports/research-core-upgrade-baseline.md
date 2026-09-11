# Research Core Upgrade — Baseline

Captured before any remediation work for the Master Prompt
("Upgrade Mega 6/45 AI Research Lab to Scientific Research Core").

## Environment

| Fact | Value |
|---|---|
| Repository | `260909-AI-Research-Lab` (primary, kept) |
| Donor repository | `260911-AI-Research-Lab-Python` (reference only) |
| Git commit (primary) | `ff101f448bdcae94299cf0de958cc3eeac8837c8` |
| Branch | `main` |
| Working tree | clean except untracked `.claude/` and `prompts/` (pre-existing, not part of this work) |
| Node | v24.14.1 |
| npm | 11.12.1 |
| Package manager | npm (`package-lock.json`) |

## Baseline test/lint/build status

```
npm run test   -> 23 business tests + 60 data tests = 83 passed, 0 failed
npm run lint   -> clean, no errors
npm run build  -> vinext build succeeded (exit 0)
```

All 83 pre-existing tests are classified **PRE-EXISTING PASS**. No failures to classify.

## Baseline dataset (primary repo)

File: `public/data/power645.jsonl`, manifest `public/data/power645.manifest.json`.

| Field | Value |
|---|---|
| Source | `vietlott-data` mirror (`vietvudanh/vietlott-data`, MIT) |
| Record count | 1362 |
| First draw date | 2017-10-25 |
| Latest draw date | 2026-09-06 |
| Dataset SHA-256 | `6410e30d0c4224fb2f319a765ec38429f8e476d8217765edfe2cba3ac7b23c38` |
| Manifest schema version | 1 |

**Finding:** the primary snapshot is *not* the full canonical history. Mega 6/45 draw
`#00001` is dated 2016-07-20, but the bundled mirror snapshot starts at 2017-10-25 —
roughly the product's first ~15 months are missing from the primary repo entirely.
This is the concrete instance of "DATA TRUTH" gap the master prompt targets.

## Donor dataset (reference only)

File: `260911-AI-Research-Lab-Python/data/official_mega645.jsonl`, fetched directly
from `vietlott.vn` official history table by `vietlott_mega645/client.py`.

| Field | Value |
|---|---|
| Source | `vietlott.vn` official history table |
| Record count | 1561 |
| First draw | `#00001`, 2016-07-20 |
| Latest draw | `#01561`, 2026-09-11 |
| Dataset SHA-256 | `28ab1cf9c2cf9c802512b8a41f66db3d957cc7945bd435937fd94e26f8d4693c` |
| Manifest schema version | 1 (donor's own schema, distinct from primary's) |

This donor snapshot is a legitimate reference/cross-check artifact (it was fetched by
a human/agent run of the donor's own `client.py` against the live site on
2026-09-11T17:20:56Z), not something this task fabricates. It is used as:
1. a **secondary cross-check fixture** for the new official adapter's parser tests, and
2. the **seed for the replacement primary snapshot**, since it is the fullest
   verified official-source dataset available locally. Live re-verification is
   still attempted via `data:verify-live` per §33; if network access to
   `vietlott.vn` is unavailable in this environment, live verification is marked
   `NOT EXECUTED` rather than faked (see final report).

## Primary repo architecture reconstruction

```
lib/data/
  types.ts        canonical DrawRecord/DatasetManifest/SyncSummary contracts
  schema.ts        per-record normalization + validation (date, id, 6 unique 1..45)
  jsonl.ts         JSONL parse/serialize, canonical ordering, deterministic hash input
  hash.ts          SHA-256 over canonical serialization (WebCrypto)
  merge.ts         merge policy (existing always wins; conflicts reported, never applied)
                    + validateDataset whole-dataset invariants
  manifest.ts       manifest v1 builder, derived only from data (no hard-coding)
  sync.ts          fs/network-free orchestration: fetch -> normalize -> merge -> validate
                    -> atomic save; fails closed at every stage
  persistence.ts    Node-only atomic snapshot writer (tmp + rename, dataset before manifest)
  refresh.ts        browser-side load/refresh, TTL policy, cache-vs-bundled selection
  browser-cache.ts  browser storage for the synced snapshot
  http.ts           allowlisted, capped, retrying fetch used by adapters
  report.ts         human-readable sync/status report formatting
  sources/
    source-adapter.ts   DrawSourceAdapter contract (fetchAll/fetchSince/normalize)
    vietlott-data.ts     ONLY existing adapter: the vietvudanh/vietlott-data GitHub mirror

lib/
  analytics.ts   walk-forward pipeline, strategies (RANDOM/HOT/COLD/BALANCED), stats
                  (currently: chi-square as naive df=44, 32-seed random baseline,
                  Holm-Bonferroni over currently-visible strategies)
  mega645.ts      prize tiers, ticket validation, exact match-probability distribution
  portfolio.ts    projective-plane portfolio construction (pairwise intersection <= 1)
  profit.ts       ledger/ROI accounting

scripts/
  data-sync.ts        npm run data:sync   — runs runSync against the (single) mirror adapter
  data-status.ts      npm run data:status — prints manifest status
  data-check.ts       npm run data:check  — local integrity check
  data-verify-live.ts  npm run data:verify-live — live network check (separate from test suite)

test/fixtures/
  draws-valid.jsonl, draws-duplicate.jsonl, draws-conflict.jsonl, draws-invalid.jsonl
```

**Key gaps versus the master prompt, confirmed by reading source (not README):**

1. `lib/data/sources/` has exactly one adapter (the GitHub mirror). There is no
   official `vietlott.vn` adapter, so the mirror is de facto primary — inverted
   from the target hierarchy in §6.
2. No continuity/missing-ID analysis exists anywhere in `lib/data`.
3. No cross-source verification / spot-check exists.
4. Manifest is schema v1 with a single flat `source` object; no `source.primary` /
   `source.secondary`, no `crossCheck`, no `missingIds`.
5. `analytics.ts` bundles strategies, walk-forward, statistics, and reporting in one
   file (does not yet violate correctness, but is the target of the §15 split).
6. Chi-square diagnostic in `analytics.ts` uses the naive df=44 interpretation the
   master prompt explicitly flags as statistically incorrect for a without-replacement
   6/45 draw (negatively correlated number counts).
7. No experiment registry, no protocol freeze/hash, no experiment artifact.
8. No negative-control battery (IID synthetic / time-shuffle / random-baseline /
   future-mutation controls) beyond the existing future-mutation-style walk-forward
   tests already present in `lib/analytics.test.ts`.

This file is the frozen "before" reference for the final report's before/after and
regression sections. It is not updated after this point; deltas are described in
`reports/research-core-upgrade-final.md`.
