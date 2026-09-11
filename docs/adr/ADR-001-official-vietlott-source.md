# ADR-001: Official vietlott.vn as primary source; mirror demoted to secondary/cross-check

## Status
Accepted, implemented.

## Context
Before this change, `lib/data/sources/vietlott-data.ts` (the
`vietvudanh/vietlott-data` GitHub mirror) was the *only* source adapter, and
therefore the de facto primary source. The baseline snapshot
(`public/data/power645.jsonl`) started at draw `#00198` (2017-10-25) with
1362 records, even though Mega 6/45's first draw is `#00001` (2016-07-20).
Roughly the product's first 15 months were missing from the primary repo —
a real DATA TRUTH gap, discovered by reading the donor repo's already-fetched
official dataset (`260911-AI-Research-Lab-Python/data/official_mega645.jsonl`,
1561 records, 2016-07-20 → 2026-09-11) and comparing it against ours.

The donor repo's `vietlott_mega645/client.py` already implements official
ingestion (detail page, history table, AjaxPro pagination), but with a
dangerous failure mode: a page yielding zero parsed rows is treated as
end-of-history purely from `len(records) < 8: break`, with no check that
the crawl actually reached the documented start of history.

## Decision
- `lib/data/sources/vietlott-official.ts` is a native TypeScript port
  (not a line-for-line translation) of the donor's ingestion logic,
  implementing the `DrawSourceAdapter` interface already used by the
  mirror, and is now what `scripts/data-sync.ts` syncs from.
- The mirror (`vietlott-data.ts`) is demoted: never fetched during
  `data:sync`, recorded as `manifest.source.secondary`, and consulted only
  by `data:cross-check` — which can never overwrite the primary snapshot,
  only report a mismatch.
- Parser failure semantics are made explicit
  (`PARSE_SUCCESS` / `PARSE_EMPTY_VALID_PAGE` / `PARSE_STRUCTURE_CHANGED` /
  `FETCH_FAILED`, §8 of the master prompt) instead of inferring EOF from an
  empty page. Concretely: EOF is only accepted once the crawl has
  *positively observed* a known anchor — draw `#00001` for a full crawl, or
  the previously synced `latestId` for an incremental one — in the actual
  parsed row ids. A page with zero rows before that anchor is reached
  raises `OfficialParseError` (`PARSE_STRUCTURE_CHANGED`) instead of
  silently ending the crawl.

## Evidence
Regex patterns and the 8-rows-per-page / short-last-page assumption were
verified against a **live fetch of vietlott.vn during this implementation**
(2026-09-11/12), not just the donor's fixtures — including probing pages
194–500 to observe the real boundary behavior (page 195: 1 row, id
`#00001`; pages 196+: valid wrapper, zero rows). A full live crawl was then
run via `data:sync --force`:

```
Nguồn                    vietlott-official
Bản ghi nhận về          1561
Thêm mới                 199
Kỳ đầu tiên              2016-07-20
Kỳ mới nhất              2026-09-11
Xung đột                 0
```

`data:cross-check` then verified 8 deterministic samples (first, latest,
middle, 5 seeded) against both the official detail page and the mirror:
`PASS`, 0 mismatches. See `reports/research-core-upgrade-final.md` for the
full runtime evidence.

## Consequences
- The canonical dataset now covers the full documented history with zero
  missing ids (see ADR unrelated to continuity checks in
  `lib/data/continuity.ts`).
- `data:sync` is slower on a cold start (a full crawl pages through ~196
  AjaxPro requests at a deliberate ~400ms delay each) but cheap on repeat
  runs (incremental crawl stops as soon as it reaches the previously
  synced draw).
- The official site has no HTTP ETag for its HTML; `manifest.sourceEtag`
  is repurposed to carry the last-synced draw id for this adapter
  specifically (documented in `vietlott-official.ts`).
- Risk carried forward: vietlott.vn is reachable from this development
  environment, but the donor repo's own commit history notes it can return
  Cloudflare 403 from some cloud environments (e.g. Streamlit Cloud).
  `data:verify-live` distinguishes "could not reach the source at all" (exit
  2, `LIVE VERIFICATION = NOT EXECUTED`) from a real structural/data finding
  (exit 1) for exactly this reason.
