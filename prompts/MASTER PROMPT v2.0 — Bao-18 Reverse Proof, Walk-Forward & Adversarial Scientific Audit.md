# MASTER PROMPT v2.0
# Claude Code / Research Agent
# Bao-18 “Reverse Proof” Stress Test under Walk-Forward Discipline
# Mega 6/45 Research Lab

---

## 0. ROLE — MULTI-DISCIPLINARY AUDIT TEAM

Bạn đóng vai một nhóm hợp nhất gồm:

- Statistical Research Auditor
- Combinatorial Coverage Analyst
- Walk-Forward Experiment Designer
- Reproducibility & Provenance Auditor
- Adversarial Devil’s Advocate
- Anti-Leakage Reviewer
- Honest Reporting Officer

Nhiệm vụ kép:

1. **Cố hết sức tìm bằng chứng khiến Bao-18 trông có vẻ vượt random**, kể cả bằng những stress test bất lợi cho null hypothesis.
2. **Phá mọi bằng chứng giả**, đặc biệt các claim sinh ra từ look-ahead, circular reasoning, post-hoc selection, multiple testing, target leakage hoặc so sánh ngân sách không công bằng.

Không ưu tiên kết quả “thắng”.

Ưu tiên:

> correctness → reproducibility → anti-leakage → statistical honesty → interpretability.

---

# 1. REPOSITORY & SOURCE OF TRUTH

Repository:

`D:\2026\260909-AI-Research Lab`

Ưu tiên tái sử dụng source hiện có:

- `lib/research/bao.ts`
  - `baoTickets`
  - `baoCost`
  - `baoJackpotProbability`
  - `costCoverageFrontier`
- `lib/analytics.ts`
  - strategy logic
  - walk-forward conventions
  - temporal protocol
  - Holm correction nếu phù hợp
- `lib/research/rng.ts`
  - deterministic RNG nếu dùng được
- `lib/mega645.ts`
  - ticket price
  - fixed prizes
  - combinatorial constants
- `public/data/power645.jsonl`
- `public/data/power645.manifest.json`

Source code và canonical data là nguồn sự thật.

README/report cũ chỉ là secondary evidence.

Không commit.
Không push.
Không deploy.
Không sửa lịch sử Git.
Không ghi đè protocol lock hoặc experiment registry hiện hữu.

---

# 2. CORE RESEARCH QUESTION

Người dùng muốn kiểm tra một ý tưởng “reverse proof”:

> Nếu ta bắt đầu từ điều kiện để Bao-18 trúng Jackpot, liệu có thể xây một rule dùng lịch sử để chọn 18 số sao cho xác suất thực tế vượt đáng kể một pool 18 ngẫu nhiên?

Điều kiện Jackpot của full Bao-18:

\[
R_t \subseteq P_t
\]

trong đó:

- `R_t` = 6 số thực tế của kỳ t
- `P_t` = pool 18 số được khóa trước kỳ t

Nhiệm vụ không phải chứng minh Bao-18 chắc thắng.

Nhiệm vụ là kiểm định:

> Một rule chọn pool từ quá khứ có làm tăng xác suất `R_t ⊆ P_t` so với null fair/random hay không?

---

# 3. NON-NEGOTIABLE CLAIM POLICY

CẤM các claim:

- “Bao-18 chắc thắng”
- “Đã破解 được Mega 6/45”
- “Bao-18 đánh bại xác suất công bằng”
- “AI dự đoán được Jackpot”
- “Protocol A chứng minh có edge”
- “Retrospective significance = live predictive edge”
- “poolHit6 = Jackpot” khi không mua toàn bộ `C(18,6)` vé

Nếu retrospective Protocol B cho kết quả mạnh, chỉ được gọi:

`EXPLORATORY_RETROSPECTIVE_SIGNAL`

và phải kết thúc bằng:

`NEEDS_PROSPECTIVE_CONFIRMATION`

Không được gọi:

`PROVEN_EDGE`

trừ khi có một prospective protocol riêng đã được khóa trước dữ liệu tương lai và đủ evidence, việc đó nằm ngoài scope hiện tại.

---

# 4. MATHEMATICAL FOUNDATION — MUST APPEAR IN REPORT

Mega 6/45:

\[
C(45,6)=8,145,060
\]

Một vé:

\[
P(Jackpot)=1/8,145,060
\]

Bao-N là mua tất cả tổ hợp 6 số từ một pool N số.

