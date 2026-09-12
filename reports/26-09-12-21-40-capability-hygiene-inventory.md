# Capability & Hygiene Inventory — Mega 6/45 Research Lab

| Trường | Giá trị |
|---|---|
| Ngày / giờ | 2026-09-12 21:40 (UTC+7) |
| HEAD | `42944a4` |
| Phương pháp | Source-first: grep export `lib/`, mọi key `package.json`, import `@/components/ui` từ `app/` + lab components. README/ADR chỉ là CLAIM. |
| Canvas | `canvases/capability-hygiene-inventory.canvas.tsx` (bên ngoài repo git) |

**Điểm toàn sản phẩm ≈ 92%** trên 30 hạng mục SHIPPED + SUPPORT + RESEARCH. Không phải 92% toàn repo. F-25 (protocol lock, 40%, ORPHAN) không vào trung bình.

Công thức % (làm tròn 5%):

| Điều kiện | Điểm |
|---|---:|
| Symbol + đường vào + test/invariant + nhất quán nguồn | 100 |
| Thiếu test UI, còn lại đủ | 85 |
| Có symbol + đường vào, mâu thuẫn nguồn/protocol | 70 |
| Có symbol, không đường vào (orphan logic) | 40 |
| Chỉ type/stub/comment | 15 |
| Chỉ docs | 0 — không tính vào năng lực đã ship |

Tính: 16×100 + 12×85 + 2×70 = 2760 / 30 = **92%**. Caveat: đây là “lab chạy được và có test trên đường đã chọn”, không phải repo sạch hay family-aware Holm.

---

## A. Bản đồ module

| Module | Path | Trách nhiệm (từ code) | F-xx | Nhóm |
|---|---|---|---|---|
| Rules 6/45 | `lib/mega645.ts` | Hằng số, validate, quick-pick WebCrypto, đối chiếu giải | F-16 | SHIPPED |
| Hypergeometric / lãi | `lib/profit.ts` | C(n,k), outcomes, ledger 30k, kỳ vọng giải cố định | F-13, F-27 | SHIPPED |
| Analytics | `lib/analytics.ts` | Cửa sổ, tần suất, walk-forward, Holm/phase, selectCandidate | F-07–F-12 | SHIPPED |
| Portfolio math | `lib/portfolio.ts` | Mặt phẳng xạ ảnh cấp 5, odds đúng nếu ∩≤1 | F-01–F-05 | SHIPPED |
| Stats / MC | `lib/research/statistics.ts` | Endpoint 0.8, MC fairness, null exact | F-09, F-27 | SHIPPED+RESEARCH |
| RNG | `lib/research/rng.ts` | mulberry32 + vé công bằng cho MC/controls | F-09, F-26 | SUPPORT |
| Protocol | `lib/research/protocol.ts` | CURRENT_PROTOCOL + hash; lock chưa persist | F-24, F-25 | RESEARCH |
| Experiments | `lib/research/experiments.ts` | register/transition/artifact thuần | F-23 | RESEARCH |
| Neg. controls | `lib/research/negative-controls.ts` | Control A/B/C; chỉ `npm test` | F-26 | RESEARCH |
| HTTP guard | `lib/data/http.ts` | Allowlist HTTPS, timeout, cap, retry | F-28 | SUPPORT |
| Schema | `lib/data/schema.ts` | normalizeDraw, lịch thật, conflict | F-17 | SUPPORT |
| JSONL | `lib/data/jsonl.ts` | Parse/serialize canonical LF | F-15, F-18 | SUPPORT |
| Merge | `lib/data/merge.ts` | Existing wins; validateDataset | F-17 | SUPPORT |
| Sync | `lib/data/sync.ts` | Orchestrate fail-closed | F-17, F-14 | SUPPORT |
| Persist | `lib/data/persistence.ts` | Atomic write CLI; không import client | F-17 | SUPPORT |
| Browser cache | `lib/data/browser-cache.ts` | Cache snapshot; `clearCache` không ai gọi | F-15 | SUPPORT |
| Refresh UI | `lib/data/refresh.ts` | loadDataset + runSync(mirror) | F-14, F-31 | SHIPPED |
| Official src | `lib/data/sources/vietlott-official.ts` | Crawl AjaxPro, EOF neo `#00001` | F-17, F-30 | SHIPPED |
| Mirror src | `lib/data/sources/vietlott-data.ts` | GitHub JSONL; CLI cross-check + UI write | F-20, F-31 | SHIPPED |
| Adapter iface | `lib/data/sources/source-adapter.ts` | Hợp đồng fetchAll/fetchSince/normalize | F-17 | SUPPORT |
| Continuity | `lib/data/continuity.ts` | Thiếu/trùng id; không chặn ghi | F-22 | SUPPORT |
| Cross-check | `lib/data/cross-check.ts` | Sample 8, seed 645 | F-20 | RESEARCH |
| Manifest | `lib/data/manifest.ts` | Hash + source v2 từ dataset | F-17 | SUPPORT |
| Report CLI | `lib/data/report.ts` | formatSyncReport / formatManifestStatus | F-17, F-19 | SUPPORT |
| Hash | `lib/data/hash.ts` | sha256Hex | F-24 | SUPPORT |
| Types data | `lib/data/types.ts` | DrawRecord / manifest / sync types | — | SUPPORT |
| cn() | `lib/utils.ts` | clsx+twMerge; dùng trong UI kit | kit | SUPPORT |
| Hook data | `hooks/use-draw-data.ts` | Load + auto-refresh 12h + nút update | F-14, F-15 | SHIPPED |
| DataStatus | `components/data-status.tsx` | Panel nguồn + Cập nhật dữ liệu | F-14, F-22 | SHIPPED |
| PortfolioLab | `components/portfolio-lab.tsx` | Tab Portfolio 4+ | F-01–F-05 | SHIPPED |
| ProfitLab | `components/profit-lab.tsx` | Ledger 20k trong tab Nghiên cứu | F-13 | SHIPPED |
| Page | `app/page.tsx` | 3 tab + ResearchLab + TicketLab | F-01, F-06, F-16, F-29 | SHIPPED |
| Layout | `app/layout.tsx` | Font next/font, metadata | — | SHIPPED |
| CLI data-* | `scripts/data-*.ts` | sync/check/status/cross-check/verify-live | F-17–F-21 | SHIPPED |
| CLI experiment | `scripts/run-experiment.ts` | Ghi registry.jsonl + artifacts | F-23 | RESEARCH |
| Framework | `scripts/run-framework.mjs`, `sites-env`, `install-ci` | dev/build/start | scripts | SUPPORT |
| Auth stub | `app/chatgpt-auth.ts` | getChatGPTUser — 0 import | — | ORPHAN |
| use-mobile | `hooks/use-mobile.ts` | Chỉ `sidebar.tsx` (kit chết) | — | ORPHAN |
| D1 stub | `db/index.ts`, `db/schema.ts` | drizzle D1; schema rỗng `export {}` | db:generate | ORPHAN |
| D1 example | `examples/d1/**` | Notes API mẫu starter | — | ORPHAN |
| UI kit | `components/ui/*` (54 file) | shadcn không được app/lab import | — | ORPHAN |

