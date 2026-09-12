# Inventory 100/100 closeout

Date: 2026-09-12 22:50 (UTC+7)  
Scope: remaining SHIPPED + SUPPORT + RESEARCH F-xx from `reports/26-09-12-21-40-capability-hygiene-inventory.md`.  
Out of scope: claim-only 8-module split of `analytics.ts`.

Runtime: `npm test` → **57 business + 105 data, all pass**. `npm run data:check` → pass (1561 records, hash khớp).

| ID | Before | After | File | Test |
|---|---|---|---|---|
| eslint leftover | `eslint.config.mjs` listed deleted `hooks/use-mobile.ts` | Chỉ còn `components/ui/**` | `eslint.config.mjs` | config grep: 0 `use-mobile` |
| F-03 | `copyTickets` inline, 0 test | `copyTickets` + `formatPortfolioTickets` thuần, clipboard inject | `lib/portfolio.ts`, `components/portfolio-lab.tsx` | `copyTickets ghi đúng chuỗi đã format qua clipboard giả` |
| F-04 | Seed lặp được, chưa chứng minh seed đổi → vé đổi | Thêm assert seed 1 ≠ seed 2 | `lib/portfolio.test.ts` | `seed khác nhau sinh portfolio khác nhau` |
| F-09 | UI hard-code `simulationCount: 300` | `CURRENT_PROTOCOL.fairnessSimulationCount = 2000`; UI đọc field này | `lib/research/protocol.ts`, `app/page.tsx` | `fairnessSimulationCount mặc định ≥ 2000`; `page.a11y` không còn `300` |
| F-12 | Gates/selectCandidate mỏng | Thêm RANDOM ignore, tie-break edge, alpha biên, 3 cổng boolean | `lib/analytics.test.ts` | `ứng viên chỉ đến từ validation…`; `kết quả backtest báo cáo cổng…` |
| F-18 | So byte thô, dễ vỡ CRLF | So sau `\r\n`→`\n`; `.gitattributes` `*.jsonl text eol=lf` | `lib/data/jsonl.ts`, `scripts/data-check.ts`, `.gitattributes` | `canonicalizeNewlines…`; `npm run data:check` |
| F-20 | Chỉ spot-sample | Thêm `compareIdSets` (official vs mirror) trên toàn tập id | `lib/data/cross-check.ts`, `scripts/data-cross-check.ts` | `compareIdSets: official vs mirror…` |
| F-21 | `isNetworkUnreachable` chỉ trong script | Extract + unit test; live vẫn exit 2 = NOT EXECUTED | `lib/data/live-verification.ts` | `isNetworkUnreachable: … → NOT EXECUTED` |
| F-22 | Empty `continuous: true`; sync không chặn gap | Empty `continuous: false`; `runSync` fail-closed trừ `--allow-gaps` | `lib/data/continuity.ts`, `lib/data/sync.ts`, `scripts/data-sync.ts` | `dataset rỗng: continuous = false`; `dataset sau merge bị đứt kỳ thì fail-closed` |
| F-23 | Mỗi lần chạy append trùng | Registry parse + skip `experimentId` đã có | `lib/research/experiments.ts`, `scripts/run-experiment.ts` | `registry parse + idempotent lookup` |
| F-25 | `classifyEvidence` orphan khỏi artifact | Artifact `controls` gắn lock + `latestDrawEvidence` | `lib/research/experiments.ts`, `scripts/run-experiment.ts` | `artifact gắn classifyEvidence từ protocol lock` |
| F-26 | Controls chỉ `npm test` | `npm run research:controls` chạy A/B/C | `scripts/research-controls.ts`, `package.json` | script + existing negative-control tests |
| F-27 | Endpoint/0.8 chỉ trong lib | DataStatus hiện `PRIMARY_ENDPOINT` + `EXPECTED_MATCHES`; controls in ra | `components/data-status.tsx`, `scripts/research-controls.ts` | `DataStatus surface PRIMARY_ENDPOINT và EXPECTED_MATCHES` |
| F-29 | Skip-link/tabs chưa có test tĩnh | Test đọc `app/page.tsx` | `app/page.a11y.test.ts` | `page có skip-link tới #workspace và đúng 3 TabsTrigger` |
| Holm | `holmBonferroni` luôn `items.length` (3) | `familySize` từ registry `familyId`; registry rỗng → visible-3 | `lib/analytics.ts`, `scripts/run-experiment.ts` | `Holm dùng familySize lớn hơn… conservative hơn` |

**Không đụng:** write-path official refresh (`POST /api/data/refresh`); không tách `analytics.ts` 8 module; không ML.

Protocol hash đổi vì thêm `fairnessSimulationCount`. `reports/protocol-lock.json` vẫn là khóa lịch sử (`prospectiveStartDrawId: "01562"`). Artifact ghi cả lock cũ và hash hiện tại.
