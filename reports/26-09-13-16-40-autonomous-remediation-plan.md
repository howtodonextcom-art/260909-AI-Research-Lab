# Autonomous Remediation Plan — Round 4

**Mission:** `prompts/MASTER PROMPT - Claude Code Autonomous Multi-Agent Research Lab Remediation to Verified 100/100.md`
**Baseline HEAD:** `4e800aa255e81e3eb5b8becbba60d8ca23089cf9` (clean tree)
**Method:** 3 parallel background sub-agents (A: Provenance & Research Integrity, B: Statistical & Algorithmic/Bao-18, C: UI/Product Integration) plus the lead session acting as independent cold auditor and completing interrupted work. A 4th dedicated "Test/Browser MCP/Red-Team" agent was not spawned separately; that role was performed directly by the lead session (real Browser MCP sessions, live CLI re-runs, adversarial fixture construction, and the cross-referencing that found the test-discovery gap below) rather than delegated, since the lead has full conversation context and the established discipline of this project has always been to independently re-verify every sub-agent claim rather than trust it.

## Baseline (Phase 0)

- `npm run typecheck / test:business / data:test / lint / data:check / build` all green before starting.
- Known findings carried in from the master prompt (§2) and from this project's own prior rounds' "Remaining risks" sections.

## Sub-agent execution

All 3 agents were launched in parallel with disjoint file ownership (documented in each agent's own prompt) to reduce confirmation bias per the master prompt's explicit design. **Agents A and C were interrupted mid-task by a platform session rate limit** (reset 4:20pm ICT) and reported `status: failed`, not `completed`. Rather than blindly re-spawning fresh agents (expensive, and risks losing the substantial real work already on disk), the lead session:

1. Inspected `git status`/`tsc --noEmit` to assess exactly how much of each interrupted agent's work was salvageable.
2. Found both agents had done nearly all of their substantive work — only a handful of small, mechanical issues remained (a missing import, a wrong draw-id in one test fixture).
3. Fixed those directly, then **took over the remaining verification/completion work personally** (running gates, doing adversarial testing, running a real Browser MCP pass), rather than re-running whole agents for marginal remaining scope.
4. In the course of that verification, found and fixed **one additional, real, previously-undiscovered defect** neither agent's brief specifically named: `scripts/run-experiment.ts` silently regenerated artifact files on every run using the then-current protocol hash, even for experiment ids already frozen in the registry — a live instance of exactly the class of bug the mission was auditing for. See the provenance report for the full account.

## Findings and root causes (selected, most significant)

| Finding | Root cause | Fix |
|---|---|---|
| Bao-18 audit mixed scientific identity with git/build provenance | `experimentSpecHash` was computed over an object that included `gitHead` | Split into `scientificSpec`/`scientificSpecHash` (research inputs only) and `buildProvenance` (git/timestamp), with a test proving a build-only change can't move the hash |
| `pairedSignFlipTest`'s `ciLower/ciUpper` were mislabeled as a CI | They were percentiles of a null-randomization distribution, not a valid CI for the true effect | Renamed to `nullRandomizationLower/Upper`; added a genuinely valid `pairedBootstrapCI` alongside it, both clearly labeled |
| Bao-18 report claimed anti-leak tests passed without the CLI ever checking | No evidence gate existed | CLI now spawns the real test file as a child process and fails closed if it doesn't exit 0; embeds real evidence (test file hash, exit code, pass count) in the artifact |
| Registry ↔ artifact protocol-hash drift possible with no detection | No cross-file invariant checker existed | New `scripts/verify-provenance.ts` + pure `lib/research/provenance-registry.ts`, wired into CI |
| Prospective ledger scoring mutated an existing JSONL line in place | `cmdAppendResult` rewrote the whole file | Redesigned to an append-only, hash-chained event log (FROZEN/SCORED events); legacy pre-chain lines recognized honestly as `LEGACY_UNCHAINED`, never retroactively faked into the chain |
| **(found during verification, not in either agent's brief)** `run-experiment.ts` silently overwrote artifact files on every run | Artifact-writing loop ran unconditionally for every strategy, independent of whether the strategy was newly registered | Artifacts are now written only the first time an experimentId is registered; verified live (byte-identical hashes before/after a real re-run) |
| Test discovery: 2 real orphaned test files + 1 phantom (listed but never written) | `node --test` silently ignores nonexistent file args; `package.json` lists are hand-maintained with no cross-check | New `scripts/verify-test-discovery.ts`, wired as the first step of `npm test`; wrote the missing `provenance-registry.test.ts`, wired the 2 orphans (`lib/data/explorer.test.ts`, `lib/research/prospective-summary.test.ts`) into their correct suites |
| Beginner-readable scientific verdict absent from the UI | Never built | New `components/scientific-verdict.tsx`, rendered first in the Research tab, before any jargon |
| Bao-18 engine had no UI representation | Never built | New `components/bao18-panel.tsx` + `scripts/export-bao18-summary.ts` (same fetch-a-static-JSON pattern as the existing `experiment-scorecard.tsx`) |
| No single place inventories every capability's exposure status | Never built | New `components/capability-inspector.tsx` |

## Rejected alternatives

- **Rewriting `reports/experiments/registry.jsonl` or the mismatched artifact files to make them agree.** Rejected: both are supposed to be immutable/append-only; silently editing either to "fix" the disagreement would be exactly the "rewrite history to hide a provenance problem" the master prompt forbids. Used an explicit, reviewed exception file instead (see provenance report).
- **A Clopper-Pearson-style closed-form quantile inversion via the incomplete beta function for the paired-effect CI.** Considered by Agent B implicitly; the simpler, lower-risk, equally valid fix (paired bootstrap) was chosen for the NEW statistic, while the exact-binomial Clopper-Pearson already in place for the primary `poolHit6` endpoint (unrelated to this specific mislabeling) was left untouched since it was already correct.
- **Spawning a literal 4th "Sub-Agent D" for QA/red-team.** Rejected in favor of the lead performing this role directly — avoids another full agent-context-establishment cost for work the lead is already positioned to do with full mission context, and matches this project's established norm of the orchestrator always independently re-verifying rather than trusting a report.

## Implementation order actually followed

1. Fixed the two mechanical breaks left by the rate-limit interruption (missing imports, wrong test fixture draw id).
2. Ran the full gate to establish a real, confirmed-green baseline before trusting any agent's own claims.
3. Ran the new `verify-provenance.ts` — this is what surfaced the real historical registry/artifact mismatch.
4. Root-caused and fixed `run-experiment.ts`'s silent-overwrite bug.
5. Constructed `protocol-history.json` and `provenance-exceptions.json` as honest migration/exception records (never editing the original registry or artifacts).
6. Found and closed the test-discovery gap (orphans + phantom).
7. Independently re-ran the full gate, the provenance verifier, the live prospective CLI (byte-for-byte unchanged), and a real Browser MCP session at desktop (1440×900) and mobile (390×844).
8. Wrote this report set.

See `reports/26-09-13-16-40-research-provenance-integrity.md`, `reports/26-09-13-16-40-capability-ui-exposure-matrix.md`, `reports/26-09-13-16-40-browser-mcp-acceptance.md`, and `reports/26-09-13-16-40-verified-100-scorecard.md` for the detailed evidence behind each claim above.
