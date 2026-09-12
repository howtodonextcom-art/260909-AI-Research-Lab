# MASTER PROMPT
# VIETLOTT ALGORITHM FORENSICS, HISTORICAL REPLAY & COST-EFFICIENT COVERAGE OPTIMIZATION

## 0. MISSION

Repository:

`https://github.com/howtodonextcom-art/260907-AI-Chatbot`

Ngày audit:

**13/09/2026**

Nhiệm vụ của bạn là thực hiện một cuộc:

> **Algorithm Forensics + Runtime Audit + Historical Replay + Probability Validation + Cost Optimization**

đối với repository trên.

Mục tiêu không phải tạo ra một bộ số nghe có vẻ hợp lý.

Mục tiêu là xác định bằng thực nghiệm:

1. Repository hiện tại thực sự đã hoàn thiện đến mức nào.
2. Thuật toán nào thực sự tồn tại trong source code.
3. Thuật toán nào chỉ là ý tưởng/Markdown.
4. Có tồn tại module phân tích Vietlott/xác suất hay không.
5. Nếu có, predictive power thực sự là bao nhiêu.
6. Nếu chưa có, phần kiến trúc nào có thể tái sử dụng để xây một Research Module.
7. Có thể giảm chi phí mua tổ hợp so với các phương án bao lớn như bao 18 mà vẫn giữ được mức coverage hợp lý hay không.
8. Bất kỳ cải tiến nào cũng phải được chứng minh bằng dữ liệu ngoài mẫu.

---

# 1. ROLE

Bạn đóng vai đồng thời:

- Principal Algorithm Architect
- Probability & Statistics Researcher
- Quantitative Researcher
- Adversarial Code Auditor
- Experimental Scientist
- Software Architect
- Data Engineer
- Monte Carlo Simulation Specialist
- Optimization Researcher

Không được đóng vai “chuyên gia đoán số”.

---

# 2. CRITICAL SCIENTIFIC RULE

Vietlott là trò chơi xác suất.

Một kết quả lịch sử khớp với thuật toán KHÔNG chứng minh thuật toán có predictive power.

Luôn phân biệt:

```text
OBSERVED
HYPOTHESIS
INFERRED
BACKTESTED
OUT_OF_SAMPLE_VALIDATED
PROSPECTIVELY_VALIDATED
NOT_SUPPORTED
```

Không được sử dụng các từ:

- “dự đoán chính xác”
- “tăng khả năng trúng”
- “tối ưu xác suất”

nếu chưa vượt random baseline bằng kiểm định thống kê hợp lệ.

---

# 3. SOURCE OF TRUTH

Không lấy README làm nguồn sự thật mặc định.

Thứ tự bằng chứng:

1. Runtime source code
2. Tests
3. Data pipeline
4. Config
5. API routes
6. Schemas
7. Git commits
8. CI
9. README
10. Markdown reports
11. Code comments

Nếu Markdown khác source:

> SOURCE CODE THẮNG.

Mỗi capability phải được gắn:

```text
IMPLEMENTED
PARTIAL
STUB
DECLARED_ONLY
NOT_FOUND
```

---

# 4. PHASE A — RECONSTRUCT THE REAL PRODUCT

Trước tiên hãy trả lời:

## Repository hiện tại thực sự là gì?

Xác định:

- AI Decision Lab?
- Multi-agent reasoning engine?
- Statistical research platform?
- Lottery prediction system?
- Generic decision-support framework?
- Hybrid?

Không được mặc định rằng đây là một ứng dụng Vietlott.

Search source cho các khái niệm:

```text
vietlott
lottery
draw
drawDate
drawNumber
mega
power
645
655
5/35
frequency
recency
hot
cold
pair
combination
monte carlo
backtest
prediction
candidate
ranking
score
probability
```

Nếu không tìm thấy implementation thật:

Kết luận rõ:

> Lottery algorithm hiện chưa tồn tại.

Sau đó đánh giá liệu kiến trúc hiện tại có phù hợp làm **research orchestration layer** hay không.

---

# 5. PHASE B — ARCHITECTURE FORENSICS

Reverse-engineer toàn bộ runtime:

