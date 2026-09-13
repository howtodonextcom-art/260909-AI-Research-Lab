# Capability → UI Exposure Matrix — Production Upgrade Round (supersedes 26-09-13-17-32's version)

Scope of this update (Sub-Agent C — Frontend UX / a11y / product clarity / prune, Round: Production Upgrade
Combined Program + Round 6 §5/§30): the Research tab's information architecture, the anti-automation-bias toggle,
and the Scientific Verdict copy. No engine/statistics module changed. Rows below are unchanged from the prior
matrix unless noted; only IA/exposure-relevant deltas are called out in full.

| Capability | Source module | Active call path | UI location | Exposure class | Tests | Runtime verified |
|---|---|---|---|---|---|---|
| Protocol lock | `lib/research/protocol.ts`, `scripts/research-lock.ts` | `research:lock` CLI | "Trạng thái bộ dữ liệu" panel + Capability Inspector, now also reachable via `ResearchNav` → "Dữ liệu" | END_TO_END | `protocol.test.ts` | Yes |
| Experiment registry | `lib/research/experiments.ts`, `scripts/run-experiment.ts` | `research:experiment` CLI | "Sổ điểm thực nghiệm" + Capability Inspector, now also reachable via `ResearchNav` → "Bằng chứng" | READ_ONLY | `experiments.test.ts` | Yes |
| Provenance verifier | `lib/research/provenance-registry.ts`, `scripts/verify-provenance.ts` | `research:verify-provenance` CLI, CI | Capability Inspector | OPERATOR_GATED | `provenance-registry.test.ts` | Yes |
| Prospective freeze/append + hash chain | `lib/research/prospective.ts`, `scripts/research-prospective.ts` | CLI | Chain-health line in "Sổ điểm thực nghiệm", reachable via `ResearchNav` → "Bằng chứng" | mutation OPERATOR_GATED, status READ_ONLY | `prospective.test.ts`, `prospective-summary.test.ts` | Yes |
| Bao-18 reverse-proof audit | `lib/research/bao18-walkforward.ts`, `scripts/audit-bao18-walkforward.ts` | `research:bao18-audit` → `research:bao18-summary` | Bao-18 panel, now **one anchor click away** via `ResearchNav` → "Bao-18" instead of requiring a full-page scroll past the frequency matrix + two evidence tables | READ_ONLY | `bao18-walkforward.test.ts`, `bao18-summary.test.ts` | Yes |
| Ablation harness | `lib/research/ablation.ts` | `research:ablation-summary` CLI | Diagnostics panel, now reachable via `ResearchNav` → "Chẩn đoán" | READ_ONLY | `ablation-summary.test.ts` | Yes |
| Portfolio Monte Carlo | `lib/research/portfolio-mc.ts` | `research:portfolio-mc-summary` CLI | Diagnostics panel, reachable via `ResearchNav` → "Chẩn đoán" | READ_ONLY | `portfolio-mc-summary.test.ts` | Yes |
| Negative controls A–F | `lib/research/negative-controls.ts`, `controls-summary.ts` | `research:controls` CLI + client-side | "Sổ điểm thực nghiệm", reachable via `ResearchNav` → "Bằng chứng" | READ_ONLY | pre-existing | Yes |
| Ranking Score scaffold | `lib/research/ranking-score.ts` | None (never called) | Capability Inspector only, single-line "STUB_NOT_PROMOTED" note | STUB_NOT_PROMOTED | contract-test-enforced zero imports (`ui-ranking-score-ban.contract.test.ts`, re-checked per-file by `ui-scientific-verdict-bao18.contract.test.ts` and `diagnostics-panel.contract.test.ts`) | Yes — re-confirmed via grep this round; **no change made** (already compliant, see "Prune findings" below) |
| Data provenance / dataset hash | `lib/data/*` | `data:check`, `data:sync` | "Trạng thái bộ dữ liệu", reachable via `ResearchNav` → "Dữ liệu" | END_TO_END | `data:test` | Yes |
| Data Explorer | `lib/data/explorer.ts` | Client-side filter | Research tab, now reachable via `ResearchNav` → "Tra cứu" instead of being the very last thing before Profit Lab | END_TO_END | `explorer.test.ts` | Yes |
| Bao-N cost frontier | `lib/research/bao.ts` | Client-side | Portfolio tab (Agent B's scope this round) | END_TO_END | `bao.test.ts` | Yes |
| Ticket Simulator | `lib/mega645.ts` | Client-side `crypto.getRandomValues` | Ticket tab | END_TO_END | `mega645.test.ts` | Yes |
| **Scientific Verdict** | `components/scientific-verdict.tsx` | Client-side | Research tab, rendered first | END_TO_END | contract tests | **Copy updated this round**: "Độ phủ danh mục" line now reads "CÓ — nhỏ nhưng chính xác" (was "Đã chứng minh bằng tổ hợp học") — precisely distinguishes the exact-but-small portfolio lift from a predictive edge, per Combined §10's `Portfolio structural advantage: YES — SMALL BUT EXACT` |
| **Research sticky nav (new)** | `components/research-nav.tsx` | Client-side, static anchor list | Research tab, immediately below Scientific Verdict | END_TO_END | `app/ui-research-nav-automation-bias.contract.test.ts` (new) | Yes — 6 anchors, each verified against a real `id` in the target file; `position: sticky` verified in `app/globals.css` |
| **Automation-bias toggle (new)** | `app/page.tsx` (`ResearchLab`'s sidebar) | Client-side `useState` | Research tab sidebar ("Ứng viên chọn từ validation") | END_TO_END | `app/ui-research-nav-automation-bias.contract.test.ts` (new) | Yes — hidden by default (`useState(false)`), exact button label "Hiển thị bộ số thử nghiệm", exact disclaimer "Đây là output của một rule nghiên cứu, không phải dự đoán được xác nhận." shown immediately adjacent once revealed; surrounding context (strategy name, z-score, gate list, cutoff/lookback metadata) stays visible regardless of toggle state |
| Capability Inspector | `components/capability-inspector.tsx` | Static + props | Research tab, now reachable via `ResearchNav` → "Nâng cao" in addition to the pre-existing anchor link from Scientific Verdict | READ_ONLY | contract test | Yes |
| Diagnostics panel (Ablation + Portfolio-MC) | `components/diagnostics-panel.tsx` | Client-side fetch of 2 static JSONs | Research tab, reachable via `ResearchNav` → "Chẩn đoán" | READ_ONLY | `app/diagnostics-panel.contract.test.ts` | Yes |

## IA change this round (Round 6 §5 / Combined §30 — Variant A "Verdict-first Production IA")

Implemented **directly** (no separate Variant B build needed — see self-scored A/B checklist in the final report).
Research tab order is unchanged (Verdict → Data → metrics → frequency → walk-forward → holdout → scorecard →
Bao-18 → Capability Inspector → Diagnostics → Explorer → Profit Lab): the dense tables were **not** collapsed
behind `<details>` this round, to avoid regression risk against Agent D's Playwright journeys that may already
assert on their default-visible DOM. Instead, a sticky `ResearchNav` (`components/research-nav.tsx`) was added
directly under the Scientific Verdict, giving 6 real `<a href="#...">` anchors (Dữ liệu / Bằng chứng / Bao-18 /
Chẩn đoán / Nâng cao / Tra cứu) that jump past the dense content in one keyboard-activatable click each, satisfying
the "≤2 clicks / 1 anchor" reachability bar without touching table visibility.

## Prune findings (Round 6 §4)

- **Ranking Score UX promotion**: re-confirmed via `grep` across `app/` and `components/` — the only UX mention is
  the single `STUB_NOT_PROMOTED` row inside `components/capability-inspector.tsx`, already contract-test-enforced.
  **No changes made**; already compliant with the "keep engine file but ensure zero UX affordance beyond a one-line
  note" default decision.
- **First-viewport competing decorative stats**: reviewed the `.metrics-grid` (4 metric cards) and the frequency
  matrix that sit between Scientific Verdict/DataStatus and the evidence tables. Judgment call: these are
  scientifically load-bearing (fairness diagnostic, gate count, per-ticket Jackpot restatement, raw frequency data),
  not decorative filler competing for attention — left in place, not demoted. The `ResearchNav` addition mitigates
  the "dense first viewport" complaint by making everything below reachable without scrolling through it, which was
  judged the lower-risk fix versus reordering scientifically meaningful panels.
- **Automation-bias surface**: the only concrete 6-number output rendered by default anywhere in the Research tab
  was the sidebar "Khảo sát kỳ tiếp theo" suggestion in `app/page.tsx`. `components/bao18-panel.tsx` already never
  lists concrete pool numbers (verified by reading its source and pre-existing header comment). Fixed by hiding the
  six-number set behind the required toggle.

## Hard-cap status this round

No new hard cap introduced. "Critical feature undiscoverable" continues to not apply: every capability above
resolves to `END_TO_END`, `READ_ONLY`, `OPERATOR_GATED`, or `STUB_NOT_PROMOTED`, and Bao-18/Diagnostics/Capability
Inspector/Data Explorer are now each one sticky-nav anchor click from the top of the Research tab instead of
requiring a manual scroll past ~2000 lines of frequency-matrix/table DOM.
