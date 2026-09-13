# Browser E2E + MCP Acceptance — Round 7b continuation

**HEAD:** `00cee3c4b9fefc31083292a791569fe6700756e4`  
**Date:** 2026-09-13

## Playwright CI (`npm run e2e:ci`)

| Project | Result |
|---|---|
| Desktop Chromium 1440×900 | 7/7 pass |
| Mobile 390×844 | 7/7 pass |
| **Total** | **14/14 pass** (exit 0, ~34.5s) |

Specs: banned-phrases, data-explorer, keyboard-smoke, portfolio-tab, research-overview, responsive, ticket-simulator.

CI wiring: `.github/workflows/ci.yml` runs `npx playwright install --with-deps chromium` then `npm run e2e:ci` after build (no `continue-on-error`).

## Local production smoke (`npm start` → wrangler `:8787`)

| Probe | Result |
|---|---|
| `GET /api/health` | 200 `{"status":"ok",...}` + CSP + `X-Request-Id` |
| `GET /api/readiness` | 200 `ok:true` — dataset/manifest/protocolLock/requiredArtifact all ok |
| `GET /` HTML | 200 + `Content-Security-Policy` (+ frame/nosniff/referrer/permissions) |
| `GET /favicon.svg` | 200 + CSP from Assets `_headers` |
| Wrangler log | `Parsed 2 valid header rules` |

## Browser MCP (Playwright MCP against `npm run dev` `:5173`)

| Journey | Result |
|---|---|
| Research default | Verdict-first (“Kết luận khoa học hiện tại”, CHƯA CHỨNG MINH); h1 “Thống kê không phải dự đoán.” |
| Freshness UX | Badge `Độ tươi: Delayed` visible (honest vs silent Fresh) |
| Automation bias | Button “Hiển thị bộ số thử nghiệm” present (hidden by default) |
| Portfolio tab | Selected; budget card; `[aria-label=Tăng 1 vé]` stepper |
| Stepper 10→20→30 | Labels `20 vé đang chọn · có thể điều chỉnh từ 1–30 vé` and `30 vé…` verified |
| Exact benchmark table | Headers Projective / Random / Lift; rows for 10/20/30 with small exact lifts |
| Console | 0 errors / 0 warnings (only React DevTools info) |

## Red-team spot checks (continuation focus)

| # | Question | Answer after remediation |
|---|---|---|
| 1 | Mistake 10 as max tickets? | NO — stepper label + max 30 |
| 2 | MC contradict exact? | NO — exact table primary on Portfolio |
| 14 | Optional artifact crash Research? | NO — `PanelErrorBoundary` on optional panels |
| 6 | Stale appear current? | NO — Fresh/Delayed/Stale/Unknown badge |
| 13 | Rate limit across isolates? | YES still possible — honestly disclosed, not claimed fixed |
| 12 | Public refresh abuse? | PARTIAL — single-isolate + coalescing/cache; WAF gated |

## Not claimed

Live multi-browser cloud acceptance against a deployed Cloudflare URL (no credentials).