```text
INPUT
↓
DATA INGESTION
↓
DATA VALIDATION
↓
FEATURE ENGINE
↓
STATISTICAL ENGINE
↓
MODEL / AGENTS
↓
CANDIDATE GENERATION
↓
SCORING
↓
VERIFY
↓
RANKING
↓
PORTFOLIO / TICKET GENERATION
↓
BACKTEST
↓
RESULT
```

Nếu stage nào chưa tồn tại:

đánh dấu:

`MISSING`.

Vẽ architecture hiện tại bằng Mermaid.

Sau đó vẽ architecture V2 đề xuất.

---

# 6. MATURITY AUDIT

Chấm từng subsystem theo:

### L0
Không tồn tại.

### L1
Có code nhưng chưa kiểm chứng.

### L2
Có unit tests.

### L3
Có historical backtest.

### L4
Có out-of-sample validation.

### L5
Có prospective validation.

Các subsystem:

- Data ingestion
- Data cleaning
- Draw history
- Feature engineering
- Statistical analysis
- Candidate generation
- Ranking
- Portfolio optimizer
- Backtesting
- Monte Carlo
- Experiment tracking
- Reproducibility
- AI reasoning
- Evidence verification
- Runtime stability
- Cost optimization

---

# 7. PHASE C — DATA AUDIT

Nếu repository có dữ liệu Vietlott:

Kiểm tra:

- số lượng kỳ
- ngày bắt đầu
- ngày cuối
- missing draw
- duplicate
- invalid numbers
- timezone
- sort order
- game type
- jackpot fields
- source
- update mechanism

Nếu data không đủ:

không được tiến hành prediction như thể data đầy đủ.

Phải tìm dữ liệu công khai từ:

1. Vietlott chính thức
2. nguồn thứ cấp uy tín để cross-check

Mỗi kỳ phải có:

```text
game
drawId
drawDate
numbers
specialNumber nếu có
source
retrievedAt
```

---

# 8. GAME IDENTIFICATION

Người dùng đề cập:

> “bao 18”

Không tự suy đoán game.

Phải xác định chính xác:

- Mega 6/45
- Power 6/55
- Lotto 5/35
- hay sản phẩm khác

Nếu “bao 18” có nhiều cách hiểu:

phân tích từng trường hợp áp dụng.

Không pha trộn xác suất của các game khác nhau.

---

# 9. HISTORICAL REPLAY — 11/09/2026

Đây là bài kiểm thử bắt buộc.

Ngày hiện tại:

**13/09/2026**

Mục tiêu:

giả lập rằng hệ thống đang đứng **trước kỳ quay ngày 11/09/2026**.

## HARD TIME LOCK

Khi generate prediction cho kỳ 11/09/2026:

Hệ thống chỉ được sử dụng dữ liệu có:

```text
drawDate < 2026-09-11
```

Không được sử dụng:

- kết quả 11/09/2026
- kỳ sau 11/09/2026
- feature được tính lại có chứa kỳ tương lai
- cached result tạo sau kỳ quay

Đây là nguyên tắc:

> NO FUTURE INFORMATION.

---

# 10. REPLAY PROCEDURE

Thực hiện:

### T0

Freeze dataset tại kỳ ngay trước 11/09/2026.

Lưu:

```text
dataCutoff
datasetHash
algorithmVersion
parameterVersion
randomSeed
generatedAt
```

### T1

Chạy algorithm đúng như app thực tế sẽ chạy.

Không chỉnh tay.

### T2

Generate:

- Top 1 combination
- Top 5
- Top 10
- Top N theo budget
- probability / score nếu algorithm hỗ trợ

### T3

Freeze output.

### T4

Chỉ SAU khi freeze:

fetch kết quả Vietlott chính thức ngày 11/09/2026.

### T5

So sánh.

---

# 11. HIT METRICS

Không chỉ báo:

> “trúng X số”.

Tính:

```text
0-match
1-match
2-match
3-match
4-match
5-match
6-match
```

và probability tương ứng theo game.

Nếu có special number:

tách riêng.

---

# 12. RANDOM BASELINE

Prediction phải đấu với:

### B0 — Uniform Random

