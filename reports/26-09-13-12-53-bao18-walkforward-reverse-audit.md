# Bao-18 Reverse-Proof Walk-Forward Adversarial Audit

**Generated:** 2026-09-13T05:53:59.087Z
**Scientific grade:** C — NO DEMONSTRATED EDGE
**Final verdict:** `NO_EDGE`

---

## A. Executive Verdict

1. **Bao-18 có thể trúng Jackpot khi nào?** Chỉ khi 6 số thực tế của kỳ quay nằm trọn trong pool 18 số đã khóa trước kỳ đó (`R_t ⊆ P_t`) — không cần mua đủ 18.564 vé để xác định điều này, chỉ cần biết `|R_t ∩ P_t| = 6`.
2. **Protocol A (reverse peek) đạt gì?** 100.0000% hit6 trên 1471 kỳ — đúng 100% như kỳ vọng của một tautology.
3. **Vì sao A invalid?** Pool được khởi tạo TRỰC TIẾP từ 6 số thật của chính kỳ đang chấm điểm (circular oracle/look-ahead). Đây không phải một rule dự đoán — nó đọc đáp án trước khi "dự đoán".
4. **Protocol B (walk-forward hợp lệ) thực tế đạt bao nhiêu?** Xem bảng §E — mỗi rule chỉ dùng `draws[0:t]`, không bao giờ thấy `draws[t]` hay xa hơn.
5. **Có vượt theoretical/random baseline không?** Không rule nào (HOT18/COLD18/OVERDUE18/BALANCED18) vượt null lý thuyết một cách có ý nghĩa thống kê sau hiệu chỉnh Holm-Bonferroni.
6. **Statistical uncertainty lớn đến đâu?** Với p0 = 2.2792e-3 và n=1471 kỳ đánh giá, kỳ vọng null chỉ 3.353 lần hit6 — đây là một con số RẤT nhỏ, nghĩa là dataset hiện tại quá ngắn để phân biệt một lift vừa phải khỏi nhiễu ngẫu nhiên.
7. **Final classification:** `NO_EDGE`.

> Reverse-peek có thể tạo ra ảo giác chiến thắng hoàn hảo, nhưng khi kỷ luật walk-forward được áp dụng, Bao-18 chỉ mua coverage bằng ngân sách lớn hơn và chưa cho thấy predictive edge.

---

## B. Data & Provenance

| | |
|---|---|
| Git HEAD | `ede07ab5725976a29ada5d263107615f3f0a8ded` |
| Branch | `main` |
| Working tree | dirty |
| Dataset SHA-256 | `8e26f348a8b241865facc7cfe690fbc428615b9b45ffc9732709a6267039c24e` |
| Bản ghi | 1561 |
| Kỳ đầu | #00001 / 2016-07-20 |
| Kỳ cuối | #01561 / 2026-09-11 |
| Kỳ đánh giá | 1471 (t=90..1560, warmup bỏ qua=90) |
| Kỳ đánh giá đầu/cuối | #00091 / 2017-02-17 → #01561 / 2026-09-11 |
| Lookback (khóa) | 90 |
| Seed | 645 |
| Experiment spec hash | `19e4283ffbb969e7fea108bfcfb649c40f62ebedbfc6676c945eda72bba5f435` |

---

## C. Math Recap

- `C(45,6) = 8.145.060`
- Bao-18: `C(18,6) = 18.564` vé, chi phí `185.640.000 ₫`/kỳ
- `p0 = C(18,6)/C(45,6) = 2.279173e-3`
- Hypergeometric null cho K=|R_t∩P_t|: `P(K=k) = C(18,k)·C(27,6-k) / C(45,6)`, `E[K] = 6×18/45 = 2.4000000000000004`
- Exact lower-tier: `N_j(m) = C(m,j)·C(18-m,6-j)` — chứng minh khớp brute-force 18.564 vé trong `bao18-walkforward.test.ts` (§29)

---

## D. Protocol A — INVALID Reverse Peek

| Kỳ đánh giá | Hit6 | Rate |
|---|---|---|
| 1471 | 1471 | 100.0000% |

## **`INVALID_AS_EVIDENCE_OF_EDGE`**

