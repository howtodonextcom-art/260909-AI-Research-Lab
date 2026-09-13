# Research Provenance Integrity Report — Round 4

## Protocol identity

- `CURRENT_PROTOCOL` unchanged this round (no research-substance edits).
- Current lock: `reports/protocol-lock.json` — version `2026-09-10.1`, hash `9b864bec07e355e042029cff3553716ba454e89b01d0860773ea47de772dfe52`, locked `2026-09-12T16:49:27.194Z`.
- **New this round:** `reports/protocol-history.json` — a durable, append-only record of every hash that has ever been the real, locked protocol identity, so a future protocol change (or, as it turned out, discovery of a *past* undocumented one) can be distinguished from tampering. Contains 2 entries:
  1. `089e16b90b1d168e69142faf678b5bc66e831310cf99b30c4f0db259c27badef` — real, historical, recovered from registry evidence (source `migrated-pre-lock-registry`; no live lock file for it ever existed, since history-tracking didn't exist yet at that time).
  2. `9b864bec07e355e042029cff3553716ba454e89b01d0860773ea47de772dfe52` — the current lock, backdated to its real `protocolLockedAt` (source `migrated-existing-lock`).
- **A real, previously-undocumented gap surfaced by this exercise:** both history entries carry the identical `protocolVersion` string `"2026-09-10.1"` despite having different hashes — meaning `CURRENT_PROTOCOL`'s content changed at some point in an earlier round without the version label being bumped. This is now visible and auditable (rather than silently colliding) precisely because `protocol-history.json` exists; it is recorded here as a known historical fact, not silently corrected by retroactively renaming anything.

## Registry identity

- `reports/experiments/registry.jsonl`: 3 lines, all `COMPLETED`, all for `familyId=protocol-2026-09-10.1-primary-strategies`. **Not modified this round** — append-only, byte-identical to before.
- **Real defect found and root-caused:** all 3 registry lines record `protocolHash = 089e16b90b1d...` (correct — that was the real protocol at registration time, 2026-09-11T18:06:36Z), but all 3 corresponding artifact files (`reports/experiments/protocol-2026-09-10.1-primary-strategies-{hot,cold,balanced}-8e26f348.json`) record `protocolHash = 9b864bec07e3...` (the *current* hash). Root cause: `scripts/run-experiment.ts` used to rebuild and overwrite every strategy's artifact file on **every** invocation using `CURRENT_PROTOCOL`'s hash at that moment, regardless of whether the experimentId was already registered. A run at some later point (after the protocol's content — but not version label — changed) silently overwrote all 3 artifacts.
- **Fix (verified live):** `run-experiment.ts` now writes an artifact only the first time its experimentId is newly registered in the same run; for an already-registered id it explicitly skips both registration and artifact-writing. Re-running `npm run research:experiment` against the real registry after the fix produced `ĐÃ ĐĂNG KÝ VÀ HOÀN THÀNH 0 THỬ NGHIỆM` and left all 3 artifact files byte-identical (MD5-verified before/after).
- **The 3 pre-existing mismatches themselves are neither rewritten nor silently ignored.** They are documented in `reports/provenance-exceptions.json` — a small, exact-match-only allowlist (`kind`+`experimentId`+`detail` must match byte-for-byte) that `scripts/verify-provenance.ts` treats as a non-fatal, loudly-printed warning rather than either a CI failure or a silent pass. A violation of a *different* kind, or for a *different* experimentId, or whose message text differs even slightly (e.g. because the underlying hash changed again) is never matched by an existing exception and fails CI as normal — proven by `provenance-registry.test.ts`'s dedicated tests for stale/wrong-id exceptions.

## Artifact identity

- `checkArtifactFileIntegrity` (new, pure, unit-tested) additionally guards against: a file whose name lies about the experimentId it declares, and two files declaring the same experimentId with genuinely different content. Neither condition currently exists in the real `reports/experiments/` directory (verified live).
- Bao-18 artifacts (`reports/*-bao18-walkforward-reverse-audit.json`) now separate `scientificSpecHash` (hash of dataset/lookback/seed/rules/endpoint/null-model/alpha/Holm-family only) from `buildProvenance` (git commit/branch/dirty-status/generation timestamp/runtime version) as two distinct top-level fields — proven by a test that computes the hash twice with identical research inputs but different simulated build metadata and asserts identical output, then changes one real research input and asserts the hash changes. The two historical Bao-18 artifacts predating this split (`26-09-13-12-53-*`) are untouched; the new one (`26-09-13-13-59-*`) uses the corrected shape (`schemaVersion: 2`).

## Prospective chain

- `reports/prospective-scorecard.jsonl`: 4 lines, all for draw `#01562`, all still `PENDING` (draw hasn't happened). **Not modified this round** — confirmed byte-identical (SHA-1 hash match) before and after live `research:prospective-freeze`/`research:prospective-append` runs.
- **Redesigned from mutate-in-place to append-only hash-chained events.** `cmdAppendResult` previously rewrote the entire file to flip a frozen line's `result` from `null` to real — indistinguishable from tampering. It now appends a new `ScoredEvent` line referencing the original `FrozenEvent`'s `entryId`; nothing is ever rewritten in place again.
- Each chained event carries `entryHash = hash(content) chained with previousEntryHash` — `verifyProspectiveChain` recomputes this walking the file in order and fails on any tamper, deletion, or reorder. Proven by unit tests: editing a field breaks the chain; deleting a line breaks it; reordering two lines breaks it; a `ScoredEvent` referencing a nonexistent `entryId` (dangling reference) does NOT break the *hash* chain (a different, correctly-separated concern) but also creates no phantom entry when folded.
- The 4 existing lines predate the chain and have no `entryId`/`previousEntryHash`/`entryHash` fields. They are parsed and reported as a distinct `LEGACY_UNCHAINED` category — never silently treated as "always chained." Live-verified: `npm run research:verify-provenance` reports "4 sự kiện LEGACY_UNCHAINED" and 0 chained (correct — no scoring event has happened yet, since `#01562` hasn't occurred).

## Invariant test results (this round's new/extended tests)

| Invariant | Test | Result |
|---|---|---|
| Same scientific inputs, different git commit → same `scientificSpecHash` | `bao18-walkforward.test.ts` | PASS |
| Different `lookback`/`datasetSha256` → different `scientificSpecHash` | `bao18-walkforward.test.ts` | PASS |
| Edit a chained ledger entry → verification fails | `prospective.test.ts` | PASS |
| Delete a chained ledger entry → verification fails | `prospective.test.ts` | PASS |
| Reorder two chained ledger entries → verification fails | `prospective.test.ts` | PASS |
| Legacy entries don't break chain verification for entries that follow | `prospective.test.ts` | PASS |
| Future target mutation → historical pool unchanged (Bao-18) | `bao18-walkforward.test.ts` | PASS (pre-existing, re-confirmed) |
| Future suffix mutation → historical pool unchanged (Bao-18) | `bao18-walkforward.test.ts` | PASS (pre-existing, re-confirmed) |
| Registry protocolHash not recognized by lock or history → hard fail | `provenance-registry.test.ts` | PASS |
| Registry/artifact protocolHash mismatch → hard fail unless a documented, exact-match exception exists | `provenance-registry.test.ts` | PASS |
| A stale or wrongly-scoped exception does not suppress an unrelated/changed violation | `provenance-registry.test.ts` | PASS |
| Artifact evidence gate: audit CLI refuses to write an artifact if its own test suite doesn't pass | Live-verified (Agent B's report: exit 0, 35/35, embedded in artifact); not independently re-broken-and-retested by the lead this round | Verified via Agent B's report + artifact inspection, not independently re-attacked |

## Live re-verification performed by the lead (not delegated)

1. `npm run research:verify-provenance` — found the real historical defect above; after fixes, exits 0 with 3 documented, non-fatal warnings.
2. `npm run research:experiment` — confirmed no-op, artifact files byte-identical (MD5) before/after.
3. `npm run research:prospective-freeze` / `research:prospective-append` — confirmed no-op, scorecard file byte-identical (SHA-1) before/after.
4. `npm run research:bao18-summary` — confirmed it picks up the newest Bao-18 artifact and republishes correctly-shaped data.

## What was NOT independently re-attacked by the lead this round

- The evidence-gate child-process mechanism (does the CLI genuinely refuse to write an artifact if a test is deliberately broken?) was verified by Agent B's own report but not independently re-broken-and-retested by the lead due to time budget. This is the single most important open verification item for a future round.
- Cryptographic signing / trusted timestamps for the prospective chain were considered per the master prompt's suggestion but not implemented — the deterministic hash-chain design was judged sufficient and lower-risk for this round; the remaining trust boundary (anyone with filesystem write access to `reports/` can still regenerate a self-consistent chain from scratch, since there is no external anchor) is documented here rather than silently assumed away.
