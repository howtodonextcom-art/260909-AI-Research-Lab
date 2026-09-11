# ADR-002: Research protocol freeze and retrospective/prospective classification

## Status
Accepted, implemented.

## Context
`lib/analytics.ts` already had a scientifically sound core before this
work: a chronological development/validation/test split, a selection rule
that only reads validation (`selectCandidate`), and a `PROTOCOL_VERSION`
string. What was missing was a *frozen, hashable* protocol object that
makes it structurally obvious when any methodological choice changes
(§26), and an explicit retrospective-vs-prospective classification (§27) —
the existing code already distinguished them by label ("Test
(retrospective)") but had no machine-checkable boundary.

## Decision
`lib/research/protocol.ts` defines `ResearchProtocol` (primary endpoint,
alpha, lookback, strategy set, temporal split rule, selection rule,
multiple-testing method) and `CURRENT_PROTOCOL`, the live instance for this
lab. `computeProtocolHash()` canonicalizes the object (recursively
sorted-key JSON) and SHA-256s it — the hash changes automatically if *any*
field changes, so there is no separate manual step that could be
forgotten. `version` remains a human label; the hash is what an experiment
artifact should actually pin as the source of truth.

`CURRENT_PROTOCOL.version` is kept equal to `analytics.ts`'s existing
`PROTOCOL_VERSION` by hand rather than by import, because importing it
would create a cycle (`protocol.ts` already imports `SELECTION_RULE` from
`analytics.ts`, and `analytics.ts` does not import from `research/`). This
is a known, documented limitation — see "Known limitations" in the final
report — rather than a full merge of the two.

`classifyEvidence(drawId, lock)` implements §27: a draw counts as
`PROSPECTIVE` only if its id is at or after `lock.prospectiveStartDrawId`
(the latest known draw id at the moment the protocol was locked);
everything earlier is `RETROSPECTIVE`, regardless of which split
(development/validation/test) it falls into, because a human could already
have seen it before the protocol existed. `ProtocolLock` is defined but not
yet wired to a persisted "lock" action in this implementation — see
Deferred work in the final report.

## Consequences
- `scripts/run-experiment.ts` records `protocolHash` (and `protocolVersion`)
  on every registered experiment and every artifact, so a later protocol
  change is visible on old artifacts by comparing hashes, not just reading
  a version string that a researcher might forget to bump.
- §23's multiple-testing family concept (`familyId`) is defined and used by
  the experiment registry, but `analytics.ts`'s live Holm-Bonferroni
  correction still runs over the currently-visible strategy set per phase,
  not the full historical family from the registry — a deliberate,
  documented partial implementation (see final report).