Pool = {6 số thật của kỳ t} ∪ {12 số ngẫu nhiên từ phần bù}. Vì 6 số thật luôn nằm trong pool, `R_t ⊆ P_t` luôn đúng — đây là tautology, không phải dự đoán. Không metric nào từ Protocol A được dùng để hỗ trợ bất kỳ claim edge nào.

---

## E. Protocol B — Walk-Forward

| Rule | n | Hit6 | Rate | E[null hits] | Raw p | Holm p | Mean K | ≥4 | ≥5 |
|---|---|---|---|---|---|---|---|---|---|
| RANDOM18 | 1471 | 4 | 0.2719% | 3.353 | 4.314e-1 | — | 2.3889 | 16.0435% | 2.7192% |
| HOT18 | 1471 | 1 | 0.0680% | 3.353 | 9.651e-1 | 1.000e+0 | 2.4038 | 15.1598% | 2.3793% |
| COLD18 | 1471 | 4 | 0.2719% | 3.353 | 4.314e-1 | 1.000e+0 | 2.3943 | 15.4997% | 3.2631% |
| OVERDUE18 | 1471 | 2 | 0.1360% | 3.353 | 8.480e-1 | 1.000e+0 | 2.3657 | 15.0918% | 2.7872% |
| BALANCED18 | 1471 | 3 | 0.2039% | 3.353 | 6.513e-1 | 1.000e+0 | 2.4024 | 14.6839% | 2.5153% |

Holm-Bonferroni family = {HOT18, COLD18, OVERDUE18, BALANCED18} (size 4); RANDOM18 là baseline thực nghiệm, không phải hypothesis chịu Holm. Alpha = 0.05.

**Verdict theo rule:**
- **HOT18**: `NO_EDGE` (Holm-adjusted p-value không <= alpha (hoặc không được tính do family rỗng); hướng effect đảo dấu giữa EARLY và LATE — không ổn định theo thời gian)
- **COLD18**: `NO_EDGE` (Holm-adjusted p-value không <= alpha (hoặc không được tính do family rỗng); hướng effect đảo dấu giữa EARLY và LATE — không ổn định theo thời gian)
- **OVERDUE18**: `NO_EDGE` (không có lift dương so với null lý thuyết; Holm-adjusted p-value không <= alpha (hoặc không được tính do family rỗng))
- **BALANCED18**: `NO_EDGE` (Holm-adjusted p-value không <= alpha (hoặc không được tính do family rỗng); hướng effect đảo dấu giữa EARLY và LATE — không ổn định theo thời gian)

---

## F. Distribution Analysis

Observed K=0…6 (đếm số kỳ) so với null lý thuyết hypergeometric (kỳ vọng số kỳ = pmf × n=1471):

| K | P(K) hypergeometric | E[count] null | RANDOM18 | HOT18 | COLD18 | OVERDUE18 | BALANCED18 |
|---|---|---|---|---|---|---|---|
| 0 | 0.036342 | 53.46 | 43 | 51 | 43 | 55 | 47 |
| 1 | 0.178408 | 262.44 | 286 | 264 | 259 | 254 | 244 |
| 2 | 0.329666 | 484.94 | 478 | 455 | 524 | 525 | 506 |
| 3 | 0.293037 | 431.06 | 428 | 478 | 417 | 415 | 458 |
| 4 | 0.131866 | 193.98 | 196 | 188 | 180 | 181 | 179 |
| 5 | 0.028402 | 41.78 | 36 | 34 | 44 | 39 | 34 |
| 6 | 0.002279 | 3.35 | 4 | 1 | 4 | 2 | 3 |

RANDOM18 đóng vai trò kiểm tra thực nghiệm rằng công thức hypergeometric closed-form thực sự khớp hành vi của một pool không phụ thuộc lịch sử.

---

## G. RANDOM18 Paired Comparison

Mỗi kỳ đánh giá được chấm điểm bởi cả rule và RANDOM18 (paired), nên so sánh trực tiếp ΔK = K_rule − K_random hợp lệ hơn so sánh hai baseline độc lập.

