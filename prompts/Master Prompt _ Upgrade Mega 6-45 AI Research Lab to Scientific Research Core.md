# MASTER EXECUTION PROMPT
## Mega 6/45 Research Lab — Scientific Core Upgrade

You are operating as a:

**Principal Research Engineer + Applied Statistician + Senior Python/TypeScript Engineer + Data Reliability Engineer + Software Architect + Test Engineer.**

You have full access to the local repositories and development environment.

Your job is NOT to produce another audit.

Your job is to **implement the remediation completely, prove it by source + tests + runtime evidence, and leave the repository in a materially stronger research state.**

---

# 0. REPOSITORIES

## PRIMARY REPOSITORY — KEEP AND UPGRADE

```text
https://github.com/howtodonextcom-art/260909-AI-Research-Lab
```

This is the only repository that will continue as the active Research Lab.

## DONOR / REFERENCE REPOSITORY

```text
https://github.com/howtodonextcom-art/260911-AI-Research-Lab-Python
```

This repository contains useful official Vietlott ingestion logic and a more complete historical dataset.

It is a **donor/reference only**.

Do NOT turn both repositories into parallel research platforms.

Do NOT create two competing implementations.

Final architecture must converge on:

> `260909-AI-Research-Lab` = single source of truth for research.

---

# 1. DECISION ALREADY MADE

The architecture decision is final:

```text
KEEP: 260909-AI-Research-Lab
DONOR: 260911-AI-Research-Lab-Python
```

Do NOT reopen the technology-selection discussion.

Do NOT propose migrating the whole application to Python.

Do NOT rewrite the entire project unnecessarily.

Preserve good existing architecture.

Improve the research core surgically.

---

# 2. PRIMARY OBJECTIVE

Upgrade `260909-AI-Research-Lab` from an early research MVP into a scientifically defensible experimental platform for Mega 6/45.

The upgraded system must improve these four pillars:

```text
DATA TRUTH
    ↓
EXPERIMENTAL INTEGRITY
    ↓
STATISTICAL CORRECTNESS
    ↓
REPRODUCIBILITY
```

The system must become harder for its own developers to accidentally fool themselves.

---

# 3. SCIENTIFIC PRINCIPLE

The default hypothesis is:

\[
H_0:
\text{No strategy has predictive advantage over a fair random Mega 6/45 process}
\]

The platform is NOT built to force discovery of a winning strategy.

A perfectly valid research result is:

```text
NO DEMONSTRATED EDGE
```

Never alter methodology merely because a strategy performs poorly.

Never optimize toward a desired conclusion.

---

# 4. NON-NEGOTIABLE ENGINEERING RULES

Follow these rules throughout implementation.

## 4.1 Source code is truth

README/comments are secondary.

Before modifying anything:

```text
inspect source
→ reconstruct runtime
→ identify dependency
→ modify
→ test
→ prove
```

---

## 4.2 Preserve working behavior

Do not destroy:

- current UI
- existing data status functionality
- walk-forward behavior
- portfolio optimizer
- current working tests
- existing user workflows

unless replacement is necessary and demonstrably superior.

---

## 4.3 No speculative architecture

Do not introduce:

- microservices
- Kafka
- distributed systems
- Kubernetes
- vector databases
- LLM agents
- machine learning
- neural networks

unless a current requirement genuinely needs them.

This is a research laboratory, not an architecture showcase.

---

## 4.4 No silent failures

For all data/research paths:

```text
ambiguous state
→ FAIL CLOSED
```

Never silently:

- truncate history
- drop malformed draws
- overwrite conflicts
- accept parser failure as EOF
- replace good dataset with suspicious dataset
- turn NaN into zero
- swallow statistical errors

---

# 5. PRE-IMPLEMENTATION BASELINE

Before editing code, perform a baseline inspection.

Record:

```text
git commit
branch
Node version
package manager
current test count
current test result
current dataset record count
first draw
latest draw
dataset hash
current research protocol version
```

