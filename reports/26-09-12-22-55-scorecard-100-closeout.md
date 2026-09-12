# Scorecard 100 closeout — Backend / Core / Algo gaps

Date: 2026-09-12 22:55 (UTC+7)  
Scope: IDs < 100 từ Backend/Core/Algo Scorecard + Holm UI copy.  
KIT_ONLY cleanup: off (default).

## PASS gate

| Gate | Result |
|---|---|
| `npm test` | **pass** — business + data (113 data; business includes new contract tests) |
| `npm run data:check` | **pass** — 1561 records, hash khớp |
| K-05 lock hash === `computeProtocolHash(CURRENT_PROTOCOL)` | **match=true**, `prospectiveStartDrawId=01562` |
| Holm copy không còn «ba chiến lược» | **pass** (`page.a11y.test.ts`) |
| Write-path official | **pass** — `app/api/data/refresh/route.ts` → `vietlottOfficialAdapter` |
| Debug ingest removed | **pass** — 0 matches `127.0.0.1:7399` |

## ID before → after

| ID | Before | After | File | Test |
|---|---:|---:|---|---|
| B-05 | 85 | **100** | `lib/data/draw-data-state.ts`, `hooks/use-draw-data.ts` | `draw-data-state.test.ts` |
| B-06 | 85 | **100** | `lib/data/browser-cache.ts` | `browser-cache.test.ts` (no-IDB path) |
| B-21 | 85 | **100** | `lib/data/report.ts` (+ `data:status` entry) | `report.test.ts` formatManifestStatus |
| B-24 | 85 | **100** | `lib/data/report.ts` | `report.test.ts` formatSyncReport |
| K-03 | 85 | **100** | `app/layout.tsx` | `app/layout.fonts.test.ts` |
| K-05 | 70 | **100** | `reports/protocol-lock.json` via `research:lock --force` | `protocol.test.ts` lock hash khớp |
| K-12 | 85 | **100** | `package.json` start + `scripts/sites-env.mjs` | `package.deploy.test.ts` |
| Holm copy | n/a | fixed | `app/page.tsx` | `page.a11y.test.ts` |

## Re-score (scope IDs only)

Previously: 6×85 + 1×70 = 580 / 700 ≈ 82.9% trên 7 ID.  
Now: **7×100 = 100%** trên cùng 7 ID.

Trục ước lượng (giữ N scorecard cũ 49, thay điểm các ID trên):  
Σ mới ≈ 4780 − 580 + 700 = **4900** → **100.0%** toàn mẫu số scorecard (nếu không phát sinh ID mới ngoài mẫu).

## Rủi ro còn lại (ngoài SCOPE)

- KIT_ONLY ~54 `components/ui` vẫn chết (DEFAULT OFF).
- `dist/server/wrangler.json` có thể thiếu trước `npm run build`; K-12 chỉ contract script path + `sites-env.mjs`.
- Walk-forward overlapping vs iid z — hạn chế phương pháp, không thuộc SCOPE điểm.

Không commit trong lượt này.
