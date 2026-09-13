# Mega 6/45 Research Lab

Phòng thí nghiệm thống kê độc lập cho xổ số Mega 6/45: kiểm định xem có cách chọn số nào tạo lợi thế ổn định so với chọn ngẫu nhiên hay không, bằng walk-forward backtest, hiệu chỉnh đa kiểm định, bộ đối chứng âm, và một chuỗi provenance (protocol → registry → artifact → prospective ledger) được thiết kế để không thể tự mâu thuẫn trong im lặng.

> **Đây không phải công cụ dự đoán, không phải website Vietlott, không bán vé và không khuyến nghị mua.** Nếu quay số là ngẫu nhiên và công bằng, mọi bộ 6 số hợp lệ có cùng xác suất trúng Jackpot bất kể chiến lược chọn số nào. Coi đây là công cụ học thống kê, mô phỏng và quản trị ngân sách.

## Trạng thái khoa học hiện tại

**Grade: C — NO DEMONSTRATED EDGE.** Không chiến lược nào (kể cả các phương án nâng cao như Bao-18 reverse-proof) cho thấy lợi thế dự đoán được xác nhận trên dữ liệu chưa dùng để chọn chiến lược. Đây là kết quả phù hợp với một trò chơi quay độc lập và công bằng, không phải một hạn chế kỹ thuật của ứng dụng.

- **Xác suất trúng Jackpot mỗi vé:** không đổi — luôn `1/8.145.060`, bất kể số nóng/lạnh/lâu chưa ra hay bất kỳ thuật toán nào.
- **Độ phủ danh mục (portfolio):** đã chứng minh bằng tổ hợp học chính xác — mua nhiều vé không lặp làm tăng số tổ hợp được phủ, không làm tăng xác suất từng vé.
- **Bằng chứng prospective (dữ liệu thật sự chưa từng thấy tại thời điểm khoá protocol):** hiện **PENDING** — 4 dự đoán đã đóng băng cho kỳ `#01562`, 0 kỳ đã có kết quả thật (kỳ đó chưa xảy ra).
- **Khuyến nghị chiến lược hiện tại:** không có — không phương án nào được hệ thống ủng hộ.

Trạng thái này được hiển thị ngay đầu tab "Nghiên cứu" trên giao diện (panel "Tóm tắt cho người mới bắt đầu"), trước mọi thuật ngữ nâng cao (HAC, Holm-Bonferroni, protocol hash...).

## Kiến trúc tổng quan

- **Next.js 16 + Vinext**, React 19, TypeScript 5, Tailwind CSS 4, Radix UI/shadcn.
- Triển khai trên **Cloudflare Workers** qua Wrangler. Worker **không có filesystem ghi được và không gắn D1/R2/KV** (ngoại trừ một cache lịch sự ngắn hạn cho request upstream) — đây là một lựa chọn kiến trúc tường minh, xem `docs/adr/ADR-005-persistence-local-vs-durable.md`.
- **Không có database phía server.** Dữ liệu tồn tại ở đúng 3 nơi: (1) snapshot tĩnh đóng gói cùng build (`public/data/power645.jsonl`), (2) IndexedDB trên thiết bị người dùng, (3) các file JSONL/JSON append-only dưới `reports/` do CLI ghi (registry thử nghiệm, prospective ledger, protocol lock/history) — không phải state runtime của Worker.
- **GitHub Actions CI** (`.github/workflows/ci.yml`): typecheck → lint → test (bao gồm test-discovery) → data:check → verify-provenance → build → Playwright E2E (Chromium desktop + mobile viewport), đúng thứ tự chạy local.

## Bốn lớp bằng chứng khoa học trong UI

Tab **Nghiên cứu** trình bày theo thứ tự từ dễ đến khó, đúng tinh thần "người mới hiểu kết luận trước, chuyên gia đào sâu bằng chứng sau":