Run all existing tests.

Do not proceed with major refactor until current failures are classified as:

```text
PRE-EXISTING
or
INTRODUCED
```

Create:

```text
reports/research-core-upgrade-baseline.md
```

Include all baseline facts.

---

# 6. TARGET DATA ARCHITECTURE

Replace the current dependency on the third-party historical mirror as the primary source.

New hierarchy:

```text
PRIMARY
Vietlott official website
        ↓

SECONDARY / CROSS-CHECK
existing vietlott-data GitHub mirror
```

The official Vietlott source must become authoritative.

The mirror may remain for:

- cross-check
- fallback diagnostics
- provenance comparison

but not authoritative overwrite.

---

# 7. PORT OFFICIAL VIETLOTT INGESTION

Use the donor repository as reference:

```text
260911-AI-Research-Lab-Python
```

Study its:

```text
vietlott_mega645/client.py
vietlott_mega645/storage.py
vietlott_mega645/cli.py
tests/
```

Port the useful ideas into the TypeScript codebase.

Do NOT blindly translate line by line.

Build a native TypeScript implementation matching the architecture of the primary repo.

Recommended structure:

```text
lib/data/sources/
    vietlott-official.ts
    vietlott-mirror.ts
    source-adapter.ts
```

The official adapter should support:

```text
fetch latest draw
fetch individual draw
fetch history page
fetch full history
```

where technically practical.

---

# 8. OFFICIAL PARSER HARDENING

The donor parser has a dangerous failure mode:

```text
HTML structure changes
→ parser returns zero rows
→ crawler may interpret as end-of-history
```

This must NOT survive the port.

Implement explicit parser semantics.

Example:

```text
PARSE_SUCCESS
PARSE_EMPTY_VALID_PAGE
PARSE_STRUCTURE_CHANGED
FETCH_FAILED
```

A historical page expected to contain draws but yielding zero parsable rows must generally be treated as:

```text
PARSE_STRUCTURE_CHANGED
```

not EOF.

Define explicit end-of-pagination conditions.

Do not infer EOF merely from:

```text
records.length === 0
```

unless the upstream protocol proves that behavior.

---

# 9. DATA COMPLETENESS

The canonical Mega 6/45 history currently begins:

```text
#00001
2016-07-20
```

The system must detect missing historical draws.

Add continuity analysis.

Expected output example:

```json
{
  "firstId": "00001",
  "latestId": "01561",
  "recordCount": 1561,
  "missingIds": [],
  "duplicateIds": [],
  "conflicts": []
}
```

Do NOT blindly assume every integer ID corresponds to a valid Mega draw forever.

Implement continuity using verified known range/protocol logic.

If draw numbering rules have edge cases, encode them explicitly and document them.

---

# 10. DATASET INVARIANTS

Every accepted draw must satisfy:

```text
valid ISO calendar date
non-empty draw ID
exactly 6 numbers
integer values
all unique
1 <= n <= 45
```

Dataset-level invariants:

```text
unique ID
canonical order
no unresolved conflicts
no unexpected backwards coverage
dataset hash available
source provenance available
continuity status available
```

---

# 11. CROSS-SOURCE VERIFICATION

Implement spot-checking between:

```text
official historical table
official detail page
secondary mirror
```

At minimum support deterministic samples:

```text
first draw
latest draw
middle draw
N seeded random draw IDs
```

For every sampled draw compare:

```text
ID
date
numbers
```

Any mismatch must generate a structured verification failure.

Do not automatically overwrite either side.

---

# 12. CANONICAL DATASET

Replace the currently incomplete primary snapshot with the full validated dataset.

Expected historical coverage should begin at draw:

```text
#00001
2016-07-20
```

and extend through the latest official draw available at sync time.

The application must NOT hardcode:

```text
01561
2026-09-11
1561 records
```

Those are current observations, not permanent constants.

---

# 13. MANIFEST V2