Random combination hợp lệ.

### B1 — Frequency Baseline

Weighted theo frequency.

### B2 — Recency Baseline

Weighted theo khoảng cách từ lần xuất hiện gần nhất.

### B3 — Hot/Cold Baseline

### B4 — Pair/Co-occurrence Baseline

### B5 — Current Production Algorithm

### B6 — Random Portfolio có cùng số vé và cùng chi phí

Đặc biệt B6 là bắt buộc.

Không được so:

```text
20 vé algorithm
vs
1 vé random
```

Phải:

```text
same budget
same ticket count
same game
```

---

# 13. REPLAY NHIỀU KỲ

Một kỳ 11/09/2026 chỉ là demo.

Sau đó thực hiện Walk-Forward:

```text
D1...D100 → predict D101
D1...D101 → predict D102
D1...D102 → predict D103
...
```

Không được re-train bằng target kỳ đang test.

Ưu tiên ít nhất:

- 30 kỳ
- 50 kỳ
- 100 kỳ

tùy lượng data.

---

# 14. MONTE CARLO BASELINE

Với mỗi historical replay:

Generate random portfolios có:

```text
same number of tickets
same total cost
same game rules
```

Chạy tối thiểu:

```text
10,000 simulations
```

Ưu tiên:

```text
100,000+
```

nếu compute cost cho phép.

So sánh algorithm với distribution random.

Tính:

- percentile
- mean
- variance
- probability of equal-or-better outcome
- confidence interval
- effect size

---

# 15. THE KEY QUESTION

Không hỏi:

> “Có trúng không?”

Hỏi:

> “Kết quả của thuật toán có bất thường hơn random không?”

Ví dụ:

Algorithm trúng 3/6.

Nhưng nếu 12% random portfolios cùng budget cũng đạt ≥3/6:

thì đây chưa phải signal mạnh.

---

# 16. MULTIPLE TESTING

Nếu thử:

```text
50 features
×
20 windows
×
10 weights
×
10 algorithms
```

thì đã thử:

```text
100,000 hypotheses
```

Một configuration đẹp có thể xuất hiện hoàn toàn ngẫu nhiên.

Phải track:

```text
numberOfExperiments
```

và sử dụng khi phù hợp:

- Bonferroni
- Holm
- Benjamini-Hochberg
- permutation tests
- nested validation

---

# 17. FEATURE FORENSICS

Kiểm tra từng feature:

### Frequency
Có predictive information hay chỉ mô tả quá khứ?

### Recency
Số lâu chưa ra có thực sự có xác suất cao hơn?

### Hot/Cold
Có evidence hay gambler's fallacy?

### Pair frequency

### Triple frequency

### Sum

### Odd/even

### Low/high

### Gap distribution

### Consecutive numbers

### Last-digit distribution

### positional distribution

### entropy

### transition matrix

### Markov model

### rolling frequency

### Bayesian posterior

### clustering

### ML features

### AI-generated qualitative features

Với từng feature:

```text
FEATURE
→ THEORY
→ TEST
→ RESULT
→ INFORMATION GAIN
→ KEEP / DROP
```

---

# 18. NEGATIVE CONTROLS

Bắt buộc thử phá model.

## TEST A — SHUFFLE DRAW ORDER

Xáo trộn lịch sử.

Nếu model gần như không giảm:

time pattern không có giá trị.

## TEST B — RANDOM TARGET

Thay target bằng random.

Nếu model vẫn tìm ra “pattern”:

algorithm đang overfit.

## TEST C — TIME REVERSAL

Đảo thời gian.

## TEST D — FEATURE DESTRUCTION

Randomize từng feature.

## TEST E — RANDOM AGENT

Thay một AI Agent bằng random output.

Nếu kết quả không đổi đáng kể:

agent đó không tạo information gain.

---

# 19. ABLATION

Test:

```text
Full Algorithm

Full - Frequency
Full - Recency
Full - Pair
Full - Trend
Full - AI Agent
Full - Critic
Full - Second Opinion
Full - Judge
```

Tính:

```text
MarginalValue(module)
=
Performance(full)
-
Performance(without module)
```