Với Bao-18:

\[
C(18,6)=18,564
\]

Số vé:

`18,564`

Chi phí mỗi kỳ:

\[
18,564 \times ticketPrice
\]

Với `ticketPrice = 10,000 VND`:

`185,640,000 VND / kỳ`

Jackpot xảy ra khi và chỉ khi:

\[
R_t \subseteq P_t
\]

Với một pool 18 cố định và draw công bằng:

\[
p_0=P(JP)=\frac{C(18,6)}{C(45,6)}
\]

Không cần enumerate 18.564 vé để xác định Jackpot.

---

# 5. EXACT LOWER-TIER COMBINATORICS — REQUIRED

Nếu draw thực tế có:

\[
m=|R_t\cap P_t|
\]

số nằm trong pool 18, thì số vé full Bao-18 match chính xác `j` số là:

\[
N_j(m)=C(m,j)\times C(18-m,6-j)
\]

với điều kiện tổ hợp hợp lệ.

Phải dùng công thức này để tính chính xác:

- số vé match 3
- số vé match 4
- số vé match 5
- số vé Jackpot match 6

Không cần sinh toàn bộ 18.564 tickets.

Từ prize constants trong repo, tính:

`fixedPrizePayout(m)`

cho các tier cố định.

Jackpot payout để `UNKNOWN/VARIABLE`.

Không giả định Jackpot value cố định.

Báo cáo:

- fixed-prize gross payout
- fixed-prize net after ticket cost
- jackpot-ticket count nếu `m=6`
- không trộn jackpot variable vào fixed EV

---

# 6. PRIMARY HYPOTHESIS

Primary endpoint:

`poolHit6`

\[
poolHit6_t=1[R_t\subseteq P_t]
\]

Null:

\[
H_0:p=p_0=\frac{C(18,6)}{C(45,6)}
\]

Alternative:

\[
H_1:p>p_0
\]

Primary research question:

> Rule dựng pool 18 từ quá khứ có tạo `poolHit6` thường xuyên hơn fair-null hay không?

Secondary endpoints:

- `poolHitK = |R_t ∩ P_t|`, k = 0…6
- mean intersection count
- `P(K≥4)`
- `P(K≥5)`
- fixed-prize payout excluding Jackpot
- early-half vs late-half stability

---

# 7. THEORETICAL NULL DISTRIBUTION

Với pool 18 cố định độc lập với future draw:

\[
K=|R_t\cap P_t|
\]

theo hypergeometric:

\[
P(K=k)=
\frac{C(18,k)C(27,6-k)}
{C(45,6)}
\]

k = 0…6.

Expected intersection:

\[
E[K]=6\times \frac{18}{45}=2.4
\]

Dùng distribution này làm theoretical reference.

Không cần Monte Carlo để tính null này.

Monte Carlo chỉ được dùng như sanity check hoặc cho comparator không có closed-form.

---

# 8. PROTOCOL A — REVERSE PEEK / CIRCULAR ORACLE

## Purpose

Educational negative control.

Chứng minh rằng một phương pháp dùng target để tự xây predictor có thể tạo thành tích 100% giả.

## Procedure

Với từng kỳ đánh giá t:

1. Đọc `R_t`.
2. Khởi tạo pool với đúng 6 số `R_t`.
3. Chọn thêm 12 số từ complement `{1..45}\R_t` bằng deterministic seeded RNG.
4. Tạo pool 18.
5. Score lại trên `R_t`.

Expected:

`poolHit6 = true` cho 100% observations.

Nếu không đạt 100%:

FAIL experiment.

## Mandatory label

`INVALID_AS_EVIDENCE_OF_EDGE`

Report phải giải thích:

Protocol A là tautology/look-ahead.

Không được dùng bất kỳ metric nào từ A để hỗ trợ claim prediction.

Protocol A tồn tại để chứng minh:

> leakage có thể biến một hệ thống vô nghĩa thành “100% chính xác”.

---

# 9. PROTOCOL B — VALID WALK-FORWARD

## Core invariant

Tại target draw index `t`:

\[
H_t=draws[0:t]
\]

Pool phải được tạo chỉ từ `H_t`.

Target `draws[t].result` không được đi vào builder.

Future suffix `draws[t:]` không được đi vào builder.

Ưu tiên API dạng:

```ts
buildPool18(
  history: DrawRecord[],
  rule: Bao18Rule,
  context: {
    targetIndex: number;
    seed: number;
    lookback: number;
  }
): number[]
```

Không truyền target result vào function.

---

# 10. LOOKBACK

Resolve lookback đúng một lần trước khi chạy experiment:

1. Nếu `CURRENT_PROTOCOL.lookback` tồn tại và hợp lệ, dùng nó.
2. Nếu không, fallback `90`.

Ghi rõ giá trị cuối cùng trong artifact.

Không tune lookback trên evaluation dataset.

Không chạy 30/60/90/180 rồi chọn cái đẹp nhất trừ khi toàn bộ được khai báo thành exploratory family và correction tương ứng.

Primary run dùng duy nhất một lookback pre-specified.

---

# 11. PRE-REGISTERED RULE FAMILY

Primary rule family:

### RANDOM18

Chọn 18 số không lặp từ 1..45 bằng deterministic seeded RNG.

Seed phải chỉ phụ thuộc vào:

- global seed
- target index hoặc draw ID metadata

Không phụ thuộc `R_t`.

RANDOM18 là empirical paired baseline.

---

### HOT18

Trong last `L` draws trước t:

- frequency descending
- tie-break bắt buộc deterministic
- tie-break đề xuất: number ascending

Chọn top 18.

---

### COLD18

Trong last `L` draws:

- frequency ascending
- tie-break: number ascending

Chọn 18.

---

### OVERDUE18

Dùng gap chỉ từ history trước t:

- gap descending
- tie-break: number ascending

Chọn 18.

---

### BALANCED18

Chỉ implement nếu có thể ánh xạ hợp lý từ existing BALANCED logic trong repo mà:

- không dùng target
- không tune trên evaluation data
- rule hoàn toàn deterministic
- có thể mô tả bằng pseudocode

Nếu không thỏa:

không tự sáng tạo một Balanced rule mới để làm đẹp kết quả.

Ghi:

`BALANCED18_NOT_IMPLEMENTED_WITHOUT_PREREGISTERED_MAPPING`

---

# 12. NO POST-HOC RULE INVENTION

Sau khi nhìn Protocol B results:

CẤM:

- đổi 18 thành 17/19/20
- đổi lookback
- đổi tie-break
- thêm weight
- trộn HOT/COLD theo tỷ lệ mới
- bỏ những năm kết quả xấu
- thay seed
- chọn riêng một subgroup
- chọn strategy thắng nhất rồi gọi nó confirmatory

Nếu thử các biến thể đó:

đưa vào section riêng:

`POST_HOC_EXPLORATORY_ONLY`

và tuyệt đối không trộn vào primary conclusion.

---

# 13. ANTI-LEAK TESTS — REQUIRED

Ít nhất phải có các tests sau.

## Test 1 — Protocol A sanity

Một target bất kỳ:

`poolHit6 === true`

---

## Test 2 — Target mutation

Với Protocol B:

1. Build pool tại t.
2. Thay toàn bộ 6 số `draws[t].result`.
3. Build lại pool.
4. Pool phải identical.

Nếu khác:

FAIL.

---

## Test 3 — Future suffix mutation

1. Build pool tại t.
2. Randomize/mutate tất cả `draws[t...]`.
3. Build lại pool với history cutoff y hệt.
4. Pool phải identical.

Nếu khác:

FAIL.

---

## Test 4 — Replay-prefix invariance

Chạy full dataset.

Sau đó truncate dataset tại `t+1`.

Pool tạo cho target t phải giống hệt.

---

## Test 5 — Determinism

Cùng:

- dataset prefix
- rule
- lookback
- seed

phải tạo cùng pool.

---

# 14. EVALUATION WINDOW

Chỉ đánh giá target t khi có ít nhất `L` historical draws trước nó.

Evaluation:

```text
t = L ... draws.length - 1
```

Ghi:

- total snapshot draws
- evaluated draws
- skipped warmup draws
- first evaluated draw
- last evaluated draw

Không silently drop observations.

---

# 15. REQUIRED METRICS PER RULE

Cho mỗi rule:

- evaluated draws `n`
- `poolHit6Count`
- `poolHit6Rate`
- theoretical expected hit count `n × p0`
- lift:

\[
rate-p_0
\]

- relative risk:

\[
rate/p_0
\]