Upgrade dataset manifest.

Recommended fields:

```json
{
  "schemaVersion": 2,
  "product": "mega645",

  "recordCount": 0,
  "firstDrawId": "",
  "firstDrawDate": "",
  "latestDrawId": "",
  "latestDrawDate": "",

  "datasetSha256": "",

  "source": {
    "primary": {},
    "secondary": {}
  },

  "sync": {
    "attemptedAt": "",
    "successfulAt": ""
  },

  "validation": {
    "valid": true,
    "duplicates": 0,
    "conflicts": 0,
    "rejected": 0,
    "missingIds": []
  },

  "crossCheck": {
    "status": "",
    "sampleSize": 0
  }
}
```

Keep migration compatibility if reasonable.

---

# 14. ATOMIC STORAGE

Current snapshot/manifest writes are individually atomic.

Improve consistency so readers do not accidentally associate a new dataset with an old manifest or vice versa.

Design a practical transaction-like approach for a local filesystem.

Possible direction:

```text
write dataset.tmp
write manifest.tmp
fsync where practical
rename dataset
rename manifest
```

or use versioned snapshot directories + pointer file.

Do not overengineer.

Explain chosen guarantees in code comments.

---

# 15. RESEARCH CORE REFACTOR

The current `analytics.ts` contains too many responsibilities.

Split the research core.

Target direction:

```text
lib/research/
    strategies.ts
    walk-forward.ts
    temporal-split.ts
    statistics.ts
    baseline.ts
    protocol.ts
    experiments.ts
    types.ts
```

Exact names may vary.

Do not refactor purely for aesthetics.

Every extraction must improve:

```text
testability
auditability
research extensibility
```

---

# 16. STRATEGY INTERFACE

Create a reusable strategy contract.

Example concept:

```ts
type StrategyDefinition = {
  id: string;
  version: string;
  description: string;
  generate(history, context): Ticket;
};
```

Existing strategies:

```text
RANDOM
HOT
COLD
BALANCED
```

must use this interface.

Strategy implementation must never receive future draws.

Design the API so future leakage becomes structurally difficult.

For example:

```ts
generate(historyBeforeTarget, context)
```

not:

```ts
generate(allDraws, targetIndex)
```

---

# 17. KEEP WALK-FORWARD GUARANTEE

Preserve and strengthen:

```text
prediction at t
may only use
D1 ... D(t-1)
```

Existing implementation already largely respects this.

Add stronger tests.

Required mutation test:

```text
mutate target/future draws
→ historical prediction before those draws must not change
```

Required future-block test:

```text
mutate entire TEST phase
→ selected validation candidate unchanged
```

---

# 18. PRIMARY ENDPOINT

Explicitly define the primary statistical endpoint.

Recommended:

```text
mean matched numbers per ticket
```

because its null distribution is analytically tractable.

Under fair Mega 6/45:

\[
E[X]=6\times\frac{6}{45}=0.8
\]

where \(X\) is number of matches for a fixed ticket.

Document this.

Secondary endpoints may include:

```text
P(matches >= 3)
P(matches >= 4)
fixed-prize payout
ROI excluding jackpot
```

Do NOT switch the primary endpoint after observing results.

---

# 19. REPLACE WEAK RANDOM BASELINE AS PRIMARY NULL

Current implementation averages 32 seeded random tickets per draw.

Keep this as a sanity-control if useful.

But do NOT make it the only statistical null.

For a fair 6/45 draw, the match distribution is known:

\[
P(X=k)=
\frac{
\binom{6}{k}
\binom{39}{6-k}
}{
\binom{45}{6}
}
\]

Implement an exact analytical null model.

Use it for:

```text
expected matches
variance
tail probabilities
expected prize frequency
```

---

# 20. MONTE CARLO NULL ENGINE

Add reproducible Monte Carlo support.

Requirements:

```text
explicit seed
explicit simulation count
deterministic output
bounded runtime
artifact captures seed
```

