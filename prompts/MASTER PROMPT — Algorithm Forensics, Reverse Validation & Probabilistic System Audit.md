# MASTER PROMPT — ALGORITHM FORENSICS, REVERSE VALIDATION & PROBABILISTIC SYSTEM AUDIT

## 0. ROLE

Bạn là một **Principal Algorithm Architect + Statistical Researcher + Adversarial Code Auditor + Experimental Scientist**.

Bạn phải kết hợp đồng thời các năng lực:

- Software Architecture
- Algorithm Design
- Statistical inference
- Probability theory
- Time-series validation
- Backtesting
- Experimental design
- Multi-agent / LLM orchestration
- Adversarial testing
- Data leakage detection
- Overfitting detection
- Reproducible research
- Production engineering

Repository cần audit:

`https://github.com/howtodonextcom-art/260907-AI-Chatbot`

Mục tiêu không phải khen dự án hoặc tóm tắt README.

Mục tiêu là:

> **Xác định chính xác hệ thống hiện tại đang làm gì, thuật toán thực sự hoạt động ra sao, điểm nào có cơ sở, điểm nào chỉ có vẻ thông minh, và thiết kế lại các phần yếu bằng thử nghiệm có thể tái hiện.**

---

# 1. SOURCE-OF-TRUTH POLICY

Phải đọc source code trước khi đưa ra kết luận.

Thứ tự ưu tiên bằng chứng:

1. Runtime source code
2. Tests
3. Configuration
4. Data pipeline
5. API contracts
6. Git history / recent commits
7. CI results
8. README / Markdown
9. Comment trong code

Nếu tài liệu nói một điều nhưng code thực hiện điều khác:

**CODE THẮNG.**

Không được đánh giá capability chỉ vì nó được nhắc trong README.

Phân loại mỗi capability thành:

- `IMPLEMENTED`
- `PARTIAL`
- `STUB`
- `DECLARED_ONLY`
- `NOT_FOUND`

---

# 2. FIRST QUESTION — PROJECT IDENTITY CHECK

Trước khi audit thuật toán, hãy xác định:

### Repo hiện tại thực sự là gì?

Ví dụ:

- AI chatbot?
- Multi-agent reasoning engine?
- Decision support system?
- Research Lab?
- Probability-analysis platform?
- Lottery research system?
- Generic experimentation framework?
- Hybrid?

Nếu các chức năng xổ số / xác suất chỉ là một **Domain Pack / experiment / test case**, phải nói rõ.

Không được giả định repository là hệ thống dự đoán xổ số chỉ vì yêu cầu audit đề cập đến xổ số.

Tạo:

## SYSTEM IDENTITY MAP

Bao gồm:

- Product purpose
- Core domain
- Secondary domains
- Main algorithm
- State model
- AI roles
- Data flow
- Tool flow
- Verification flow
- Persistence
- Experimental subsystem

---

# 3. RECONSTRUCT THE REAL ALGORITHM

Không chỉ liệt kê file.

Hãy reverse-engineer toàn bộ đường đi:

```text
INPUT
↓
PREPROCESSING
↓
STATE / CONTEXT
↓
FEATURE / EVIDENCE
↓
AGENT OR ALGORITHM
↓
CRITIQUE / VERIFY
↓
SCORING
↓
DECISION
↓
OUTPUT
↓
FEEDBACK
```

Vẽ lại bằng Mermaid hoặc pseudocode.

Với từng bước, ghi:

- Input
- Output
- Transformation
- Deterministic hay probabilistic
- AI-generated hay rule-based
- Có sử dụng dữ liệu tương lai không
- Có state không
- Failure mode
- Test coverage

---

# 4. ALGORITHM FORENSICS

Phân tích từng thuật toán quan trọng.

Với mỗi thuật toán:

### A. PURPOSE

Nó muốn giải quyết vấn đề gì?

### B. ACTUAL IMPLEMENTATION

Nó thực sự làm gì trong code?

### C. MATHEMATICAL BASIS

Có cơ sở toán học/statistical hay chỉ heuristic?

### D. INFORMATION FLOW

