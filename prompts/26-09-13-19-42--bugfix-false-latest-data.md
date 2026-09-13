# BUGFIX PROMPT — False “Latest Data” When Newer Vietlott Draw Exists

## Role
You are **Claude Code / Cursor Agent** as Principal Data Engineer + Research Lab QA for:

`D:\2026\260909-AI-Research Lab`
GitHub: `howtodonextcom-art/260909-AI-Research-Lab`

Mission: **diagnose and fix** a production-integrity bug where the UI claims the dataset is already the newest version while a newer official Mega 6/45 result exists after the locally shown latest draw.

This is **not** an audit-only task. Execute:

> reproduce → root-cause with evidence → ideate → verify → implement → unit/integration tests → local sync/runtime → Browser MCP → red-team messaging → score → stop only when fixed

Do not ask humans for routine engineering decisions. Do not fabricate draws. Do not commit/push/deploy unless explicitly asked later.

---

## Observed symptom (must treat as P0)

UI (Data Status / Research):
- Latest draw shown: **#01561** dated **2026-09-11**
- Range ends **11/9/2026**
- Last successful sync shown around **2026-09-12**
- Status messaging like:
  - “Không có dữ liệu mới”
  - “Dữ liệu đã là phiên bản mới nhất”
- User report (today **2026-09-13**): Vietlott already has a newer result, but the app still asserts “latest”.

This is a **false freshness / false completeness** claim.

Scientific product rule: never present stale/incomplete history as current.

---

## Non-negotiable constraints

1. **vietlott.vn official** remains authoritative; mirrors are cross-check only.
2. Fail closed on conflicts / parse failures — never silently invent or skip a published draw.
3. Distinguish clearly in UI and APIs:
   - **Sync outcome** (request succeeded, ETag 304, added=0, error)
   - **Dataset currency vs calendar/schedule** (is the latest *published* official draw present?)
   - **Freshness of lastSuccessfulSync** (`Fresh`/`Delayed`/`Stale`/`Unknown` in `lib/data/freshness.ts`)
4. “added = 0” or “304 Not Modified” must **not** be worded as absolute proof that Vietlott has no newer draw, unless independently verified against live/official listing logic.
5. Preserve provenance/integrity invariants (no silent historical overwrite).
6. Match existing code style; add tests with the fix.

---

## Phase 0 — Reproduce with evidence

1. Record HEAD SHA, dirty status, current local latest draw id/date from:
   - bundled/public snapshot / IndexedDB path as actually used by the running app
   - `public/data` / official cache artifacts if present
2. Run local app; capture Data Status strings + latest `#id` / date.
3. Click **Cập nhật dữ liệu** (and if exists, force-refresh path). Capture API response JSON from `/api/data/refresh` (added, latestDate, errors, etag behavior).
4. Independently check whether a draw **after 2026-09-11** exists on the official source (scrape/fetch using the project’s official adapter — not a random website).
5. Write a short repro note:
   - local tip vs upstream tip
   - whether refresh discovered it
   - exact misleading UI string(s)

If upstream truly has no newer draw: prove it with adapter output and convert the bug into a **messaging/schedule-awareness** fix (do not claim “latest forever”; explain next expected draw window).
If upstream has a newer draw: this is a **sync discovery bug** — must fix ingestion + messaging.

---

## Phase 1 — Root-cause hypotheses (prove or kill each)

Investigate at least:

A. **ETag / 304 short-circuit** causing skip of pages that would reveal new draws (`lib/data/sync.ts`, refresh route).
B. **Incremental sync window / history key / page EOF logic** stopping too early.
C. **Parser structure change** silently treating new page as empty/EOF.
D. **Client offline-first** serving bundled snapshot and treating “refresh no-op” as “world is complete”.
E. **Force flag not used** by UI button; soft refresh insufficient.
F. **Schedule ignorance**: Mega draws are not daily; UI says “latest” when it only means “sync found nothing this attempt”.
G. **Timezone / date boundary** mis-ordering draw ids/dates.
H. **Freshness badge** (`assessFreshness`) measuring sync age while copy claims data completeness.

---

## Phase 2 — Required product behavior after fix

### Sync engine
- Discover and append any newer official draws after local tip when they exist.
- Support a reliable **force** path that bypasses ETag when user explicitly refreshes and soft path may be stale.
- Keep conflict detection fail-closed.

### UI / API messaging (Vietnamese, honest)
Replace absolute “đã là phiên bản mới nhất” when unjustified with precise states, e.g.:
- Sync OK, **N kỳ mới** added → show new tip id/date
- Sync OK, **0 added**, upstream tip **matches** local tip → “Khớp nguồn chính thức tới kỳ #… / ngày …”
- Sync OK, **0 added**, but upstream check **failed / inconclusive** → do **not** claim newest; say verification inconclusive + retry
- Sync error → error state + retry
- Optional: “Kỳ tiếp theo dự kiến theo lịch …” if schedule module exists — never invent results

### Freshness
Keep Fresh/Delayed/Stale/Unknown for **lastSuccessfulSync**, but do not let it imply “no missing draws”.

---

## Phase 3 — Implementation rules

1. Prefer smallest correct fix at the true root (discovery and/or copy).
2. Add regression tests for discovery + messaging contracts.
3. Run typecheck, relevant tests, Browser MCP verification.
4. Stop only at `FIXED_VERIFIED` or honest `NOT_FIXED`.

## Deliverables

1. Code + tests
2. `reports/YY-MM-DD-HH-MM-data-latest-false-positive-fix.md`
3. Final verdict: `FIXED_VERIFIED` or `NOT_FIXED`