nếu định nghĩa được
- intersection histogram k=0…6
- mean intersection `K`
- median K
- hit ≥4 rate
- hit ≥5 rate
- fixed-prize payout excluding Jackpot
- total hypothetical ticket cost
- fixed-prize net excluding Jackpot
- cost per observed `poolHit6`
  - nếu 0 hit → `Infinity / no observed hit`
- early-half results
- late-half results

Không được chỉ báo hit count mà thiếu denominator.

---

# 16. RARE-EVENT STATISTICS

`poolHit6` là rare event.

Không được dùng normal z-test đơn giản nếu không kiểm tra điều kiện.

Primary statistical test:

### Exact binomial one-sided test

\[
X\sim Binomial(n,p_0)
\]

Tính:

\[
P(X\ge x_{obs}|H_0)
\]

cho từng non-random rule.

Report:

- raw p-value
- Holm-adjusted p-value
- alpha
- exact/appropriate 95% CI cho hit rate

Ưu tiên Clopper–Pearson.

Nếu implementation dependency-free quá phức tạp, Wilson interval được phép nhưng phải ghi rõ:

`WILSON_APPROXIMATION`

p-value primary vẫn nên là exact binomial tail.

---

# 17. MULTIPLE TESTING

Primary family gồm toàn bộ non-random pre-registered rules thực sự chạy:

ví dụ:

- HOT18
- COLD18
- OVERDUE18
- BALANCED18 nếu hợp lệ

RANDOM18 là baseline, không phải hypothesis cần Holm theo cùng cách.

Áp dụng Holm-Bonferroni cho primary `poolHit6`.

Không shrink family sau khi nhìn results.

Ghi:

- family size
- raw p
- adjusted p
- alpha

---

# 18. PAIRED COMPARISON VS RANDOM18

Vì mỗi rule được score trên cùng target draws, đây là paired experiment.

Ngoài theoretical null, phải báo cáo empirical comparison với RANDOM18.

Cho intersection count `K`:

\[
\Delta K_t = K_{rule,t}-K_{random,t}
\]

Report:

- mean ΔK
- paired bootstrap CI hoặc deterministic permutation CI/test nếu implement được sạch

Cho `poolHit6`:

report contingency:

- rule hit / random miss
- rule miss / random hit
- both hit
- both miss

Nếu đủ discordant events:

dùng exact McNemar hoặc exact paired test.

Nếu quá ít:

ghi:

`INSUFFICIENT_DISCORDANT_EVENTS`

Không ép ra một p-value đẹp.

---

# 19. NULL-CALIBRATION CONTEXT

Bắt buộc trả lời:

> Với n evaluated draws, fair-null vốn kỳ vọng bao nhiêu Bao-18 Jackpots?

Tính:

\[
E[X]=n p_0
\]

Report thêm:

- null expected count
- xác suất quan sát 0 hits nếu hữu ích
- 95% null predictive interval cho count nếu implement được
- nhận xét statistical power

Nếu expected hit count rất nhỏ, phải nói rõ:

> dataset có thể quá ngắn để phân biệt lift vừa phải khỏi noise.

Không diễn giải “0 vs 2 hit” bằng trực giác đơn thuần.

---

# 20. COST REALISM

Full Bao-18:

`18,564 tickets / draw`

Cost/draw:

`185,640,000 VND`

Hypothetical total spend:

\[
n\times185,640,000
\]

Nếu fair draw và pool không có predictive edge:

\[
Expected\ cost\ per\ jackpot
=
\frac{C(18,6)\times ticketPrice}
{C(18,6)/C(45,6)}
\]

suy ra:

\[
C(45,6)\times ticketPrice
\]

Report identity này.

Giải thích:

> Bao-18 không tạo free probability. Nó mua một phần lớn hơn của outcome space bằng một phần lớn hơn tương ứng của ngân sách.

Không gọi việc tăng absolute jackpot probability là “algorithmic edge”.

---

# 21. FULL BAO VS PROXY — STRICT SEPARATION

Primary experiment là:

`FULL_BAO18_POOL_SELECTION_TEST`

Không cần enumerate tickets.

Không dùng proxy cho primary endpoint.

Nếu muốn nghiên cứu subset 100/500/1000 tickets:

tạo protocol riêng:

`BUDGET_PROXY_EXPLORATORY`

Ở đó:

`poolHit6 = true`

KHÔNG đồng nghĩa đã có Jackpot.

Actual Jackpot xảy ra chỉ khi exact winning 6-combination nằm trong purchased subset.

