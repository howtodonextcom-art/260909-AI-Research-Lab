# ADR-005: Persistence stays local/append-only; no server-side database

## Status
Accepted, implemented (documents an existing, deliberate architectural
choice — this ADR adds no new storage).

## Context
Round 3's dual-audit unified roadmap (U-08) asked for an explicit,
tables-out decision on persistence, because the app now has enough moving
storage pieces that "no database" needed to be a stated choice rather than
an unstated default. As of this writing the application persists data in
exactly three ways, and none of them is a durable, writable, server-side
store:

1. **Bundled static snapshot** — `public/data/power645.jsonl` +
   `power645.manifest.json`, produced by `npm run data:sync` and committed
   to git. This ships with every build and is the offline baseline every
   client starts from (`hooks/use-draw-data.ts`).
2. **IndexedDB in the browser** — `lib/data/browser-cache.ts`. A per-device
   cache of whatever dataset that specific browser last successfully
   refreshed to. It never leaves the device and is never read by the server
   (see README's "Bộ nhớ đệm trình duyệt").
3. **Append-only JSONL files under `reports/`**, written by Node CLI
   scripts run by a human or a scheduled task, never by the deployed Worker:
   `reports/experiments/registry.jsonl` (`scripts/run-experiment.ts`),
   `reports/prospective-scorecard.jsonl` (`scripts/research-prospective.ts`),
   `reports/protocol-lock.json` (`scripts/research-lock.ts`). These are
   committed to git like the dataset snapshot, not written by any request
   handler.

There is a fourth, narrower store — `lib/data/official-fetch-cache.ts`'s
short-TTL (12h) politeness cache in front of vietlott.vn, using the Workers
Cache API when available and an in-process `Map` fallback otherwise. This is
explicitly *not* a persistence layer: it holds only raw upstream fetch
responses, expires on its own, and is documented in its own file header as
"not a user store." It does not change the analysis below.

The public `POST /api/data/refresh` route (`app/api/data/refresh/route.ts`,
`lib/data/refresh-handler.ts`) reads request-supplied `records`/`manifest`,
merges them against the upstream source, and returns the merged result to
the caller — it never writes anything server-side. The Cloudflare Worker
this app deploys to has no writable filesystem and no D1/R2/KV binding
beyond the politeness cache above (`.openai/hosting.json` confirms no
database binding is configured).

## Decision
Keep it this way: **no durable server-side database for now.** Concretely:

- Do **not** add D1, R2, KV (beyond the existing short-TTL politeness
  cache), or any other durable Worker-side store in this round.
- The three real persistence mechanisms above stay as the complete picture:
  bundled snapshot (ships with the app), IndexedDB (per-device cache), and
  append-only `reports/` JSONL (human/CI-driven, git-committed).
- This is consistent with, not a new decision separate from, ADR-001's
  "official source primary, no server-side write path" framing and
  ADR-004's explicit choice of plain JSONL over a database for the
  experiment registry ("no database, per §24's explicit guidance not to
  introduce one without need"). ADR-005 generalizes that same principle
  across the whole app rather than just the registry.

### What this means operationally
- **Multi-device consistency requires action.** Two browsers never see each
  other's refreshed data automatically — each device's IndexedDB is its own
  island. The only way data reaches *every* user is for the bundled snapshot
  itself to be updated: a human (or a scheduled task, `npm run
  data:schedule`) runs `data:sync`, and the refreshed
  `public/data/power645.jsonl` + manifest get committed and deployed.
- **The `reports/` JSONL artifacts are not live application state.** They
  are research/ops records produced by whoever runs the corresponding CLI
  (`research:experiment`, `research:prospective-freeze`,
  `research:prospective-append`) on their own machine or CI runner, then
  committed like any other source file. The deployed Worker never appends to
  them at request time.
- **No cross-isolate coordination exists or is attempted.** The
  official-fetch cache and any rate-limiting (ADR-adjacent, see G9 in the
  Round 3 backlog) are explicitly single-isolate; a durable store is what
  cross-isolate coordination would actually require (see trigger below),
  not something this app currently approximates with a workaround.

### What would change this decision
This ADR is not "never add a database" — it is "not needed yet, and adding
one has a real cost (migrations, backups, a new failure mode, a new thing to
secure)." The concrete triggers that would justify revisiting it:

- **A genuine public write API** — if a future feature lets untrusted
  clients durably change state visible to other users (e.g. a shared
  scorecard, comments, saved portfolios syncing across devices), that state
  cannot live in one browser's IndexedDB and needs a real store (D1 is the
  natural first choice, being already-integrated with Cloudflare Workers).
- **Multi-writer coordination** — if more than one process needs to append
  to the same `reports/*.jsonl` concurrently (e.g. a scheduled job and a
  human running the CLI at the same time, or multiple CI runners), plain
  JSONL's "read-modify-atomic-rename" pattern stops being safe and a real
  transactional store (or at minimum a lock) becomes necessary.
- **Needing server-computed history the client cannot hold** — if the
  dataset or derived artifacts grow past what is reasonable to ship in a
  bundled snapshot or hold in IndexedDB, a queryable server-side store
  becomes the practical option rather than a nice-to-have.

None of these triggers exist today: there is exactly one writer per
`reports/*.jsonl` file (a human or one scheduled task, never concurrent),
no public write API is planned (`DO_NOT_BUILD` explicitly excludes
auth/billing/full SaaS), and the dataset (~1,561 records, well under a
megabyte) fits comfortably in a bundled snapshot for the foreseeable future.

## Round 7 re-evaluation (production hardening round)

This round adds `/api/readiness` (`app/api/readiness/route.ts`,
`lib/observability/readiness.ts`) and `/api/health`
(`app/api/health/route.ts`) per §17 of the production master prompt.
Re-checking this ADR's own trigger list against that addition:

- **`/api/readiness` is read-only.** It fetches this app's own bundled
  static assets (`/data/power645.jsonl`, `/data/power645.manifest.json`,
  `/data/protocol-lock.json`, `/data/experiment-family.json` — the same
  files `app/page.tsx` and `lib/data/refresh.ts` already fetch client-side)
  and reports pass/fail. It writes nothing, anywhere, ever. It is not "a
  genuine public write API" — the first trigger above — because it has no
  write path at all.
- **It adds no multi-writer coordination.** No new process appends to any
  `reports/*.jsonl` file; the second trigger remains unmet.
- **It holds no server-computed history the client cannot hold.** Every
  value it reports is recomputed per-request from the same static assets
  already shipped to the client; it caches nothing across requests
  (`Cache-Control: no-store`) and needs no store larger than what the client
  already holds. The third trigger remains unmet.
- **`/api/health` is even simpler** — a static liveness response with no
  dependency on data, dataset, or any store at all.

Conclusion: **this ADR's decision is reaffirmed, unchanged.** No database,
KV, D1, or R2 binding is needed to support either new endpoint. The
structured logging added alongside these endpoints (`lib/observability/logger.ts`)
also writes nothing durable — it only emits JSON lines to stdout/stderr for
an external platform log pipeline to collect, which is explicitly out of
scope for "persistence" as this ADR defines it (the log lines are not read
back by this application). The trigger list in "What would change this
decision" above is left exactly as it was; nothing in this round meets any
of its three conditions.

## Consequences
- Anyone auditing "where does data live" can point to exactly three answers
  (bundled snapshot, IndexedDB, `reports/` JSONL) and one narrow exception
  (the politeness cache) — there is no hidden fourth store to discover.
- Data freshness across devices is bounded by how often a human/scheduler
  runs `data:sync` and commits, not by anything the Worker does on its own;
  this is already documented in README's "Giới hạn Cloudflare Worker"
  section and is restated here as an explicit architectural consequence
  rather than an incidental limitation.
- If a real cross-isolate rate limit is ever needed (see the Round 3 backlog
  item on the refresh route), it will need exactly the kind of durable store
  this ADR currently declines to add — that is a second, independent trigger
  pointing at the same future decision, not a contradiction of it.
