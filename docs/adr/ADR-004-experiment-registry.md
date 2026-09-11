# ADR-004: Experiment registry and artifact

## Status
Accepted, implemented.

## Context
Before this work, a walk-forward backtest (`runTemporalBacktestReport`)
produced numbers on demand but nothing was ever registered or persisted as
an immutable, provenance-tagged record. §24/§25 require a registry
(experimentId, hypothesisId, familyId, strategy, seed, dataset hash,
protocol version, status) and an artifact per completed experiment
(git commit, dataset hash, protocol hash, strategy, seed, temporal split,
metrics, statistics, controls, runtime).

## Decision
- `lib/research/experiments.ts` is pure logic (no filesystem), mirroring
  the existing `sync.ts`/`persistence.ts` split in `lib/data/`:
  `registerExperiment()` and `transitionExperiment()` manage the
  `REGISTERED → COMPLETED/FAILED/INVALIDATED` lifecycle;
  `buildExperimentArtifactsFromReport()` repackages an *already-computed*
  `TemporalBacktestReport`'s TEST-phase numbers with provenance — it does
  not recompute or reinterpret any statistic, so the artifact cannot drift
  from what the (separately tested) walk-forward engine actually produced.
- Storage is plain JSONL (`reports/experiments/registry.jsonl`, append-only)
  plus one JSON file per artifact — no database, per §24's explicit
  guidance not to introduce one without need.
- `scripts/run-experiment.ts` is the Node-only wiring: loads the real
  canonical dataset, computes the protocol hash, runs the walk-forward
  report once, registers+completes one experiment per non-RANDOM strategy
  under `familyId = "protocol-<version>-primary-strategies"`, and writes
  both the registry entries and the artifacts.

## Evidence
A real run against the live 1561-record dataset (committed):

```
familyId:      protocol-2026-09-10.1-primary-strategies
protocolHash:  089e16b90b1d168e69142faf678b5bc66e831310cf99b30c4f0db259c27badef
datasetHash:   8e26f348a8b241865facc7cfe690fbc428615b9b45ffc9732709a6267039c24e
HOT        edge(test)=-0.017 p=0.666 adj.p=1.000
COLD       edge(test)=-0.028 p=0.753 adj.p=1.000
BALANCED   edge(test)=0.018 p=0.327 adj.p=0.981
```

No demonstrated edge on the TEST holdout for any strategy — the expected,
scientifically valid result per the lab's default hypothesis (§3).

## Consequences
- `familyId` exists and is recorded on every experiment, but `analytics.ts`'s
  live Holm-Bonferroni correction is not yet wired to read the full
  historical family from the registry — it still corrects only across the
  strategies visible in the current run. Extending it to consult
  `registry.jsonl` for the whole family history is listed as deferred work.
- `gitCommit` is captured via `git rev-parse HEAD` at run time on a
  best-effort basis (`null` if not in a git checkout); it is not itself
  part of the protocol hash.