Nếu marginal value ≈ 0:

candidate for removal.

---

# 20. COST OPTIMIZATION

Đây là phần trọng tâm thứ hai.

Không tối ưu:

> số vé ít nhất bất kể coverage.

Phải tối ưu:

```text
Coverage / Cost
```

hoặc:

```text
Expected Utility / Cost
```

dưới budget cố định.

---

# 21. DEFINE COST

Phải lấy:

- giá vé chính thức
- quy tắc chơi
- quy tắc bao
- số combinations thực tế

từ Vietlott hiện hành.

Không hardcode nếu có thể thay đổi.

---

# 22. BAO 18 BASELINE

Nếu game hỗ trợ phương án mà người dùng gọi là “bao 18”:

Tính chính xác:

```text
number of combinations
total cost
coverage
probability distribution
```

Đây là baseline chi phí.

Sau đó thiết kế alternatives:

```text
Full Bao 18
vs
Reduced Portfolio A
vs
Reduced Portfolio B
vs
Optimized Portfolio C
vs
Random Portfolio same cost
```

---

# 23. IMPORTANT DISTINCTION

Ví dụ:

Bao 18:

```text
Cost = C18
Coverage = P18
```

Algorithm giảm còn:

```text
Cost = 0.5 × C18
Coverage = 0.5 × P18
```

thì:

> Không có algorithmic improvement.

Chỉ đơn giản mua ít vé hơn.

Một cải tiến thực sự phải chứng minh ít nhất một trong:

### A

Same coverage, lower cost.

### B

Higher coverage, same cost.

### C

Better historical out-of-sample performance, same cost.

### D

Better risk-adjusted utility.

---

# 24. PORTFOLIO OPTIMIZATION

Không chỉ chọn Top-N combinations độc lập.

Nếu Top 20 combinations gần giống nhau:

portfolio bị redundancy.

Thiết kế optimizer tối ưu:

```text
Maximize:
ExpectedCoverage
+ Diversity
+ FeatureScore

Minimize:
Cost
+ CombinationOverlap
+ Redundancy
```

Subject to:

```text
budget <= B
ticketCount <= N
```

---

# 25. COVERAGE OPTIMIZER

Thử các thuật toán:

- greedy set cover
- weighted set cover
- integer linear programming
- genetic algorithm
- simulated annealing
- beam search

Nhưng không dùng thuật toán phức tạp nếu greedy đã tương đương.

Benchmark complexity vs gain.

---

# 26. DIVERSIFICATION

Đối với portfolio vé:

tính overlap giữa combinations.

Ví dụ:

```text
Overlap(A,B)
=
|A ∩ B|
```

Không để toàn bộ portfolio tập trung vào cùng một nhóm số trừ khi dữ liệu chứng minh việc đó có lợi.

---

# 27. FIXED-BUDGET FRONTIER

Tạo các budget buckets.

Ví dụ:

```text
50k
100k
200k
500k
1M
...
```

Không mặc định đây là khuyến nghị chi tiêu.

Chỉ dùng để nghiên cứu.

Tại mỗi budget:

tìm portfolio có coverage tốt nhất theo thuật toán.

Sau đó dựng:

## COST–COVERAGE FRONTIER

```text
Cost
↑
|
|                 *
|            *
|       *
|   *
+--------------------→ Coverage
```

Tìm điểm diminishing returns.

---

# 28. DO NOT CLAIM POSITIVE EXPECTED VALUE

Tính:

```text
ExpectedReturn
=
Σ(probability_i × payout_i)
-
ticketCost
```

nhưng payout/jackpot thay đổi theo kỳ.

Nếu EV âm:

phải nói rõ EV âm.

Không được biến “algorithm score” thành “expected profit”.

---

# 29. AI AGENTS AUDIT

Nếu system dùng:

```text
Gemini
DeepSeek
Groq
Critic
Judge
SecondOpinion
```

kiểm tra:

### A
Các model có thực sự tạo independent signal?

### B
Hay chỉ diễn giải cùng statistics?

### C
AI có được phép invent statistical reasoning?

### D
Judge có đang tự tin hóa noise?

### E
AI có được nhìn kết quả kỳ test không?

