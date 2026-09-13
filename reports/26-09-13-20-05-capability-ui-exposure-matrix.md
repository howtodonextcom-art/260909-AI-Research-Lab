# Capability → UI Exposure Matrix — Round 7b continuation

Supersedes rows in `reports/26-09-13-19-30-capability-ui-exposure-matrix.md` only where noted. Exposure classes remain the production vocabulary: `END_TO_END_PRODUCTION` / `READ_ONLY_PRODUCTION` / `OPERATOR_GATED_PRODUCTION` / `INTENTIONALLY_DISABLED` (plus existing `STUB_NOT_PROMOTED` for Ranking Score).

| Capability | Source | Engine | UI | Status | Tests / browser |
|---|---|---|---|---|---|
| Exact Random vs Projective benchmark | `lib/research/exact-benchmark.ts` | exact math | Portfolio tab primary table | END_TO_END_PRODUCTION | unit + MCP 10/20/30 |
| Portfolio 1–30 stepper | `components/portfolio-lab.tsx` | `optimizePortfolio` | Portfolio budget card | END_TO_END_PRODUCTION | MCP + E2E structural |
| Panel error boundaries | `components/panel-error-boundary.tsx` | n/a | wraps Research optional panels | END_TO_END_PRODUCTION | `ui-error-boundary.contract.test.ts` |
| Freshness labels | `lib/data/freshness.ts` | pure classifier | Data Status badge | END_TO_END_PRODUCTION | unit + MCP Delayed |
| CSP / security headers | `lib/security/headers.ts`, `public/_headers`, `middleware.ts` | n/a | all HTML/assets/API | END_TO_END_PRODUCTION | headers tests + wrangler curl |
| Health / readiness | `app/api/health`, `app/api/readiness` | readiness checks | ops probes | END_TO_END_PRODUCTION | route tests + live smoke |
| Refresh rate limit | `lib/data/rate-limit.ts` | single-isolate | `X-RateLimit-Scope` header | END_TO_END_PRODUCTION (honest scope) | route tests |
| Distributed / WAF rate limit | Cloudflare platform | n/a | n/a | OPERATOR_GATED_PRODUCTION / blocked | runbook §8 |
| Live deploy / rollback drill | external hosting | n/a | runbook §3 | OPERATOR_GATED_PRODUCTION / blocked | local smoke only |
| Provenance verify CLI | `scripts/verify-provenance.ts` | chain verify | CI + Capability Inspector | OPERATOR_GATED_PRODUCTION | CI |
| Prospective freeze/append | `scripts/research-prospective.ts` | ledger | mutation CLI only | OPERATOR_GATED_PRODUCTION | unit |
| Ranking Score | `lib/research/ranking-score.ts` | stub | Capability Inspector one-liner | INTENTIONALLY_DISABLED / STUB_NOT_PROMOTED | ban contracts |
| Scientific Verdict | `components/scientific-verdict.tsx` | read-only | Research first | READ_ONLY_PRODUCTION | contracts + MCP |
| Bao-18 panel | `components/bao18-panel.tsx` | summary JSON | Research | READ_ONLY_PRODUCTION | contracts + E2E |
| Diagnostics Ablation/MC | `components/diagnostics-panel.tsx` | summary JSON | Research | READ_ONLY_PRODUCTION | contracts |

Scientific statuses remain **NO_DEMONSTRATED_EDGE** / **PROSPECTIVE_EVIDENCE_PENDING** on predictive claims; portfolio exact lift is structural coverage only.