1. **Tóm tắt cho người mới bắt đầu** (`components/scientific-verdict.tsx`) — trạng thái khoa học, xác suất mỗi vé, số dự đoán prospective đang chờ/đã chấm điểm, có link nhảy thẳng tới Capability Inspector.
2. **Trạng thái bộ dữ liệu** (`components/data-status.tsx`) — nguồn dữ liệu, hash, protocol hash hiện hành, family size/look count, đối chiếu chéo, và nhãn độ tươi **Fresh / Delayed / Stale / Unknown** (không bao giờ coi dữ liệu cũ như đang cập nhật).
3. **Thống kê mô tả + walk-forward + holdout** — tần suất, backtest 4 chiến lược (RANDOM/HOT/COLD/BALANCED), development/validation/test chia theo thời gian, Holm-Bonferroni.
4. **Sổ điểm thực nghiệm** (`components/experiment-scorecard.tsx`) — protocol lock, family registry, tóm tắt 5 bộ đối chứng âm A/B/C/E/F, bảng dự đoán prospective (PENDING/SCORED) kèm **trạng thái chuỗi hash** của ledger (số sự kiện đã hash-chain, số sự kiện LEGACY_UNCHAINED, kết quả xác minh).
5. **Bao-18 Reverse Proof** (`components/bao18-panel.tsx`) — xem mục riêng bên dưới.
6. **Tra cứu dữ liệu** (`components/data-explorer.tsx`) — tìm kỳ quay theo mã hoặc khoảng ngày, lọc hoàn toàn phía client trên dữ liệu đã tải.
7. **Ablation & Portfolio Monte Carlo** (`components/diagnostics-panel.tsx`) — số liệu thật, đọc từ `public/data/{ablation,portfolio-mc}-summary.json`, khung rõ ràng "chẩn đoán, không phải lợi thế dự đoán".
8. **Capability Inspector** (`components/capability-inspector.tsx`, neo `#capability-inspector`) — bản đồ đầy đủ mọi năng lực trong hệ thống kèm trạng thái trung thực (`END_TO_END` / `READ_ONLY` / `OPERATOR_GATED` / `STUB_NOT_PROMOTED`), kể cả các phần chỉ chạy qua CLI, để không có gì "vô hình" chỉ vì chưa có nút bấm.

Tab **Portfolio 4+** cho danh mục vé chồng lặp kiểm soát, coverage chính xác (exact Random vs Projective benchmark là bảng so sánh chính), stepper 1–30 vé (mặc định 10), cost-frontier Bao-n. Tab **Vé mô phỏng** sinh vé bằng Web Crypto, chấm điểm độc lập — luôn gắn nhãn mô phỏng.

Các panel artifact tùy chọn trên tab Nghiên cứu được bọc `PanelErrorBoundary` (`components/panel-error-boundary.tsx`) để một artifact hỏng không làm trắng toàn bộ app.

## Các module nghiên cứu chính và trạng thái UI

| Module | Nguồn | Trạng thái UI |
|---|---|---|
| Protocol lock/history | `lib/research/protocol.ts` | END_TO_END |
| Experiment registry (id ràng buộc protocolHash) | `lib/research/experiments.ts`, `scripts/run-experiment.ts` | READ_ONLY |
| Provenance verifier (chuỗi registry↔protocol↔artifact) | `lib/research/provenance-registry.ts`, `scripts/verify-provenance.ts` | OPERATOR_GATED (CLI/CI) |
| Prospective freeze/append + hash chain | `lib/research/prospective.ts`, `scripts/research-prospective.ts` | Mutation: OPERATOR_GATED (cố ý, chống peek) — trạng thái chuỗi: READ_ONLY trong UI |
| Negative controls A/B/C/E/F | `lib/research/negative-controls.ts`, `controls-summary.ts` | READ_ONLY |
| Ablation harness | `lib/research/ablation.ts` → `research:ablation-summary` | READ_ONLY (số liệu thật trong Diagnostics panel) |
| Portfolio Monte Carlo | `lib/research/portfolio-mc.ts` → `research:portfolio-mc-summary` | READ_ONLY (số liệu thật trong Diagnostics panel) |
| Bao-18 reverse-proof walk-forward | `lib/research/bao18-walkforward.ts` → `research:bao18-summary` | READ_ONLY |
| Ranking Score scaffold | `lib/research/ranking-score.ts` | STUB_NOT_PROMOTED — **không phải bộ dự đoán AI**, chưa qua promotion gate, bị cấm import trong `app/`/`components/` (enforced bởi `app/ui-ranking-score-ban.contract.test.ts`) |
| Exact Random vs Projective benchmark | `lib/research/exact-benchmark.ts` | END_TO_END (Portfolio tab) |
| Data Explorer | `lib/data/explorer.ts` | END_TO_END |
| Bao-N cost frontier | `lib/research/bao.ts` | END_TO_END |
| Health / readiness | `app/api/health`, `app/api/readiness` | END_TO_END |
| CSP / security headers | `lib/security/headers.ts`, `public/_headers` | END_TO_END (Assets + API) |

## Bao-18 Reverse Proof — "liệu một pool 18 số dựng từ lịch sử có thắng được null hay không"

Kiểm định đối nghịch cố ý, dùng đúng công thức tổ hợp chính xác (`C(18,6)=18.564` vé, không bao giờ enumerate thật trong đường chạy chính):