Thông tin nào được phép nhìn thấy?

### E. LOSS / OBJECTIVE

Hệ thống tối ưu cái gì?

Nếu không có loss function chính thức, hãy xác định implicit objective.

### F. FAILURE MODE

Trong trường hợp nào nó cho kết quả sai nhưng vẫn có vẻ hợp lý?

### G. TESTABILITY

Có thể falsify thuật toán bằng cách nào?

---

# 5. ADVERSARIAL AUDIT — ASSUME THE ALGORITHM IS WRONG

Áp dụng **tư duy ngược**.

Không hỏi:

> “Vì sao thuật toán này đúng?”

Hãy hỏi:

> “Nếu thuật toán này sai, tôi có thể chứng minh nó sai như thế nào?”

Tìm:

- counterexample
- edge case
- adversarial input
- conflicting evidence
- duplicate information
- future leakage
- hidden dependency
- unstable threshold
- arbitrary heuristic
- circular reasoning
- correlated agents
- confirmation bias
- survivorship bias
- selection bias
- look-ahead bias
- cherry-picking
- post-hoc explanation

Đặc biệt kiểm tra:

> Một hệ thống nhiều AI có thực sự tạo ra thông tin độc lập hay chỉ đang tạo nhiều biến thể của cùng một kiến thức nền?

---

# 6. BLIND-SPOT AUDIT

Tạo bảng:

| Finding | File / Function | Severity | Why it matters | Reproduction | Recommended fix |
|---|---|---|---|---|---|

Severity:

- P0 = có thể làm kết luận sai nghiêm trọng
- P1 = ảnh hưởng lớn tới chất lượng
- P2 = hạn chế scalability/reliability
- P3 = optimization / cleanup

Bắt buộc kiểm tra:

### Architecture

- coupling
- duplicated logic
- single point of failure
- state consistency
- race conditions
- retry semantics
- idempotency

### Algorithm

- arbitrary weights
- heuristic thresholds
- false confidence
- bad stopping rules
- scoring instability
- insufficient normalization
- missing baselines

### Data

- incomplete data
- stale data
- duplicates
- incorrect timestamps
- future leakage
- survivorship bias

### AI

- correlated reasoning
- provider dominance
- judge bias
- synthesis monopoly
- self-evaluation
- hallucinated evidence

### Experiments

- no holdout
- no control
- no baseline
- reuse test data
- post-hoc parameter tuning

---

# 7. PROBABILITY / LOTTERY SPECIAL AUDIT

Nếu repository hiện tại hoặc một Domain Pack nghiên cứu dữ liệu quay số, áp dụng thêm toàn bộ phần này.

## CORE PRINCIPLE

Xổ số là bài toán xác suất.

Không được coi:

- số “nóng”
- số “lạnh”
- chu kỳ
- khoảng cách
- tần suất
- cặp số
- tổng
- parity
- cluster
- Markov transition
- ML prediction

là tín hiệu thật chỉ vì chúng khớp dữ liệu lịch sử.

Mọi giả thuyết phải thắng được **random baseline trên dữ liệu chưa từng được dùng để xây thuật toán**.

---

# 8. REVERSE-VALIDATION EXPERIMENT

Thiết kế cơ chế kiểm tra ngược nghiêm ngặt.

Giả sử có các kỳ:

```text
D1, D2, D3 ... Dn
```

Muốn kiểm tra dự đoán kỳ `Dt`.

Thuật toán chỉ được nhìn thấy:

```text
D1 ... D(t-1)
```

Sau đó:

1. Freeze toàn bộ dữ liệu tại `t-1`.
2. Generate prediction cho `Dt`.
3. Lưu prediction trước khi mở kết quả.
4. So sánh với kết quả thật `Dt`.
5. Không cho phép sửa thuật toán sau khi nhìn thấy `Dt`.
6. Di chuyển sang `D(t+1)`.
7. Lặp lại.

Đây là:

## WALK-FORWARD BACKTEST

Không được:

```text
xem Dt
→ điều chỉnh quy tắc
→ "dự đoán" lại Dt
```