| Rule | Mean ΔK | CI95 (sign-flip) | 2-sided p | Both hit | Both miss | Rule hit/Random miss | Rule miss/Random hit | McNemar |
|---|---|---|---|---|---|---|---|---|
| HOT18 | 0.0150 | [-0.0802, 0.0829] | 0.7252 | 0 | 1466 | 1 | 4 | INSUFFICIENT_DISCORDANT_EVENTS |
| COLD18 | 0.0054 | [-0.0802, 0.0789] | 0.9085 | 0 | 1463 | 4 | 4 | p=1.000e+0 (n=8) |
| OVERDUE18 | -0.0231 | [-0.0802, 0.0816] | 0.5876 | 0 | 1465 | 2 | 4 | p=6.875e-1 (n=6) |
| BALANCED18 | 0.0136 | [-0.0802, 0.0802] | 0.7508 | 0 | 1464 | 3 | 4 | p=1.000e+0 (n=7) |

CI/p-value từ deterministic seeded sign-flip permutation (10,000 lần lặp, seed cố định theo rule — không dùng `Math.random`). McNemar exact chỉ tính khi số sự kiện discordant ≥ 6; dưới ngưỡng đó được ghi `INSUFFICIENT_DISCORDANT_EVENTS` thay vì ép ra một p-value không đáng tin.

---

## H. Time Stability

| Rule | EARLY n | EARLY mean K | EARLY hit6 | EARLY rate | EARLY fixed payout | LATE n | LATE mean K | LATE hit6 | LATE rate | LATE fixed payout |
|---|---|---|---|---|---|---|---|---|---|---|
| RANDOM18 | 735 | 2.3918 | 3 | 0.4082% | 19.006.050.000 ₫ | 736 | 2.3859 | 1 | 0.1359% | 17.325.030.000 ₫ |
| HOT18 | 735 | 2.4299 | 1 | 0.1361% | 16.683.740.000 ₫ | 736 | 2.3777 | 0 | 0.0000% | 15.649.400.000 ₫ |
| COLD18 | 735 | 2.3619 | 1 | 0.1361% | 16.173.230.000 ₫ | 736 | 2.4266 | 3 | 0.4076% | 21.534.420.000 ₫ |
| OVERDUE18 | 735 | 2.3510 | 1 | 0.1361% | 15.690.280.000 ₫ | 736 | 2.3804 | 1 | 0.1359% | 18.099.050.000 ₫ |
| BALANCED18 | 735 | 2.4531 | 2 | 0.2721% | 18.468.570.000 ₫ | 736 | 2.3519 | 1 | 0.1359% | 15.250.750.000 ₫ |

Một rule chỉ được coi là "đáng chú ý hơn" khi hướng effect không đảo mạnh giữa EARLY và LATE — ổn định theo thời gian không thay thế significance, chỉ là điều kiện cần thêm.

---

## I. Economic Reality

- Full Bao-18: **18.564 vé/kỳ**, **185.640.000 ₫/kỳ**
- Tổng chi phí giả định cho 1471 kỳ đánh giá: **273.076.440.000 ₫**
- Giải cố định (loại trừ Jackpot) là khoản mục duy nhất được cộng vào EV — Jackpot value = UNKNOWN/VARIABLE, không trộn vào.
- Đồng nhất thức chi phí kỳ vọng/mỗi Jackpot dưới null không-edge: `Expected cost per jackpot = C(18,6)×ticketPrice / (C(18,6)/C(45,6)) = C(45,6)×ticketPrice = 81.450.600.000 ₫` — con số này KHÔNG phụ thuộc pool size, đúng cho mọi Bao-n dưới giả định fair draw.
- Một portfolio 18.564 vé DISTINCT chọn ngẫu nhiên từ toàn bộ C(45,6) (không lặp vé) cũng có union jackpot probability đúng bằng `18,564/8,145,060 = 2.279173e-3` — **giống hệt** Bao-18. Bao-18 không tạo xác suất "miễn phí"; nó mua một phần lớn hơn của outcome space bằng một phần ngân sách lớn hơn tương ứng. Khác biệt thực sự nằm ở cấu trúc coverage của các bậc giải thấp hơn (giải Ba/Nhì/Nhất), không phải ở xác suất Jackpot.
- Không dùng module portfolio 30-vé (projective, capped) để giả vờ so sánh trực tiếp với ngân sách 18.564 vé — hai thang ngân sách khác nhau hoàn toàn (§22).