---

## B. Bản đồ tính năng

| ID | Tính năng | Vì sao cần | Module / symbol | Đường vào | % | Nhóm |
|---|---|---|---|---|---:|---|
| F-01 | Tab Portfolio 4+ | Độ phủ tổ hợp, không đoán số | `PortfolioLab` | `TabsTrigger portfolio` | 100 | SHIPPED |
| F-02 | Slider 1–30 vé + optimizePortfolio | Sinh khối ∩≤1 | `lib/portfolio.ts` → `optimizePortfolio` | Slider | 100 | SHIPPED |
| F-03 | Sao chép vé | Đưa bộ số ra ngoài lab | `copyTickets` | nút Sao chép | 85 | SHIPPED |
| F-04 | Bộ khác (seed) | Relabel mặt phẳng | `refreshSeed` | nút Bộ khác | 85 | SHIPPED |
| F-05 | Odds ≥4/≥5/jackpot + cặp phủ | P(union) đúng nhờ ∩≤1 | `calculatePortfolioOdds`, `countCoveredPairs` | metrics | 100 | SHIPPED |
| F-06 | Tab Nghiên cứu | Khung thống kê lịch sử | `ResearchLab` | `TabsTrigger research` | 100 | SHIPPED |
| F-07 | Cửa sổ 30D/90D/365D/ALL | Cắt mẫu tần suất | `filterByWindow` | window-switch | 100 | SHIPPED |
| F-08 | Ma trận tần suất + nóng/lạnh/vắng | Mô tả phân bố 1–45 | `calculateFrequency` | frequency-matrix | 100 | SHIPPED |
| F-09 | Chẩn đoán fairness MC | Không dùng chi-square(44) | `monteCarloFairnessDiagnostic`; UI S=300 | Metric | 85 | SHIPPED |
| F-10 | Bảng walk-forward mô tả | So RANDOM/HOT/COLD/BALANCED | `runWalkForwardBacktest` | Table lịch sử | 100 | SHIPPED |
| F-11 | Holdout 50/25/25 + Holm + candidate | Chọn trên validation, test xác nhận | `runTemporalBacktestReport`, `selectCandidate` | holdout-card | 100 | SHIPPED |
| F-12 | Khảo sát strategy + 3 cổng + gợi ý 6 số | Thăm dò in-sample, không khuyến nghị | `createStrategyPick` + gates | aside | 85 | SHIPPED |
| F-13 | ProfitLab 20k | Ngân sách vs P(trùng 3) | `profitLedger`, `outcomes` | ProfitLab dưới holdout | 100 | SHIPPED |
| F-14 | Cập nhật dữ liệu (UI) | Làm mới snapshot trên máy | `refreshDataset` → **mirror** | DataStatus / auto 12h | **70** | SHIPPED |
| F-15 | Load bundled + cache | App không chặn mạng lúc mở | `loadDataset`, `pickBestSnapshot` | `useDrawData` mount | 100 | SHIPPED |
| F-16 | Tab vé mô phỏng + quay | Đối chiếu giải độc lập | `generateQuickPick`, `evaluateTicket` | TicketLab | 100 | SHIPPED |
| F-17 | CLI `data:sync` official | Canonical từ vietlott.vn | `vietlottOfficialAdapter` + `runSync` | `npm run data:sync` | 100 | SHIPPED |
| F-18 | CLI `data:check` | Hash/canonical offline | `scripts/data-check.ts` | `npm run data:check` | 85 | SHIPPED |
| F-19 | CLI `data:status` [+json] | In continuity + manifest | `scripts/data-status.ts` | `npm run data:status` | 100 | SHIPPED |
| F-20 | CLI `data:cross-check` | Official detail vs local vs mirror | `runCrossCheck` n=8 | `npm run data:cross-check` | 85 | RESEARCH |
| F-21 | CLI `data:verify-live` | Live fetch official | `scripts/data-verify-live.ts` | `npm run data:verify-live` | 85 | SHIPPED |
| F-22 | Continuity panel/CLI | Báo thiếu id, không backfill | `analyzeContinuity` | DataStatus + data:status | 85 | SUPPORT |
| F-23 | `research:experiment` | Ghi registry + artifact TEST | `scripts/run-experiment.ts` | `npm run research:experiment` | 85 | RESEARCH |
| F-24 | Protocol hash | Khóa endpoint/α/lookback/strategies | `computeProtocolHash` | artifact + DataStatus version | 100 | RESEARCH |
| F-25 | Protocol lock persist | Ranh giới prospective | `classifyEvidence` only; 0 script lock | chỉ test | 40 | ORPHAN |
| F-26 | Negative controls A/B/C | Sanity null; D = `analytics.test.ts` | `negative-controls.ts` | `npm test` only | 85 | RESEARCH |
| F-27 | Null exact `matchProbability`… | Hợp đồng hypergeometric | `statistics.ts` | test; UI dùng gián tiếp `EXPECTED_MATCHES` | 85 | RESEARCH |
| F-28 | HTTP allowlist | Không SSRF / host lạ | `assertAllowedUrl` | mọi fetch adapter | 100 | SUPPORT |
| F-29 | Skip link / nav / footer | A11y + disclaimer | `app/page.tsx` | markup | 85 | SHIPPED |
| F-30 | EOF neo official | Không cắt lịch sử khi parse 0 hàng | `parseHistoryHtml` + `crawl` | `data:sync` | 100 | SUPPORT |
| F-31 | Mirror adapter | Cross-check + (lệch) UI sync | `vietlott-data.ts` | cross-check + `refresh.ts:112` | **70** | SHIPPED |