Use it for tests whose exact analytical distribution is inconvenient.

Do not use unseeded randomness inside research evaluation.

---

# 21. CHI-SQUARE FIX

The current naive interpretation:

```text
Q ≈ χ²(44)
expected Q ≈ 44
```

is not strictly correct because each Mega draw samples six numbers without replacement and number counts are negatively correlated.

Do NOT continue presenting the current statistic as a conventional independent-category chi-square without qualification.

Implement either:

## Preferred

Monte Carlo null calibration:

```text
simulate fair Mega 6/45 datasets
compute same statistic
compare observed statistic to empirical null
```

or, if mathematically justified and tested, a finite-population correction.

UI should display something like:

```text
Fairness diagnostic
Observed statistic
Monte Carlo p-value
Simulation count
Seed
```

Avoid language implying prediction.

---

# 22. CONFIDENCE INTERVAL / TESTING

Review current normal approximation.

Where distribution assumptions are weak, use:

```text
paired bootstrap
permutation
Monte Carlo null
exact calculation
```

depending on metric.

Prefer paired procedures because strategy and baseline are evaluated against the same draw sequence.

Do not automatically use a z-test just because sample size is moderate.

Document each test's null hypothesis.

---

# 23. MULTIPLE TESTING

Keep Holm-Bonferroni support.

But move multiple-testing control from:

```text
only currently visible strategies
```

to the experiment/hypothesis registry.

The correction family must be explicit.

For example:

```text
family_id = "protocol-2026-09-12-primary-strategies"
```

Every hypothesis in a family must be counted.

---

# 24. EXPERIMENT REGISTRY

Create an experiment registry.

Minimum fields:

```text
experimentId
hypothesisId
familyId
strategyId
strategyVersion
parameters
seed
datasetHash
protocolVersion
registeredAt
status
```

Statuses may include:

```text
REGISTERED
RUNNING
COMPLETED
FAILED
INVALIDATED
```

Experiments should be registered before results are evaluated.

Storage can initially be:

```text
JSON
JSONL
or lightweight local persistence
```

Do not introduce a database without need.

---

# 25. EXPERIMENT ARTIFACT

Every completed experiment must emit an immutable/reproducible artifact.

Minimum:

```json
{
  "experimentId": "",
  "gitCommit": "",
  "datasetSha256": "",
  "protocolVersion": "",

  "strategy": {
    "id": "",
    "version": "",
    "parameters": {}
  },

  "seed": 0,

  "temporalSplit": {
    "development": {},
    "validation": {},
    "test": {}
  },

  "metrics": {},

  "statistics": {
    "effectSize": null,
    "confidenceInterval": [],
    "pValue": null,
    "adjustedPValue": null
  },

  "controls": {},

  "runtime": {}
}
```

---

# 26. PROTOCOL FREEZE

Implement a research protocol definition.

Example:

```ts
type ResearchProtocol = {
  version: string;
  primaryEndpoint: string;
  alpha: number;
  lookback: number;
  strategies: StrategyConfig[];
  temporalSplitRule: ...
  selectionRule: ...
  multipleTestingMethod: ...
};
```

Provide a deterministic protocol hash.

If any of these change:

```text
strategy
lookback
endpoint
alpha
split
selection logic
statistical test
```

protocol version/hash must change.

---

# 27. RETROSPECTIVE VS PROSPECTIVE

Keep the current scientifically correct distinction.

Historical split:

```text
RETROSPECTIVE HOLDOUT
```

Future draws arriving after protocol freeze:

```text
PROSPECTIVE EVIDENCE
```

Implement fields that make this explicit.

Example:

```text
protocolLockedAt
protocolDatasetHash
prospectiveStartDrawId
```

Never label retrospective results as truly prospective.

---

# 28. NEGATIVE CONTROL BATTERY

This is mandatory.

Implement at least:

## Control A — IID synthetic Mega