- **Protocol A — Reverse Peek:** pool được dựng TRỰC TIẾP từ 6 số thật của chính kỳ đang chấm điểm → luôn đạt 100% (tautology). Nhãn bắt buộc: **`INVALID_AS_EVIDENCE_OF_EDGE`**.
- **Protocol B — Walk-forward hợp lệ:** pool chỉ dùng `draws[0:t]`, 5 rule (RANDOM18/HOT18/COLD18/OVERDUE18/BALANCED18), kiểm định nhị thức chính xác + Clopper-Pearson CI + Holm-Bonferroni, kèm bảng ổn định EARLY/LATE và cảnh báo biến cố hiếm (kỳ vọng hit6 dưới null rất nhỏ trên dữ liệu hiện có).
- Mỗi artifact mang `scientificSpecHash` (chỉ hash các input khoa học: dataset, lookback, seed, rule family, endpoint, mô hình null) tách biệt khỏi `buildProvenance` (git commit, thời điểm chạy) — đổi commit không làm đổi định danh khoa học.
- CLI **fail-closed theo bằng chứng thật**: `scripts/audit-bao18-walkforward.ts` tự chạy bộ test anti-leak của chính nó trước khi ghi artifact; test fail thì không ghi gì cả.

Thông điệp bắt buộc, không được diễn giải khác đi: **"Reverse-peek có thể trông hoàn hảo vì nó rò rỉ đáp án. Walk-forward hợp lệ hiện chưa cho thấy edge dự đoán nào được chứng minh."**

## Chuỗi provenance (protocol → registry → artifact → prospective)

- `reports/protocol-lock.json` + `reports/protocol-history.json` — mọi hash protocol từng được khoá đều có dấu vết, kể cả khi phát hiện muộn (xem ghi chú lịch sử trong `reports/provenance-exceptions.json`).
- `reports/experiments/registry.jsonl` — append-only; id thử nghiệm mới ràng buộc cả `datasetHash` lẫn `protocolHash` (không chỉ version string) để hai protocol khác hash không thể va chạm định danh dưới cùng một version label.
- `reports/experiments/*.json` — artifact bất biến; script đăng ký **từ chối ghi đè** artifact đã tồn tại.
- `reports/prospective-scorecard.jsonl` — sự kiện FROZEN/SCORED nối chuỗi hash (append-only thật sự, không sửa dòng cũ khi chấm điểm); dòng cũ trước khi có chuỗi hash được nhận diện trung thực là `LEGACY_UNCHAINED`, không bị coi như đã luôn được chain.
- `npm run research:verify-provenance` — chạy độc lập, đọc-only, xác minh toàn bộ chuỗi trên và chạy trong CI.

## Cơ sở toán học

Mega 6/45 chọn 6 số khác nhau từ 1 đến 45. Tổng số bộ số có thể có:

$$\binom{45}{6} = 8.145.060$$

Xác suất trùng đúng $k$ số với một vé cố định:

$$P(X=k)=\frac{\binom{6}{k}\binom{39}{6-k}}{\binom{45}{6}}$$

Danh mục 1–30 vé dùng **mặt phẳng xạ ảnh hữu hạn cấp 5** (31 khối, mỗi khối 6 điểm, hai khối bất kỳ giao đúng 1 điểm) để mỗi cặp vé dùng chung không quá một số. Thiết kế này cải thiện **độ phủ tổ hợp**, không thay đổi xác suất hay kỳ vọng của từng bộ số.

Bao-n (mua trọn `C(n,6)` vé từ một pool n số) cho `P(Jackpot) = C(n,6)/C(45,6)` chính xác — không cần enumerate. Một danh mục ngẫu nhiên cùng ngân sách (cùng số vé, không lặp) có union-probability jackpot **giống hệt** Bao-n; khác biệt thực sự nằm ở cấu trúc coverage các giải thấp hơn, không phải ở xác suất Jackpot.

## Dữ liệu

Snapshot đi kèm tại `public/data/power645.jsonl`:

| Thuộc tính | Giá trị |
|---|---:|
| Sản phẩm | Mega 6/45 |
| Khoảng thời gian | 20/07/2016 (#00001) – hiện tại theo lần sync gần nhất |
| Định dạng | JSON Lines, canonical |
| Tính liên tục | 0 kỳ thiếu, 0 trùng lặp (`lib/data/continuity.ts`) |

Nguồn chính: **vietlott.vn** (crawl trực tiếp trang kết quả chính thức — `docs/adr/ADR-001-official-vietlott-source.md`). Mirror [vietvudanh/vietlott-data](https://github.com/vietvudanh/vietlott-data) (MIT) chỉ dùng đối chiếu chéo (`npm run data:cross-check`), không bao giờ ghi đè nguồn chính. Host được giới hạn bằng allowlist (`lib/data/http.ts`: `vietlott.vn`, `raw.githubusercontent.com`) chống SSRF. Chi tiết trong `public/data/SOURCE.md`.

### Cập nhật, cache, xung đột

- `data:sync` chuẩn hoá → xác thực → gộp → **chỉ ghi khi mọi kiểm tra đạt**, ghi atomic (file tạm + rename). Chạy lại với cùng nguồn cho `added=0`, hash không đổi.
- Xung đột (cùng mã kỳ, khác kết quả) **không bao giờ bị ghi đè im lặng** — sync thất bại, exit code khác 0, liệt kê xung đột.
- Trên trình duyệt: bản cập nhật lưu **IndexedDB trên thiết bị đó**, không gửi lên server (Worker không có nơi để giữ). App khởi động ngay bằng dữ liệu bundled/cache, cập nhật ngầm nếu đã quá TTL (`DATA_REFRESH_TTL_MS` = 12 giờ, `lib/data/refresh.ts`), không chặn UI chờ mạng. `POST /api/data/refresh` có validate kích thước, chặn `force` từ public API, soft rate-limit **single-isolate** (`lib/data/rate-limit.ts` — response header `X-RateLimit-Scope: single-isolate`; **không** phải rate-limit phân tán), kèm client single-flight + official-fetch cache 12h. Độ tươi hiển thị Fresh/Delayed/Stale/Unknown (`lib/data/freshness.ts`).
- Bảo mật response: CSP baseline + `X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` / `Permissions-Policy` từ `lib/security/headers.ts`, ghi vào `public/_headers` (Cloudflare Assets) và gắn trên `/api/health`, `/api/readiness`, `/api/data/refresh`.
- Runbook vận hành: `docs/production-runbook.md` (deploy/rollback local-smoke được; live Cloudflare drill còn operator-gated).
- `npm run data:schedule` chạy đồng bộ định kỳ khi không mở UI (Task Scheduler/cron).

## Cài đặt và chạy local

Yêu cầu Node.js `>=22.13.0`, npm, Git.

```bash
git clone <duong-dan-repo>
cd 260909-AI-Research-Lab
npm run install:ci
npm run data:sync   # tuỳ chọn: lấy các kỳ mới hơn snapshot kèm theo
npm run dev
```

## Các lệnh chính

```bash
# Dữ liệu
npm run data:sync            # đồng bộ từ vietlott.vn (thêm -- --force để tải lại toàn bộ)
npm run data:check           # kiểm tra toàn vẹn snapshot + manifest, offline
npm run data:status          # trạng thái dữ liệu hiện tại
npm run data:cross-check     # đối chiếu chéo với mirror, chỉ ghi vào manifest
npm run data:schedule        # sync định kỳ khi không mở UI

# Nghiên cứu
npm run research:lock                    # khoá protocol hiện hành + ghi lịch sử hash
npm run research:experiment              # đăng ký + hoàn thành thử nghiệm (append-only)
npm run research:controls                # chạy 5 bộ đối chứng âm A/B/C/E/F
npm run research:ablation                # ablation harness (độ nhạy family size Holm)
npm run research:ablation-summary        # xuất public/data/ablation-summary.json
npm run research:portfolio-mc            # Monte Carlo cùng ngân sách
npm run research:portfolio-mc-summary    # xuất public/data/portfolio-mc-summary.json
npm run research:bao18-audit             # kiểm định Bao-18 reverse-proof, ghi report + JSON
npm run research:bao18-summary           # xuất public/data/bao18-summary.json cho UI
npm run research:prospective-freeze      # đóng băng dự đoán cho kỳ tiếp theo (chống peek)
npm run research:prospective-append      # ghi kết quả thật cho các dự đoán đã đến hạn
npm run research:prospective-summary     # xuất public/data/prospective-summary.json
npm run research:verify-provenance       # xác minh toàn bộ chuỗi provenance, chạy trong CI

# Kiểm thử / build
npm test                     # typecheck + test:discovery + test:business + data:test
npm run test:discovery       # đối chiếu mọi *.test.ts trên đĩa với danh sách chạy — chặn mồ côi/ảo
npm run e2e:ci               # Playwright E2E (cũng chạy trong CI sau build)
npm run lint
npm run build                # vinext build + ghi CSP vào dist/client/_headers
npm run headers:write        # regenerate public/_headers từ lib/security/headers.ts
```

Các lệnh gọi mạng thật hoặc ghi dữ liệu thật (`data:sync`, `data:verify-live`, `data:cross-check`, `research:experiment`, `research:*-freeze/append`) **không** nằm trong `npm test` — bộ test mặc định chạy offline, tất định.

## Kiểm thử

Hiện có bộ test tất định trải trên các file được `npm run test:discovery` đối chiếu tự động với danh sách khai báo trong `package.json` — một file test tồn tại trên đĩa mà không được liệt kê (mồ côi) hoặc được liệt kê mà không tồn tại (ảo) đều làm gate thất bại. Playwright E2E (`e2e/`, `npm run e2e:ci`) chạy trong CI sau build.

Bao phủ: xác suất/tổ hợp, exact benchmark, xác thực vé, backtest walk-forward, null chính xác + Monte Carlo tất định, negative controls A/B/C/E/F, Bao-18 anti-leak, chuỗi hash prospective, ràng buộc định danh thử nghiệm theo protocolHash, chuẩn hoá/gộp/phát hiện xung đột dữ liệu, allowlist chống SSRF, rate-limit, freshness labels, CSP headers, error-boundary contract, và các contract test nguồn (không import `ranking-score` trong UI, tab mặc định là Nghiên cứu, không có claim quá mức trong Diagnostics/Bao-18 panel).

## Cấu trúc thư mục

```text
app/                              Trang chính, route API, contract test
components/                       Các panel: scientific-verdict, data-status,
                                   experiment-scorecard, bao18-panel,
                                   capability-inspector, diagnostics-panel,
                                   data-explorer, cost-frontier, portfolio-lab,
                                   profit-lab, panel-error-boundary, research-nav
hooks/use-draw-data.ts            Nạp dữ liệu, cache, tự cập nhật theo TTL
lib/mega645.ts                    Luật chơi, kiểm tra vé, đánh giá kết quả
lib/analytics.ts                  Thống kê, backtest walk-forward, chọn ứng viên
lib/profit.ts, lib/portfolio.ts   Xác suất/tổ hợp, danh mục vé chồng lặp kiểm soát
lib/research/                     Protocol, experiments, provenance, prospective,
                                   controls, ablation, portfolio-MC, bao/bao18,
                                   exact-benchmark, ranking-score (stub)
lib/data/                         Schema, merge, continuity, cross-check, sync,
                                   persistence, browser-cache, refresh, http,
                                   rate-limit, freshness, explorer, sources/
lib/observability/                Structured logs, readiness checks
lib/security/                     CSP + security header source of truth
docs/                             ADR-001..005 + production-runbook.md
e2e/                              Playwright browser E2E (CI)
reports/                          Registry, artifact, protocol lock/history,
                                   prospective ledger, báo cáo audit các vòng
scripts/                          CLI dữ liệu, nghiên cứu, export, verify, headers
public/data/                      Snapshot, manifest, các *-summary.json cho UI
public/_headers                   Cloudflare Assets security headers (generated)
```

## Nguyên tắc diễn giải kết quả

1. Tần suất quá khứ không làm một số "đến lượt" ở kỳ tiếp theo.
2. Backtest tốt có thể do chọn chiến lược sau khi xem dữ liệu, thử nhiều giả thuyết, hoặc may rủi — đây là lý do có Holm-Bonferroni và negative controls.
3. Chỉ những kỳ quay **sau khi protocol đã khoá** (`classifyEvidence()` trong `lib/research/protocol.ts`) mới là bằng chứng prospective thật; development/validation/test là chia hồi cứu trên dữ liệu đã có, không đảm bảo chưa từng có người nhìn thấy.
4. Bảng "thống kê mô tả toàn bộ lịch sử" tính trên mọi kỳ kể cả phần test — không được dùng để chọn chiến lược.
5. Jackpot thay đổi theo doanh số/số người trúng; thuế và chia sẻ giải phải tính riêng, không gộp vào EV giải cố định.
6. Chỉ dùng ngân sách giải trí có thể mất hoàn toàn; không vay tiền hay gấp thếp theo kết quả mô phỏng.

## Phạm vi và giấy phép

Dự án độc lập, không liên kết và không được Vietlott bảo trợ. Mã nguồn cấp phép **MIT** — xem [`LICENSE`](./LICENSE) (đồng bộ với `package.json`). Giấy phép chỉ áp dụng cho mã nguồn ứng dụng, không cấp quyền với luật chơi/cơ cấu giải/nhãn hiệu Vietlott, và không thay đổi vai trò của các nguồn dữ liệu upstream nêu ở phần "Dữ liệu".