Report hai event riêng:

- `poolContainsAll6`
- `purchasedTicketsContainExact6`

Không được trộn.

---

# 22. SAME-BUDGET COUNTERFACTUAL

Một portfolio gồm 18.564 vé DISTINCT được chọn từ toàn bộ 8.145.060 combinations cũng có Jackpot union probability:

\[
18,564/8,145,060
\]

nếu không lặp vé.

Vì vậy:

> Full Bao-18 không có Jackpot probability cao hơn một tập 18.564 unique tickets khác chỉ vì chúng cùng nằm trong một 18-number pool.

Sự khác nhau nằm ở coverage structure của lower-tier matches.

Nếu random tickets được sampled WITH replacement:

label probability riêng và không gọi đó là same unique-budget baseline.

Không dùng projective portfolio 30-ticket module để giả vờ so trực tiếp với budget 18.564 tickets.

Projective cap phải được tôn trọng.

---

# 23. PROTOCOL A VS B INTERPRETATION

Protocol A expected:

`100% poolHit6`

Protocol B expected under fair/no-edge:

approximately `p0`

Report phải đặt hai kết quả cạnh nhau.

Mục đích:

minh họa mức độ khủng khiếp của target leakage.

Ví dụ logic:

```text
Protocol A:
target → build pool → target
100%

Protocol B:
past → build pool → unseen target
≈ fair null
```

Nếu xảy ra pattern trên:

đó là bằng chứng chống circular reasoning.

---

# 24. STABILITY TEST

Split evaluation chronology thành hai nửa:

- EARLY
- LATE

Cho từng rule báo:

- n
- mean K
- hit6 count/rate
- fixed-prize payout

Một rule retrospective chỉ đáng quan tâm hơn khi:

- direction không đảo mạnh
- effect không tập trung hoàn toàn ở một đoạn ngắn

Stability không thay thế significance.

---

# 25. PROVENANCE PREFLIGHT

Trước execution, ghi:

- current Git HEAD SHA
- branch
- dirty/clean status
- dataset record count
- first draw ID/date
- latest draw ID/date
- manifest dataset SHA256
- independently recomputed dataset SHA256 nếu repo utilities cho phép
- resolved lookback
- global seed
- rule family
- ticket price

Nếu recomputed hash không khớp manifest:

STOP.

Không chạy experiment trên dataset integrity mismatch.

---

# 26. EXPERIMENT IDENTITY

Tạo một experiment spec object deterministic chứa ít nhất:

```json
{
  "experiment": "bao18-walkforward-reverse-audit",
  "version": "2.0",
  "datasetSha256": "...",
  "gitHead": "...",
  "lookback": 90,
  "seed": 645,
  "rules": ["RANDOM18", "HOT18", "COLD18", "OVERDUE18"],
  "primaryEndpoint": "poolHit6",
  "null": "C(18,6)/C(45,6)"
}
```

Canonicalize + hash object này.

Gọi là:

`experimentSpecHash`.

Artifact phải lưu hash đó.

Nếu artifact cùng experiment ID đã tồn tại nhưng content/hash khác:

FAIL.

Không overwrite.

Tạo tên mới/version mới.

---

# 27. IMPLEMENTATION

Ưu tiên tạo:

`scripts/audit-bao18-walkforward.ts`

Logic reusable nên đặt tại:

`lib/research/bao18-walkforward.ts`

Tests:

`lib/research/bao18-walkforward.test.ts`

Tránh nhồi toàn bộ logic vào CLI script.

Pure core:

- pool builders
- combinatorics
- scoring
- stats helpers

CLI:

- load snapshot
- provenance
- execute
- write artifacts

---

# 28. PERFORMANCE RULE

Không enumerate:

`18,564 × n`

tickets nếu closed-form combinatorics trả lời được cùng câu hỏi.

Đặc biệt:

- Jackpot
- exact count of match-j Bao tickets
- fixed-prize payouts

phải dùng exact formulas.

Brute force chỉ được dùng trên vài fixtures làm sanity check cho closed-form formula.

---

# 29. TEST CLOSED-FORM PAYOUT

Thêm test nhỏ:

Với một synthetic pool18 + draw:

1. enumerate 18.564 combinations một lần trong test fixture nếu runtime chấp nhận;
2. count exact match tiers;
3. so với:

\[
C(m,j)C(18-m,6-j)
\]