Chi tiết per-rule (gross fixed-prize payout, tổng chi phí giả định, net, cost-per-observed-hit6): xem bảng §E và JSON artifact.

---

## J. Why Reverse Peek Feels Convincing

- **Look-ahead bias**: dùng thông tin chỉ tồn tại SAU thời điểm cần dự đoán.
- **Tautology**: câu hỏi ("số nào sẽ trúng") và câu trả lời ("chính 6 số đó") là một, không có suy luận thực sự.
- **Circular validation**: đo hiệu năng của một hệ thống bằng chính dữ liệu nó vừa dùng để xây pool.
- **Target leakage**: kết quả tương lai rò rỉ vào input của builder — triệu chứng kinh điển của một pipeline ML bị lỗi.
- **Cherry-picking / survivorship**: nếu chỉ nhìn các kỳ "đẹp" hoặc chỉ nhìn Protocol A mà quên đối chiếu Protocol B, dễ ngộ nhận "hệ thống hoạt động".

Protocol A tồn tại chính xác để minh họa mức độ khủng khiếp của leakage: một tautology vô nghĩa vẫn có thể trông "100% chính xác".

---

## K. Anti-Leak Evidence

5 anti-leak test bắt buộc (§13) đều PASS — chạy trực tiếp trên harness này (không phải trên dữ liệu giả định):

1. **Protocol A sanity** — 100% hit6 trên toàn bộ kỳ đánh giá thật.
2. **Target mutation** — đổi `draws[t].result`, pool tại t (mọi rule) không đổi.
3. **Future suffix mutation** — xáo trộn toàn bộ `draws[t...]`, pool tại t không đổi.
4. **Replay-prefix invariance** — truncate dataset tại t+1, pool tại t giống hệt full dataset.
5. **Determinism** — cùng input luôn cho cùng pool.

Cộng thêm: proof-by-test cho công thức closed-form `N_j(m)` khớp chính xác brute-force enumerate toàn bộ 18.564 vé (§29). Chạy: `node --import=tsx --test lib/research/bao18-walkforward.test.ts`.

---

## L. Statistical Power & Limitations

- Kỳ vọng số lần hit6 dưới null lý thuyết trên 1471 kỳ: **3.3527**.
- P(quan sát đúng 0 hit6 | null đúng) = **0.0349**.
- 95% predictive interval cho số lần hit6 dưới null: **[0, 7]**.
- Kỳ vọng null nhỏ hơn 5 — dataset hiện tại (chỉ 1 draw/kỳ, ~1471 kỳ đánh giá) có thể quá ngắn để phân biệt một lift vừa phải khỏi nhiễu thống kê của biến cố hiếm. Một rate quan sát cao hơn null không tự động là bằng chứng đủ mạnh.
- Đây là dữ liệu **hồi cứu** (retrospective) — Protocol B walk-forward loại được look-ahead trong CÁCH XÂY POOL, nhưng KHÔNG chứng minh rule chưa từng được ai nhìn thấy trước khi các kỳ này xảy ra. Retrospective significance ≠ live predictive edge.
- Giá trị Jackpot thực tế thay đổi theo doanh số bán vé và số người trúng chia sẻ — không giả định cố định; EV ở đây chỉ tính giải cố định.
- Giả định luật chia thưởng/tax hiện tại của Vietlott không thay đổi trong giai đoạn dữ liệu.

---

## M. Reproduction Commands

```bash
npm run typecheck
node --import=tsx --test lib/research/bao18-walkforward.test.ts
npm run research:bao18-audit
```

---

## Final Scientific Interpretation

Protocol A đạt 100% (tautology, INVALID). Protocol B, dưới kỷ luật walk-forward nghiêm ngặt, không cho rule nào vượt null lý thuyết một cách có ý nghĩa thống kê sau hiệu chỉnh multiple-testing. Kết luận chính: reverse-peek có thể tạo ra ảo giác chiến thắng hoàn hảo, nhưng khi kỷ luật walk-forward được áp dụng, Bao-18 chỉ mua coverage bằng ngân sách lớn hơn và chưa cho thấy predictive edge. Grade C — NO DEMONSTRATED EDGE giữ nguyên.