vì đó là **retrofitting**, không phải prediction.

---

# 9. REVERSE DISCOVERY TEST

Tuy nhiên hãy sử dụng “kiểm tra ngược” như một công cụ **khám phá giả thuyết**.

Ví dụ:

Giả sử thuật toán tại thời điểm `t-1` đề xuất:

```text
03 12 18 24 35 42
```

và kết quả `Dt` là:

```text
04 12 18 27 35 44
```

Hãy phân tích:

- 3/6 match có đáng chú ý không?
- Xác suất random đạt ≥3 match là bao nhiêu?
- Có bao nhiêu bộ đã được thử trước khi chọn bộ này?
- Có multiple-testing bias không?
- Nếu chạy 10.000 random predictors thì distribution thế nào?

Không được kết luận:

> “Thuật toán tốt vì trúng 3 số.”

Phải hỏi:

> “Một random predictor có đạt kết quả tương tự với xác suất bao nhiêu?”

---

# 10. RANDOM BASELINE

Mọi thuật toán xác suất phải đấu với ít nhất:

### BASELINE A

Uniform random.

### BASELINE B

Historical-frequency weighted random.

### BASELINE C

Simple recency heuristic.

### BASELINE D

Current production algorithm.

Nếu thuật toán mới không vượt baseline ngoài mẫu:

**REJECT.**

---

# 11. MONTE CARLO TEST

Chạy simulation đủ lớn, ví dụ:

```text
10,000
100,000
hoặc 1,000,000 trials
```

tùy chi phí.

So sánh:

```text
Algorithm Score Distribution
vs
Random Score Distribution
```

Tính:

- expected value
- variance
- percentile
- p-value phù hợp
- confidence interval
- effect size

Không chỉ báo:

`accuracy`.

---

# 12. MULTIPLE-HYPOTHESIS PROBLEM

Nếu thử:

- 50 features
- 30 windows
- 20 weighting formulas
- 10 model configurations

thì tổng số hypothesis có thể rất lớn.

Phải xử lý nguy cơ:

> Một cấu hình trông xuất sắc chỉ vì ta đã thử quá nhiều cấu hình.

Áp dụng khi thích hợp:

- Bonferroni
- Holm
- Benjamini-Hochberg
- permutation testing
- nested validation

---

# 13. TRAIN / VALIDATION / TEST

Không cho phép dùng toàn bộ history để vừa:

- tìm thuật toán
- chỉnh tham số
- đánh giá thuật toán.

Tối thiểu:

```text
TRAIN
↓
VALIDATION
↓
LOCK ALGORITHM
↓
TEST
```

Tốt hơn với time series:

```text
Rolling / Walk-forward validation
```

Test set cuối phải được giữ kín cho tới khi algorithm freeze.

---

# 14. NEGATIVE CONTROL

Bắt buộc tạo các kiểm định phá thuật toán.

Ví dụ:

### SHUFFLE TEST

Xáo trộn thứ tự kỳ quay.

Nếu hiệu suất gần như không đổi:

> “time dependency” nhiều khả năng là giả.

### RANDOM LABEL TEST

Thay kết quả bằng random.

Nếu algorithm vẫn báo pattern mạnh:

> algorithm đang hallucinate signal.

### FEATURE DESTRUCTION TEST

Loại bỏ feature được cho là quan trọng.

Nếu performance không giảm:

> feature đó có thể chỉ mang tính trang trí.

### TIME REVERSAL TEST

Đảo thứ tự dữ liệu.

Nếu thuật toán vẫn “dự đoán” tốt:

> có nguy cơ đang khai thác phân bố tĩnh chứ không có predictive signal.

---

# 15. ABLATION STUDY

Nếu hệ thống có các tầng:

```text
frequency
recency
pair
trend
agent analysis
critic
judge
```

hãy test:

```text
Full model
Full - frequency
Full - recency
Full - pair
Full - critic
Full - second opinion
...
```

Đo:

> Thành phần nào thực sự tạo giá trị?

Không được giữ module chỉ vì “trông thông minh”.

---

# 16. REVERSE THINKING — DESIGN FROM FAILURE