Phải identical.

Sau khi proof-by-test xong:

production experiment dùng formula, không enumerate.

---

# 30. OUTPUT ARTIFACTS

Tạo:

`reports/<yy-mm-dd-hh-mm>-bao18-walkforward-reverse-audit.md`

và:

`reports/<yy-mm-dd-hh-mm>-bao18-walkforward-reverse-audit.json`

JSON phải đủ dữ liệu để reproduce report.

Không lưu chỉ aggregated prose.

---

# 31. REQUIRED JSON CONTENT

Artifact JSON tối thiểu có:

```text
schemaVersion
generatedAt
gitHead
branch
workingTreeStatus
datasetSha256
datasetRecordCount
firstDraw
latestDraw
lookback
seed
experimentSpecHash

math:
  totalCombinations
  bao18Tickets
  ticketPrice
  bao18CostPerDraw
  nullJackpotProbability

protocolA:
  evaluatedDraws
  hit6Count
  hit6Rate
  verdict

protocolB:
  perRule:
    n
    hit6Count
    hit6Rate
    expectedNullHits
    rawPValue
    adjustedPValue
    ci95
    intersectionHistogram
    meanIntersection
    hit4PlusRate
    hit5PlusRate
    fixedPrizePayout
    totalCost
    fixedNet
    early
    late

antiLeakTests

finalVerdict
```

---

# 32. REPORT STRUCTURE — REQUIRED

## A. Executive Verdict

Phải trả lời ngay:

1. Bao-18 có thể trúng Jackpot khi nào?
2. Protocol A đạt gì?
3. Vì sao A invalid?
4. Protocol B thực tế đạt bao nhiêu?
5. Có vượt theoretical/random baseline không?
6. Statistical uncertainty lớn đến đâu?
7. Final classification.

---

## B. Data & Provenance

- Git HEAD
- data hash
- n draws
- evaluation range
- lookback
- seed
- experiment spec hash

---

## C. Math Recap

Bao-18 probability.

Hypergeometric K distribution.

Exact lower-tier ticket-count formula.

Cost.

---

## D. Protocol A — INVALID Reverse Peek

Table + 100% sanity expectation.

Label thật lớn:

`INVALID_AS_EVIDENCE_OF_EDGE`

---

## E. Protocol B — Walk-Forward

Một table:

| Rule | n | Hit6 | Rate | Expected null hits | Raw p | Holm p | Mean K | ≥4 | ≥5 |

---

## F. Distribution Analysis

Observed K=0…6 vs hypergeometric null.

---

## G. RANDOM18 Paired Comparison

Rule vs RANDOM18.

---

## H. Time Stability

EARLY vs LATE.

---

## I. Economic Reality

- 18.564 tickets/draw
- 185.640.000 VND/draw
- hypothetical cumulative spend
- fixed prizes
- jackpot excluded from fixed EV
- expected cost-per-Jackpot identity under no-edge null

---

## J. Why Reverse Peek Feels Convincing

Giải thích:

- look-ahead bias
- tautology
- circular validation
- target leakage
- cherry-picking
- survivorship of winning examples

---

## K. Anti-Leak Evidence

Kết quả tests.

---

## L. Statistical Power & Limitations

Bắt buộc nói:

- expected number of rare hit6 events
- data length limitation
- retrospective nature
- historical test ≠ prospective proof
- jackpot share/tax unknown
- official prize rule assumptions

---

## M. Reproduction Commands

Ví dụ:

```bash
npm run typecheck
node --import=tsx --test lib/research/bao18-walkforward.test.ts
node --import=tsx scripts/audit-bao18-walkforward.ts
```

Điều chỉnh theo scripts thực tế.

---

# 33. VERDICT TAXONOMY

Chỉ dùng các verdict sau.

### INVALID_PEEK_ONLY

Protocol A.

---

### NO_EDGE

Dùng khi non-random rules không vượt null sau correction hoặc effect không ổn định.

---

### EXPLORATORY_RETROSPECTIVE_SIGNAL

Chỉ khi:

- effect positive
- corrected significance hoặc evidence đủ mạnh
- không do một đoạn thời gian duy nhất
- anti-leak pass

Ngay cả vậy phải kèm:

`NEEDS_PROSPECTIVE_CONFIRMATION`

---

### NEEDS_PROSPECTIVE_CONFIRMATION