Generate fair synthetic draw histories.

Run HOT/COLD/BALANCED.

Expected behavior:

```text
no persistent edge
false positive frequency ≈ controlled alpha
```

---

## Control B — Time shuffle

Shuffle chronological order of historical draws.

If a temporal strategy still shows identical “signal”, investigate.

---

## Control C — Random strategy

Uniform random strategy must behave like null expectation.

---

## Control D — Future mutation

Mutating future data must not alter historical predictions.

---

# 29. PROPERTY TESTS

Add property-based/invariant-style tests.

Examples:

```text
every strategy returns 6 unique integers in [1,45]

random strategy distribution is approximately uniform

sum of exact match probabilities = 1

expected matches = 0.8

portfolio intersection <= 1

portfolio covered pairs = tickets × C(6,2)

mutating future draws cannot change earlier predictions

dataset serialization is deterministic

dataset hash changes if any draw changes
```

No need to add a heavy property-testing framework unless justified.

Loop-generated tests are acceptable.

---

# 30. PORTFOLIO ALGORITHM

Preserve the existing projective-plane construction.

It is a valuable mathematically defensible component.

Keep proof/invariant:

```text
pairwise ticket intersection <= 1
```

This implies events:

```text
ticket_i matches >=4
ticket_j matches >=4
```

cannot simultaneously occur for a six-number draw.

Therefore linear portfolio coverage for ≥4 matches is valid under this design.

Document this proof clearly.

Do NOT generalize:

```text
N × p
```

to arbitrary portfolios.

---

# 31. PROBABILITY API SEMANTICS

Make probability APIs explicit.

Avoid ambiguous fields such as:

```text
probabilityPortfolioLinear
```

unless exact meaning is clear.

Prefer names like:

```text
singleTicketProbability
expectedWinningTickets
exactAtLeastOneProbability
unionBound
```

Only expose `exactAtLeastOneProbability` when mathematically justified.

---

# 32. DATA SOURCE TESTS

Add fixture tests for:

```text
valid official HTML
HTML with changed wrapper
HTML containing zero result rows unexpectedly
invalid Ajax response
partial response
malformed draw
duplicate IDs
conflicting IDs
nonexistent calendar date
numbers outside 1–45
duplicate ball within draw
```

Parser failures must be explicit.

---

# 33. LIVE VERIFICATION TOOL

Create or upgrade a command such as:

```bash
npm run data:verify-live
```

It should:

```text
fetch official source
validate latest draw
spot-check deterministic sample
compare mirror if available
print structured report
exit non-zero on critical mismatch
```

Never make normal test suite dependent on live internet.

Live verification is separate.

---

# 34. DATA STATUS COMMAND

Upgrade:

```bash
npm run data:status
```

to show:

```text
source
record count
first draw
latest draw
missing IDs
duplicate count
conflict count
dataset hash
official cross-check status
last successful sync
```

Human-readable plus optional JSON output if practical.

---

# 35. UI CHANGES

Keep UI changes minimal.

The UI should expose scientific status accurately.

Recommended additions:

```text
Official Vietlott source
Dataset completeness
Dataset SHA
Protocol version
Retrospective / prospective badge
Negative control status
```

Do NOT create excessive dashboards.

Do NOT imply predictive certainty.

---

# 36. WORDING RULES

Avoid:

```text
AI predicts
winning numbers
best numbers
verified strategy
guaranteed edge
```

Prefer:

```text
research candidate
historical result
retrospective signal
prospective evidence
no demonstrated edge
```

---

# 37. PERFORMANCE

Current dataset size is small.

Do not prematurely optimize.

However design research code so a future grid such as:

```text
100 strategies
× multiple lookbacks
× Monte Carlo simulations
```

can be executed without recomputing obvious quantities unnecessarily.

Consider:

```text
rolling counts
prefix statistics
bitset representation
cached strategy-independent features
```

only where useful.

---

# 38. NO ML YET