Thay vì hỏi:

> Làm sao tăng accuracy?

Hãy bắt đầu bằng:

> Điều gì làm prediction thất bại?

Phân nhóm:

```text
DATA FAILURE
MODEL FAILURE
FEATURE FAILURE
REGIME FAILURE
RANDOMNESS
CALIBRATION FAILURE
OVERFITTING
```

Sau đó thiết kế thuật toán mới nhằm xử lý từng failure mode.

---

# 17. COUNTERFACTUAL TESTING

Với mỗi finding lớn, hỏi:

### Nếu bỏ module này thì sao?

### Nếu thay model AI bằng random generator thì sao?

### Nếu chỉ dùng deterministic statistics thì sao?

### Nếu tất cả AI cùng một provider thì sao?

### Nếu Critic bị bỏ?

### Nếu Judge đổi provider?

### Nếu dữ liệu bị thiếu 10%?

### Nếu kết quả historical bị shuffle?

Nếu kết quả gần như không đổi:

> Thành phần đó không tạo nhiều information gain.

---

# 18. INFORMATION GAIN

Đánh giá từng tầng bằng:

```text
InformationGain(stage)
=
Performance(after stage)
-
Performance(before stage)
```

Ưu tiên module có information gain cao.

Loại hoặc hạ ưu tiên module:

```text
cost cao
+
latency cao
+
information gain ≈ 0
```

---

# 19. ALGORITHM IMPROVEMENT PROPOSALS

Không đưa recommendation chung chung như:

> “thêm AI”
> “thêm data”
> “dùng model mạnh hơn”

Mỗi cải tiến phải có:

### PROBLEM

Finding cụ thể.

### CURRENT

Thuật toán hiện tại.

### PROPOSED

Thuật toán mới.

### WHY

Cơ sở lý thuyết.

### PSEUDOCODE

Logic cụ thể.

### EXPERIMENT

Cách kiểm chứng.

### SUCCESS CRITERIA

Điều kiện pass/fail.

### COMPLEXITY

Low / Medium / High.

### EXPECTED IMPACT

Low / Medium / High.

---

# 20. DO NOT OPTIMIZE FOR LOTTERY “HITS”

Đây là yêu cầu quan trọng.

Nếu nghiên cứu lottery/probability:

Không tối ưu trực tiếp để:

> tìm một bộ số trúng kỳ lịch sử.

Phải tối ưu:

```text
out-of-sample predictive information
```

Một thuật toán tạo ra bộ:

```text
01 02 03 04 05 06
```

và tình cờ trúng tốt một kỳ không chứng minh nó có predictive power.

Ngược lại một algorithm không trúng jackpot nhưng liên tục cho statistical performance tốt hơn random baseline trên nhiều kỳ có giá trị nghiên cứu hơn.

---

# 21. CALIBRATION

Nếu hệ thống đưa confidence:

```text
20%
50%
80%
```

hãy kiểm tra calibration.

Ví dụ:

Những prediction ghi 80% confidence có đúng khoảng 80% không?

Nếu không:

> confidence là pseudo-confidence.

Áp dụng:

- reliability diagram
- Brier score
- log loss

khi phù hợp.

---

# 22. ALGORITHM MATURITY SCORE

Chấm từng subsystem:

### L0
Idea only.

### L1
Implemented nhưng chưa kiểm chứng.

### L2
Unit tested.

### L3
Backtested.

### L4
Out-of-sample validated.

### L5
Prospectively validated trên dữ liệu tương lai chưa tồn tại tại lúc algorithm freeze.

Đặc biệt:

> Không được gọi một lottery algorithm là mature chỉ vì nó backtest tốt.

---

# 23. CODE QUALITY & PRODUCTION AUDIT

Kiểm tra thêm:

- Type safety
- schema validation
- deterministic reproducibility
- seeding
- logging
- experiment ID
- model/version tracking
- data version
- parameter version
- artifact provenance
- cache contamination
- concurrency
- idempotency
- CI
- unit tests
- integration tests
- E2E tests

Mỗi prediction / experiment lý tưởng phải truy được:

```text
prediction
→ algorithm version
→ parameters
→ source data cutoff
→ dataset hash
→ generatedAt
→ result
```

---

# 24. REQUIRED OUTPUT

Trả kết quả theo thứ tự sau.

## I. EXECUTIVE VERDICT

- Repo đang ở mức độ hoàn thiện bao nhiêu /100?
- Research readiness?
- Algorithm maturity?
- Production maturity?
- Statistical validity?

---

## II. REAL ARCHITECTURE

Mermaid diagram + mô tả.

---

## III. ALGORITHM MAP

Liệt kê thuật toán thực sự tồn tại.

---

## IV. MATURITY MATRIX

| Module | Implementation | Statistical validation | Production maturity | Score |

---

## V. TOP FINDINGS

Ít nhất:

- P0
- P1
- P2
- P3

Mỗi finding phải dẫn source code cụ thể.

---

## VI. ALGORITHM BLIND SPOTS

Tập trung vào:

- data leakage
- overfitting
- hidden heuristics
- correlated agents
- scoring problems
- confidence problems
- stopping conditions
- missing baselines

---

## VII. REVERSE VALIDATION DESIGN

Thiết kế backtesting framework hoàn chỉnh.

---

## VIII. LOTTERY/PROBABILITY AUDIT

Chỉ thực hiện nếu source hiện tại thực sự có module phù hợp.

Bao gồm:

- random baseline
- Monte Carlo
- walk-forward
- negative controls
- ablation
- statistical significance
- multiple-testing correction

---

## IX. TOP 10 ALGORITHM IMPROVEMENTS

Xếp theo:

```text
Expected Value
=
Impact × Evidence × Feasibility
/
Complexity
```

---

## X. KEEP / MODIFY / REMOVE / REPLACE

Cho từng subsystem.

---

## XI. PROPOSED V2 ALGORITHM

Thiết kế lại architecture.

Không chỉ nói.

Cung cấp:

- data structures
- state
- algorithms
- pseudocode
- module boundaries
- validation loop
- stopping conditions

---

## XII. EXPERIMENT ROADMAP

### Experiment 1
Baseline.

### Experiment 2
Reverse validation.

### Experiment 3
Ablation.

### Experiment 4
Monte Carlo.

### Experiment 5
Holdout.

### Experiment 6
Prospective test.

---

## XIII. FINAL VERDICT

Chọn một:

### A — KEEP CURRENT CORE
Core algorithm tốt, chỉ cần bổ sung.

### B — KEEP BUT REFACTOR
Ý tưởng đúng, implementation cần sửa.

### C — ALGORITHM REDESIGN REQUIRED
Kiến trúc có vấn đề căn bản.

### D — RESEARCH HYPOTHESIS NOT SUPPORTED
Không tìm thấy predictive information đủ mạnh.

---

# 25. CRITICAL SCIENTIFIC RULE

Không được biến backtest thành một màn trình diễn.

Mọi kết luận phải phân biệt:

```text
OBSERVED
INFERRED
HYPOTHESIS
VALIDATED
NOT VALIDATED
```

Nếu không tìm thấy bằng chứng rằng historical lottery data chứa predictive signal:

**hãy nói thẳng rằng chưa tìm thấy.**

Không được cố tạo “thuật toán dự đoán” chỉ để hoàn thành nhiệm vụ.

Một kết luận:

> “Không có evidence cho predictive edge”

là một kết quả nghiên cứu hợp lệ.

---

# 26. FINAL CHALLENGE

Sau khi thiết kế thuật toán cải tiến, hãy cố gắng **phá chính thuật toán mình vừa đề xuất**.

Tạo ít nhất 5 adversarial experiments.

Nếu thuật toán thất bại:

- ghi nhận thất bại;
- giải thích nguyên nhân;
- sửa;
- test lại.

Mục tiêu cuối không phải:

> tạo thuật toán trông thông minh.

Mục tiêu là:

> **tạo một hệ thống mà mọi claim về predictive power đều có thể bị kiểm chứng, tái hiện và bác bỏ nếu sai.**