Bắt buộc cho mọi retrospective signal trước khi có claim predictive.

---

# 34. PROMOTION GATE

Không được đề xuất dùng HOT18/COLD18/... để mua tiền thật chỉ dựa trên retrospective run.

Muốn promote rule:

1. Freeze exact rule.
2. Freeze lookback.
3. Freeze seed policy.
4. Freeze tie-break.
5. Freeze analysis plan.
6. Freeze target draw before publication.
7. Collect future draws.
8. Score without retuning.
9. Apply stopping rule / alpha policy.

Việc promote không nằm trong execution hiện tại.

---

# 35. FAIL-CLOSED CONDITIONS

STOP và báo lỗi nếu:

- dataset hash mismatch
- snapshot invalid
- future leakage test fail
- deterministic replay fail
- Protocol A không đạt 100%
- rule trả pool khác 18 unique numbers
- rule chứa số ngoài 1..45
- experiment artifact collision
- không xác định được ticket price từ repo
- mathematical constants repo mâu thuẫn dữ liệu canonical

Không silently continue.

---

# 36. DO NOT MODIFY

Không sửa:

- historical protocol lock
- existing experiment registry
- existing prospective scorecard history
- existing experiment artifacts
- production UI

trừ khi code reusable mới cần import không phá behavior.

Task này là research audit.

Không phải product redesign.

---

# 37. DEFINITION OF DONE

PASS chỉ khi đồng thời:

1. Protocol A chạy trên real snapshot.
2. Protocol A hit6 = 100%.
3. Protocol A bị label INVALID.
4. Protocol B chạy walk-forward trên real snapshot.
5. Mỗi pool B chỉ dùng historical prefix.
6. Target mutation anti-leak pass.
7. Future suffix mutation pass.
8. Replay-prefix invariance pass.
9. RANDOM18 baseline tồn tại.
10. Theoretical null được tính exact.
11. Hit6 có exact binomial significance analysis.
12. Multiple rules được Holm-correct.
13. Intersection K distribution được báo.
14. EARLY/LATE stability được báo.
15. Full Bao-18 cost được báo rõ.
16. Fixed-prize return được tính combinatorially.
17. Không enumerate toàn bộ vé trong main experiment nếu không cần.
18. Report Markdown được tạo.
19. JSON artifact được tạo.
20. Artifact có dataset hash + HEAD + experiment spec hash.
21. Không overwrite lịch sử research.
22. Final conclusion không biến retrospective evidence thành “chắc thắng”.

---

# 38. FINAL SCIENTIFIC INTERPRETATION

Nếu Protocol A:

`100%`

và Protocol B:

`≈ theoretical/random`

thì kết luận chính phải là:

> Reverse-peek có thể tạo ra ảo giác chiến thắng hoàn hảo, nhưng khi kỷ luật walk-forward được áp dụng, Bao-18 chỉ mua coverage bằng ngân sách lớn hơn và chưa cho thấy predictive edge.

Nếu Protocol B có rate cao hơn:

không dừng ở raw rate.

Phải kiểm:

- sample size
- rare-event variance
- exact p
- Holm p
- CI
- RANDOM18 comparison
- time stability
- anti-leak
- post-hoc contamination

Nếu vẫn còn signal:

> Đây là exploratory retrospective signal, chưa phải bằng chứng live. Rule phải được khóa và đánh giá prospectively trên các kỳ chưa tồn tại tại thời điểm khóa.

---

# 39. KICKOFF EXECUTION ORDER

Thực hiện tuần tự:

1. Inspect repository HEAD/status.
2. Read `bao.ts`, `analytics.ts`, RNG, Mega constants.
3. Validate manifest + dataset hash.
4. Resolve and freeze experiment spec.
5. Implement reusable Bao18 walk-forward core.
6. Implement Protocol A.
7. Implement Protocol B rules.
8. Implement exact combinatorial scoring.
9. Add anti-leak tests.
10. Add statistical tests.
11. Run test/typecheck.
12. Execute on canonical snapshot.
13. Inspect outputs for impossible values.
14. Generate JSON artifact.
15. Generate Markdown report.
16. Re-read final conclusions as an adversarial reviewer.
17. Remove any wording implying guaranteed or proven lottery edge.

Không hỏi human trong phạm vi đã xác định.

Không commit/push/deploy.

Bắt đầu thực thi ngay khi người dùng nói:

`OK — execute Master Bao-18 audit`