Do NOT add machine learning in this implementation.

There is currently no demonstrated evidence that a predictive signal exists.

ML before validating a signal would mainly increase the search space and overfitting risk.

---

# 39. TEST GATES

The work is incomplete unless all relevant gates pass.

Required:

```text
npm test
npm run lint
npm run build
```

plus any project-specific commands discovered during inspection.

Run all new research tests.

Run data integrity verification against local snapshot.

Run live verification if network is available.

If network is unavailable:

```text
mark LIVE VERIFICATION = NOT EXECUTED
```

Do not fake success.

---

# 40. REGRESSION REQUIREMENT

Existing behavior must remain valid unless deliberately superseded.

Before finishing, compare:

```text
baseline tests
vs
final tests
```

Report:

```text
tests before
tests after
new tests
removed tests
reason for removal if any
```

Removing tests simply to make CI green is forbidden.

---

# 41. DOCUMENTATION

Update documentation only after implementation works.

README should explain:

```text
data source
data validation
walk-forward methodology
retrospective vs prospective
primary endpoint
multiple testing
negative controls
experiment registry
limitations
```

Do not market the platform as predicting lottery results.

---

# 42. ARCHITECTURE DECISION RECORD

Create:

```text
docs/adr/
```

or equivalent.

At minimum write:

```text
ADR-001-official-vietlott-source.md
ADR-002-research-protocol.md
ADR-003-statistical-null-model.md
ADR-004-experiment-registry.md
```

Keep ADRs concise and evidence-based.

---

# 43. FINAL REPORT

Create:

```text
reports/research-core-upgrade-final.md
```

Required sections:

```text
Executive summary
Baseline
Changes implemented
Architecture before/after
Data provenance
Dataset completeness
Statistical changes
Negative controls
Experiment registry
Protocol freeze
Tests
Runtime verification
Known limitations
Deferred work
```

---

# 44. SOURCE → RUNTIME → IMPACT EVIDENCE

For every major remediation, prove:

```text
SOURCE
→
TEST / RUNTIME
→
OBSERVED RESULT
→
IMPACT
```

Example:

```text
Finding:
Official parser previously could interpret zero parsed rows as EOF.

Source:
lib/data/sources/vietlott-official.ts

Fix:
explicit ParseStructureChanged error

Test:
official parser empty-structure fixture

Runtime:
test fails before fix, passes after fix

Impact:
silent dataset truncation prevented
```

---

# 45. ACCEPTANCE CRITERIA

The task is complete only when all of the following are true.

## DATA

```text
[ ] official Vietlott is primary source
[ ] mirror is secondary
[ ] full available history imported
[ ] continuity analysis implemented
[ ] missing IDs surfaced
[ ] duplicate/conflict detection works
[ ] cross-source spot-check works
[ ] dataset SHA stored
[ ] suspicious parser zero-results fail closed
```

## RESEARCH

```text
[ ] strategy interface exists
[ ] walk-forward preserved
[ ] no-future mutation test passes
[ ] primary endpoint explicitly defined
[ ] analytical/null model implemented
[ ] chi-square diagnostic corrected/replaced
[ ] multiple-testing family explicit
```

## REPRODUCIBILITY

```text
[ ] experiment registry implemented
[ ] experiment artifacts implemented
[ ] seeds captured
[ ] dataset hash captured
[ ] git commit captured where practical
[ ] protocol hash/version exists
```

## SCIENTIFIC CONTROLS

```text
[ ] synthetic IID control
[ ] shuffle control
[ ] random baseline control
[ ] future mutation control
```

## SOFTWARE

```text
[ ] tests pass
[ ] lint passes
[ ] build passes
[ ] no major regression
```

---

# 46. PRIORITY ORDER

Execute in this exact priority:

```text
P0. Baseline
P0. Official data ingestion
P0. Complete dataset
P0. Data integrity/continuity
P0. Statistical correctness

P1. Research core refactor
P1. Experiment registry
P1. Protocol freeze
P1. Negative controls

P2. UI scientific status
P2. Documentation
P2. Performance cleanup

P3. Future commercialization preparation
```

Do NOT spend time polishing UI while a P0 scientific issue remains.

---

# 47. BOUNDED AUTONOMY

You are authorized to:

```text
inspect repository
edit files
create files
refactor modules
run tests
run lint
run build
run local scripts
use official public Vietlott endpoints
use Git history
compare donor repository
```

You are NOT authorized to:

```text
delete major functionality without evidence
rewrite the entire project
change repository strategy
introduce paid services
introduce secrets
deploy production
purchase infrastructure
push destructive history rewrites
force-push
```

---

# 48. CHECKPOINT POLICY

Do not stop after every small task.

Work autonomously through related groups.

Use checkpoints only after meaningful milestones:

```text
Checkpoint 1:
Baseline + architecture reconstruction

Checkpoint 2:
Official data layer complete

Checkpoint 3:
Statistical core complete

Checkpoint 4:
Experiment/protocol/controls complete

Checkpoint 5:
Full verification complete
```

At each checkpoint record findings in the final report.

Do NOT wait for human approval unless a truly destructive/irreversible decision is required.

---

# 49. GIT POLICY

Prefer small coherent commits.

Suggested commit sequence:

```text
chore: capture research lab baseline

feat(data): add official Vietlott source adapter

feat(data): add continuity and cross-source verification

data: replace incomplete Mega 6/45 snapshot

refactor(research): isolate strategy and walk-forward core

feat(stats): add exact null and calibrated fairness diagnostics

feat(research): add experiment registry and protocol hashing

test(research): add negative-control battery

docs: document scientific protocol and limitations
```

Do not create meaningless micro-commits.

Do not squash evidence away during implementation.

---

# 50. STOP CONDITIONS

Stop and flag instead of guessing if:

```text
official source contradicts itself
historical draw cannot be verified
Vietlott changes product numbering semantics
official source requires authentication/CAPTCHA
data license creates a material redistribution concern
```

Research integrity is more important than finishing a checkbox.

---

# 51. FINAL RESPONSE FORMAT

At completion respond with:

## A. VERDICT

```text
IMPLEMENTATION COMPLETE
```

or

```text
PARTIALLY COMPLETE
```

Do not say complete if critical gates failed.

## B. CHANGE SUMMARY

List only material changes.

## C. BEFORE → AFTER

Example:

```text
Data source:
mirror
→
official + verified secondary mirror
```

## D. TEST EVIDENCE

```text
tests: X passed
lint: PASS/FAIL
build: PASS/FAIL
live verification: PASS/FAIL/NOT EXECUTED
```

## E. DATA EVIDENCE

```text
first draw
latest draw
record count
missing IDs
duplicates
conflicts
dataset SHA256
```

## F. RESEARCH EVIDENCE

```text
protocol version
primary endpoint
null model
multiple-testing method
negative-control result
prospective start status
```

## G. FILES CHANGED

Only meaningful files.

## H. KNOWN LIMITATIONS

Be explicit.

## I. DEFERRED TASKS

Only items genuinely outside this implementation.

---

# 52. FINAL QUALITY BAR

Do not optimize for:

```text
more code
more modules
more features
more dashboards
```

Optimize for:

```text
less ambiguity
less leakage
less researcher freedom
better provenance
better reproducibility
better falsifiability
```

The final system should make it easier to say:

> “The strategy does not work.”

when that is what the evidence shows.

That is a successful research platform.

---

# 53. START NOW

Begin by:

```text
1. Inspect both repositories.
2. Capture baseline.
3. Run existing tests.
4. Build a concrete implementation map.
5. Start P0 remediation immediately.
```

Do not merely return a plan.

Do not stop at documentation.

Do not ask for confirmation for ordinary implementation choices.

**Execute the work, verify it, and produce evidence.**