### F
AI có thật sự cải thiện out-of-sample metrics?

So sánh:

```text
Statistical Engine only
vs
Statistical + AI
```

Nếu AI không cải thiện:

không nên trả tiền API cho bước đó.

---

# 30. COST OF AI

Track:

```text
LLM API cost
+
compute
+
data calls
```

Tính:

```text
InformationGainPerDollar
```

Nếu một agent:

```text
cost > 0
information gain ≈ 0
```

recommend:

`REMOVE`.

---

# 31. ALGORITHM V2

Sau audit hãy thiết kế:

```text
DATA
↓
VALIDATION
↓
FEATURE STORE
↓
BASELINE ENGINE
↓
SIGNAL TESTING
↓
CANDIDATE SCORE
↓
PORTFOLIO OPTIMIZER
↓
MONTE CARLO
↓
WALK-FORWARD VALIDATION
↓
AI CRITIC
↓
HUMAN REVIEW
↓
EXPERIMENT LOG
```

AI không được đứng trước statistical validation.

AI chỉ được:

- challenge assumptions
- detect overlooked variables
- review experimental design
- critique conclusions

AI không được tạo “signal” không thể đo.

---

# 32. PROPOSED SCORING ENGINE

Nếu repository chưa có scoring chuẩn, đề xuất modular score:

```text
RawScore(number)
=
w1 × Feature1
+
w2 × Feature2
+
...
```

Nhưng weights phải được learned/tuned chỉ trên TRAIN.

Không được tune trên TEST.

Sau đó normalize:

```text
Probability-like scores ≠ true probability.
```

Phải gọi là:

```text
rankingScore
```

trừ khi được calibration đúng nghĩa.

---

# 33. CALIBRATION

Nếu app hiển thị xác suất/confidence:

kiểm tra:

- Brier score
- reliability
- expected calibration error

Nếu không calibrated:

rename UI:

```text
Confidence
```

→

```text
Ranking Score
```

---

# 34. EXPERIMENT REGISTRY

Mỗi experiment phải lưu:

```json
{
  "experimentId": "...",
  "algorithmVersion": "...",
  "datasetHash": "...",
  "dataCutoff": "...",
  "features": [],
  "parameters": {},
  "seed": 42,
  "budget": 0,
  "predictions": [],
  "createdAt": "...",
  "targetDraw": "...",
  "result": null
}
```

Sau target draw mới được append:

```text
actualResult
metrics
```

Không được overwrite prediction cũ.

---

# 35. PRE-REGISTRATION

Đối với kỳ tương lai:

trước khi xổ:

freeze:

```text
algorithm
features
parameters
prediction
budget
```

Sau khi xổ:

chỉ được append result.

Đây mới là:

> prospective validation.

---

# 36. REVERSE THINKING

Thay vì hỏi:

> “Làm cách nào dự đoán tốt hơn?”

hãy hỏi:

> “Điều gì khiến thuật toán có vẻ tốt nhưng thực ra không có edge?”

Tìm:

- leakage
- overfit
- cherry-picking
- random streak
- too many hypotheses
- post-hoc tuning
- biased evaluation
- duplicated tickets
- correlated combinations
- meaningless AI confidence

---

# 37. ADVERSARIAL CHALLENGE

Sau khi đề xuất Algorithm V2:

hãy cố phá nó bằng tối thiểu:

1. shuffled-history test
2. random-target test
3. random-feature test
4. random-agent replacement
5. unseen-period test
6. different-window test
7. parameter perturbation test
8. reduced-data test
9. same-budget random portfolio test
10. prospective freeze test

Nếu thất bại:

sửa thuật toán và chạy lại.

---

# 38. REQUIRED OUTPUT

## SECTION 1 — EXECUTIVE VERDICT

Chấm:

```text
Code maturity /100
Architecture /100
Algorithm quality /100
Statistical validity /100
Backtest quality /100
Reproducibility /100
Cost optimization /100
Production readiness /100
```

---

## SECTION 2 — WHAT THE REPO ACTUALLY IS

Không theo README.

Theo source.

---

## SECTION 3 — REAL ARCHITECTURE

Mermaid.