### npm scripts

| Script | Trỏ tới | Nhóm |
|---|---|---|
| `install:ci` | `scripts/install-ci.mjs` | SUPPORT |
| `dev` / `build` | `scripts/run-framework.mjs` | SUPPORT |
| `start` | wrangler + `scripts/sites-env.mjs` | SUPPORT |
| `lint` | eslint | SUPPORT |
| `test` / `test:business` / `data:test` | `node --test lib/**` | SUPPORT |
| `data:sync` / `check` / `status` / `status:json` / `verify-live` / `cross-check` | `scripts/data-*.ts` | SHIPPED |
| `research:experiment` | `scripts/run-experiment.ts` | RESEARCH |
| `db:generate` | drizzle-kit generate — schema rỗng | SURPLUS |

---

## C. Tổng hợp %

16×100 + 12×85 + 2×70 = **2760 / 30 = 92%**.

Kéo xuống bởi F-14/F-31 (UI refresh = mirror) và các hạng 85% (thiếu test UI, sample cross-check n=8, CRLF `data:check` trên Windows). Repo còn ~54 file shadcn không có đường vào — không vào mẫu số.

---

## D. Orphan / thừa / import chết / dep chết

| Loại | Vị trí | Bằng chứng grep | Khuyến nghị |
|---|---|---|---|
| DEAD_DEP | `date-fns` | 0 import trong `*.ts/tsx/js/mjs`; chỉ package.json + lock | Xóa khỏi dependencies |
| DEAD_DEP | `zod` | 0 `from 'zod'` | Xóa |
| DEAD_DEP | `@hookform/resolvers` | 0 import | Xóa |
| DEAD_DEP (dev) | `tw-animate-css` | 0 `@import` trong CSS; `globals.css` chỉ `@import tailwindcss` | Xóa hoặc import |
| ORPHAN file | `app/chatgpt-auth.ts` | `getChatGPTUser` / `requireChatGPTUser`: chỉ tự file | Xóa hoặc nối layout |
| ORPHAN export | `lib/analytics.ts` → `parseDraws` | Chỉ `analytics.test.ts`; app dùng `parseDrawsJsonl` | Xóa sau khi chuyển test |
| ORPHAN export | `browser-cache.ts` → `clearCache` | Định nghĩa, 0 caller | Nối nút xóa cache hoặc xóa export |
| ORPHAN | `classifyEvidence` + `ProtocolLock` | Chỉ `protocol.test.ts`; không `research:lock` | Giữ + thêm script lock, hoặc chấp nhận 40% |
| ORPHAN kit | `components/ui/*` trừ 7 file | Product chỉ import: button, badge, tabs, table, select, slider, input | 54 file scaffold; không phải tính năng lab |
| ORPHAN | `hooks/use-mobile.ts`, `db/*`, `examples/d1/*`, `vendor/shadcn-tailwind-4.13.0.css` | use-mobile chỉ sidebar; getDb chỉ examples/d1; vendor 0 import | Xóa hoặc tách starter |
| SURPLUS | `app/page.tsx` `dataRangeLabel` “Vietlott-data” | Copy cứng; DataStatus đọc `manifest.source.primary` | Đổi copy theo manifest |
| KIT_ONLY_DEP | cmdk, vaul, recharts, sonner, next-themes, embla-carousel-react, input-otp, react-day-picker, react-hook-form, react-resizable-panels, @base-ui/react, @shadcn/react | Chỉ import từ `components/ui` không có đường vào product | Xóa cùng kit nếu dọn scaffold |
| SURPLUS script | `db:generate` | `db/schema.ts` = `export {}` | Xóa script hoặc thêm bảng thật |

