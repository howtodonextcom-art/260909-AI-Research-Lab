# Algorithm Forensics — Remaining-debt closeout (P1-3, P1-1, P2-1, P2-2, N3)

Date: 2026-09-13 00:55 (UTC+7)  
Method: source-first remediation of the five items left open after `reports/26-09-13-00-40-algorithm-forensics-audit-v3.md`. Claims below are from this session’s commands, not from prior closeouts.

**Honesty:** nothing here is a new edge. HAC on the current bundled HOT/TEST series is still `hac < naive`, so `SE = max(HAC, naive)` still floors at naive. Changing bandwidth (N3) does not mean p-values or CIs have been “proved different.” Screening gates remain in-sample and do not drive `selectCandidate`.

Registry on this snapshot: **hypothesisCount = 3**, **lookCount = 1** (`public/data/experiment-family.json` matches `reports/experiments/registry.jsonl`). Holm familySize is the hypothesis count (alias), not the number of `experimentId`s.

---

## Verification table

| ID | Phương án đã chọn | PASS/FAIL | Lệnh + kết quả |
|---|---|---|---|
| **P1-3** | **B** — Holm = unique `hypothesisId`; `lookCount` = unique `datasetHash`; Pocock/Lan–DeMets incremental spend in `lib/research/alpha-spending.ts` (no `CURRENT_PROTOCOL` fields, protocol hash unchanged). `experimentId` still embeds dataset hash. `parseExperimentFamilySummary` fail-closed without `hypothesisCount`/`lookCount` or if `familySize !== hypothesisCount`. | **PASS** | Test “cùng 3 giả thuyết, 2 datasetHash → Holm familySize = 3, lookCount = 2”. Test “lookCount > 1: … alpha đã spend” pins look 2 = `0.018994274652086127` (< 0.05). look 1 keeps 0.05. UI: “số giả thuyết / registry”; DataStatus shows both counts + spent alpha. Browser: hypothesis=3, look=1, alpha=0.05. |
| **P2-1** | `significant = !isControl && oneSidedPValue(z) <= alpha` with `DEFAULT_ALPHA = 0.05` in `analytics.ts` (no protocol import cycle). | **PASS** | Test “cổng significant dùng one-sided p ≤ alpha, không hard-code 1.96”. Source no longer has `zScore >= 1.96`. RANDOM `passedCount === 0` still asserted. CI margin stays `1.96 * se` (two-sided 95%). |
| **P2-2** | Winsorize per-draw payout at giải Nhì / 4 số (`ROBUST_PAYOUT_CAP = FIXED_PRIZE.SECOND = 300_000`). Jackpot already `null`. Gate still independent of `significant` and `stableAcrossHalves`. | **PASS** | Test: one `FIRST` (10M) vs eleven `THIRD` — raw sum would flip, robust total does not. UI label “Trả thưởng bền đuôi hơn random” (not raw payout). |
| **N3** | `hacBandwidth(n, lookback) = min(lookback-1, max(1, floor(n^{1/3})))`. `SE = max(HAC, naive)` kept. | **PASS** | n=368 → lag **7**, not 89. AR series still HAC ≥ naive. HOT/TEST pin re-measured: **hac < naive** (`0.03805` vs `0.03995`, lag=7); `se === max`; HAC ≠ naive. UI method-note states the bandwidth rule. |
| **P1-1** | Injectable official-fetch cache (Cache API when present, isolate `Map` fallback). TTL = 12h. Keyed on official operation (`fetchAll` / `fetchSince:latestId`), never on `body.records`/`body.manifest`. `vietlottOfficialAdapter` write-path unchanged. | **PASS** | Test “lần refresh thứ hai trong TTL không gọi lại mạng official”; miss / expiry / `force: true` still hit official. DataStatus copy: user data on device; server cache is a politeness proxy, not a store. |

---

## Gate re-run (this session)

```
npx tsc --noEmit          → exit 0
npm test                  → typecheck + 80 business + 119 data, all pass
npm run lint              → exit 0
npm run data:check        → 1561 records, hash khớp manifest
npm run build             → vinext build succeeded (route /api/data/refresh present)
```

Browser (local wrangler `http://127.0.0.1:8787`, Research tab): DataStatus shows hypothesis **3**, look **1**, Pocock alpha **0.05**; proxy/no-store copy present; robust gate label and `n^(1/3)` bandwidth note visible. No new edge on holdout copy.

---

## Design notes (P1-3 B)

- `experimentId` still `${familyId}-${strategy}-${datasetHash.slice(0,8)}` so each look is a distinct artifact. Registry lines were not rewritten.
- Holm denominator is `countFamilyHypotheses` (fallback 3). Adding a look does not grow `familySize`.
- Unplanned looks: current look is treated as last of K = `lookCount` equally spaced looks; incremental Pocock spend `α*(k/K) − α*((k−1)/K)` (Lan–DeMets 1983; Pocock 1977).
- `selectCandidate` and Holm `significantAfterCorrection` use spent alpha. In-sample screening gates still use nominal `DEFAULT_ALPHA`.
- Protocol hash unchanged (`reports/protocol-lock.json` still matches `computeProtocolHash(CURRENT_PROTOCOL)`).

---

## HAC honesty (N3)

On bundled HOT/TEST differences (n=368, lookback=90): lag is now 7. HAC is live (≠ naive) but **still smaller than naive**, so reported SE/z/p/CI remain the naive-floor values. Do not read this closeout as “p-values moved because we fixed HAC.”

---

## Leftover debt

None of the five assigned IDs remain open. Spending was implemented (B), not deferred to A.

Out of scope / unchanged: no ML; official adapter crawl path untouched; no new edge claim; no commit / push / deploy.

---

## Key files

- `lib/research/alpha-spending.ts` (+ test)
- `lib/research/experiments.ts` (+ test, family JSON schema)
- `public/data/experiment-family.json`
- `scripts/run-experiment.ts`
- `lib/analytics.ts` (+ test)
- `lib/mega645.ts` (`FIXED_PRIZE`)
- `app/page.tsx`, `app/page.a11y.test.ts`
- `components/data-status.tsx`, `components/data-status.contract.test.ts`
- `lib/data/official-fetch-cache.ts` (+ test)
- `lib/data/refresh-handler.ts`
- `app/api/data/refresh/route.ts`
- `package.json` (new test files on `test:business` / `data:test`)