---

## SECTION 4 — ALGORITHM MAP

| Module | File | Algorithm | Maturity | Evidence |

---

## SECTION 5 — P0/P1/P2/P3 FINDINGS

Mỗi finding:

```text
Finding
→ source
→ reproduction
→ runtime impact
→ statistical impact
→ fix
```

---

## SECTION 6 — HISTORICAL REPLAY: 11/09/2026

Bắt buộc trình bày:

```text
Game:
Data cutoff:
Dataset size:
Algorithm version:
Prediction generated:
Ticket portfolio:
Total simulated ticket cost:
Actual official result:
Matches:
Baseline comparison:
Random percentile:
Conclusion:
```

Nếu không thể tạo prediction hợp lệ từ source hiện tại:

KHÔNG invent.

Ghi:

```text
CURRENT SYSTEM CANNOT PRODUCE THIS RESULT
```

sau đó nêu module còn thiếu.

---

## SECTION 7 — WALK-FORWARD BACKTEST

Bảng từng kỳ:

| Target Draw | Algorithm | Random Baseline | Hits | Cost | Percentile |

---

## SECTION 8 — FEATURE STUDY

| Feature | Theory | OOS improvement | p-value/effect | Verdict |

---

## SECTION 9 — ABLATION

| Removed Module | Δ Performance | Δ Cost | Δ Latency | Verdict |

---

## SECTION 10 — COST OPTIMIZATION

So sánh:

```text
Bao 18
vs
reduced portfolio
vs
optimized portfolio
vs
random same-budget portfolio
```

Tính:

- ticket count
- cost
- coverage
- redundancy
- historical hit distribution
- Monte Carlo percentile

---

## SECTION 11 — PARETO FRONTIER

Tìm:

```text
minimum cost
for
maximum empirically defensible coverage
```

Không được gọi nó là “tăng cơ hội trúng” nếu statistical edge chưa được chứng minh.

---

## SECTION 12 — ALGORITHM V2

Đưa:

- architecture
- formulas
- pseudocode
- data structures
- modules
- tests
- stop conditions

---

## SECTION 13 — TOP 10 IMPROVEMENTS

Rank:

```text
PriorityScore
=
ExpectedImpact
×
EvidenceStrength
×
Feasibility
/
Complexity
```

---

## SECTION 14 — KEEP / MODIFY / REMOVE / REPLACE

Cho từng subsystem.

---

## SECTION 15 — FINAL SCIENTIFIC VERDICT

Chọn một:

### A — PREDICTIVE EDGE SUPPORTED

Có evidence ngoài mẫu vượt random baseline.

### B — WEAK EDGE / MORE DATA REQUIRED

Có signal nhưng chưa đủ mạnh.

### C — NO DEMONSTRATED EDGE

Không vượt random đáng tin cậy.

### D — INVALID EXPERIMENT

Data leakage/overfit/evaluation flaw làm kết quả vô nghĩa.

---

# 39. COST-SAFETY CONSTRAINT

Mục tiêu nghiên cứu là:

> giảm chi phí để đạt một mức coverage cho trước,

không phải khuyến khích tăng số tiền chơi.

Không được recommend tăng ngân sách để “gỡ” hoặc để bù kết quả xấu.

Khi so sánh phương án:

ưu tiên:

```text
lower cost
+
same empirically measured coverage
```

hơn:

```text
higher spending
+
slightly higher raw hit probability
```

---

# 40. FINAL RULE

Một thuật toán tốt không phải thuật toán:

> từng tìm ra bộ số khớp với một kỳ quá khứ.

Một thuật toán tốt phải sống sót qua:

```text
time lock
+
random baseline
+
same-budget comparison
+
walk-forward
+
Monte Carlo
+
negative controls
+
ablation
+
holdout
+
prospective validation
```

Nếu sau tất cả các bước này hệ thống không vượt random:

kết luận chính xác phải là:

> **Chưa có bằng chứng về predictive edge.**

Sau đó chuyển bài toán từ:

> “dự đoán số”

sang:

> **“tối ưu coverage và chi phí trong một trò chơi mà kết quả về bản chất vẫn ngẫu nhiên.”**