**Không gọi SUPPORT là thừa:** `http.ts` allowlist, persistence atomic, hash, schema reject-có-lý-do, `mega645.secureRandomInt` (dùng trong `generateQuickPick`) là SUPPORT 100.

**UI kit còn sống (7):** `button`, `badge`, `tabs`, `table`, `select`, `slider`, `input`.

### Phụ lục deps

| Package | Loại | Hit |
|---|---|---|
| next, react, react-dom | USED | `app/layout`, `app/page` |
| lucide-react | USED | page, labs, data-status |
| clsx, tailwind-merge, class-variance-authority, radix-ui | USED | `lib/utils` + ui (kit lẫn 7 file sống) |
| date-fns, zod, @hookform/resolvers | DEAD_DEP | 0 import |
| drizzle-orm | ORPHAN | `db/index` + `examples/d1` |
| KIT_ONLY list §D | KIT_ONLY | chỉ file ui chết |

**TOOL_DEP:** typescript, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx, vinext, vite, wrangler, @cloudflare/*, @types/*, @vitejs/*, react-server-dom-webpack, drizzle-kit.

Lượt eslint `no-unused-vars` trên file lab (2026-09-12) ra 15 error — nhiễu parser (tham số kiểu TS), không phải dead-import mới.

---

## E. Claim-only (docs không có symbol)

| Claim | Nơi viết | Code thực tế |
|---|---|---|
| Mirror never fetched during sync | ADR-001 | Sai với `lib/data/refresh.ts:112` |
| Full §15 8-module extract | `research-core-upgrade-final.md` M.1 | Không có `strategies.ts` / `walk-forward.ts` |
| Family-aware Holm | final report M.2 | `familyId` metadata only |
| Persisted protocol lock | final report M.4 | Không có file lock / npm script |
| `research:controls` sized FPR | final report N | Không có script |

---

## F. Checklist

- [x] Mọi npm script đã có hàng
- [x] dependencies + devDependencies đã USED / TOOL / DEAD / KIT_ONLY
- [x] Export public `lib/` đã gắn SHIPPED \| SUPPORT \| RESEARCH \| ORPHAN (type-only không liệt từng type)
- [x] Mọi tab/nút chính `page` + 3 lab components đã map F-xx
- [x] Mọi thư mục lib \| scripts \| components có hàng module (kit gộp 54 file)
- [x] ORPHAN / SURPLUS / DEAD_DEP có path
- [ ] DEAD_IMPORT từng named-import trong 54 file kit — không quét từng dòng (không có đường vào product)
- [x] Mọi % có điều kiện trên; F-14/F-31 ≤ 70 vì mâu thuẫn nguồn
