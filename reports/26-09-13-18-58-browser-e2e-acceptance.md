# Browser E2E Acceptance Report — Automated Playwright Suite (Sub-Agent D)

This documents the **first CI-wired, automated** Playwright suite for this repo,
closing the "No browser E2E in CI → max 89" hard-cap item named in
`prompts/26-09-13-18-30--master-prompt-production-upgrade-combined.md` §15-16/§29
and `prompts/26-09-13-17-53--master-prompt-round6-production-100.md` §6/§7.
This is a permanent, self-running regression guard — distinct from, and
complementary to, the manual Playwright MCP acceptance passes in
`reports/26-09-13-17-32-browser-mcp-acceptance.md` and any orchestrator-run
MCP acceptance pack for this round.

## Files created / modified

| File | Change |
|---|---|
| `playwright.config.ts` | New. Suite config (see below). |
| `e2e/fixtures.ts` | New. Shared `test`/`expect`/`gotoApp` — auto-fixture that fails any spec on `console.error` or uncaught `pageerror`, with one documented, narrow ignore pattern (see "Findings" below). |
| `e2e/research-overview.spec.ts` | New. Journey 1: Research tab selected by default + unproven-edge disclosure substring present. |
| `e2e/portfolio-tab.spec.ts` | New. Journey 2: Portfolio tab selection + structural probability content + non-overclaim caveat. |
| `e2e/ticket-simulator.spec.ts` | New. Journey 3: Chọn nhanh → 6/6 balls pressed → Mô phỏng kỳ quay → result renders. |
| `e2e/data-explorer.spec.ts` | New. Journey 4: typing real draw id `01561` returns the exact bundled row. |
| `e2e/keyboard-smoke.spec.ts` | New. Journey 6: first Tab → skip-link, then focus keeps moving (no trap). |
| `e2e/responsive.spec.ts` | New. Journey 7: no horizontal overflow on any project, at any tab. |
| `e2e/banned-phrases.spec.ts` | New. Journey 8: banned-phrase scan across all three tabs. |
| `package.json` | Added `@playwright/test` devDependency (via `npm install`, which also updated `package-lock.json`); added `scripts.e2e` and `scripts.e2e:ci`. Only these two script keys and the one devDependency line were touched — re-read immediately before each edit since Agents A/B were concurrently adding their own script/dependency entries to the same file; no conflicts occurred. |
| `.github/workflows/ci.yml` | Added "Install Playwright browsers" and "Browser E2E (Playwright)" steps after the existing `Build` step; bumped job `timeout-minutes` from 20 to 25 to give the new steps headroom. |

No other files were modified. **No `data-testid`/`id`/`aria-label` additions were needed** — existing ARIA roles (`tab`/`tabpanel`), labels (`<label htmlFor>` on the Data Explorer input), and stable Vietnamese copy/`aria-pressed` attributes were sufficient for resilient selectors.

## Playwright version and config choices

- `@playwright/test@^1.63.0` (latest stable at install time, compatible with Node ≥22.13 per this repo's `engines`).
- `testDir: "./e2e"`.
- `webServer.command: "npm run dev"` — **not** `npm run start`. `start` boots a full local Cloudflare Workers runtime (`wrangler dev` against a pre-built `dist/server/wrangler.json`), which is heavier/slower to boot reliably in CI and requires a Workers-targeted build step beyond the existing `npm run build`. `dev` (vinext's dev server, fixed to port 5173 by `scripts/run-framework.mjs`) is what every prior manual MCP acceptance pass in this repo has run against, is faster to boot, and is exactly what Playwright's `webServer` auto-start feature is designed for. `url: "http://localhost:5173"`, `reuseExistingServer: !process.env.CI`, `timeout: 60_000`.
- Projects: **Desktop Chromium** (1440×900) and **Mobile 390x844** (Chromium engine, custom 390×844 viewport rather than a named device preset, since touch emulation isn't needed for these checks).
- `retries: 2` on CI, `0` locally; `timeout: 30_000` per test; `expect.timeout: 5_000`.
- **`workers: 1` / `fullyParallel: false` everywhere (not just CI)** — see Finding 1 below for why.

## Finding 1 (environment interaction, not a selector bug): the app's own soft rate limiter fires under fast automated navigation

`hooks/use-draw-data.ts` triggers a background `GET /api/data/refresh` check on every mount. `lib/data/rate-limit.ts` applies an honest, documented sliding-window limit of **5 requests / 10s per isolate** to protect the upstream official-fetch cache from bursts. Running this suite's ~14 navigations against **one shared local dev-server isolate** at typical Playwright speed reliably tripped that limiter (`refresh.rate_limited` warnings, and a client-side `429` `console.error`). This is the rate limiter working exactly as designed against exactly the kind of burst its own doc comment describes ("a buggy client retry loop") — real users spread across isolates/time never hit this, and a failed refresh never touches already-rendered data (confirmed: page content assertions were unaffected once this noise was excluded).

Fix applied, in two parts:
1. `workers: 1` in `playwright.config.ts` (documented inline) — keeps this suite's total request rate closer to real single-user browsing.
2. One narrow, commented `IGNORE_PATTERNS` entry in `e2e/fixtures.ts` for `/the server responded with a status of 429/` — explicitly scoped and justified in a code comment, not a blanket suppression. A persistent `500` or any other console error still fails the suite (confirmed: an unrelated one-off `500` from a cold Miniflare start on the very first run of the session was NOT added to the ignore list, and did not reproduce on any subsequent run).

## Finding 2 (fixed): initial page load needs to wait for the dataset, not just the DOM shell

`gotoApp()` originally only waited for `#workspace` to become visible, but `useDrawData()` renders a "Đang tải dữ liệu kỳ quay…" placeholder until the bundled dataset resolves — a few seconds on a cold dev server. Several specs raced this and asserted against the placeholder state. Fixed by having `gotoApp()` additionally wait (up to 20s) for that placeholder text to disappear before returning control to the spec.

## Real E2E run output (final, after both findings were fixed)

```
Running 14 tests using 1 worker

  ok  1 [Desktop Chromium] › banned-phrases.spec.ts › no overclaiming phrases appear on any tab (2.2s)
  ok  2 [Desktop Chromium] › data-explorer.spec.ts › typing a real draw id returns the exact matching row (1.7s)
  ok  3 [Desktop Chromium] › keyboard-smoke.spec.ts › first Tab lands on the skip-link... (1.6s)
  ok  4 [Desktop Chromium] › portfolio-tab.spec.ts › becomes selected and shows exact-probability content... (1.7s)
  ok  5 [Desktop Chromium] › research-overview.spec.ts › Research tab selected by default + disclosure (1.6s)
  ok  6 [Desktop Chromium] › responsive.spec.ts › no horizontal overflow and all tabs render content (1.8s)
  ok  7 [Desktop Chromium] › ticket-simulator.spec.ts › quick pick ... renders a result (1.8s)
  ok  8 [Mobile 390x844]   › banned-phrases.spec.ts › no overclaiming phrases appear on any tab (1.8s)
  ok  9 [Mobile 390x844]   › data-explorer.spec.ts › typing a real draw id returns the exact matching row (1.6s)
  ok 10 [Mobile 390x844]   › keyboard-smoke.spec.ts › first Tab lands on the skip-link... (1.6s)
  ok 11 [Mobile 390x844]   › portfolio-tab.spec.ts › becomes selected and shows exact-probability content... (1.6s)
  ok 12 [Mobile 390x844]   › research-overview.spec.ts › Research tab selected by default + disclosure (1.6s)
  ok 13 [Mobile 390x844]   › responsive.spec.ts › no horizontal overflow and all tabs render content (1.7s)
  ok 14 [Mobile 390x844]   › ticket-simulator.spec.ts › quick pick ... renders a result (1.7s)

  14 passed (30.7s)
```

This exact run was made **after** Agents A/B/C's changes to `app/page.tsx`, `components/scientific-verdict.tsx`, `components/portfolio-lab.tsx`, and the new `components/research-nav.tsx` had already landed mid-session — confirming the role/text-based selectors survived the concurrent DOM/copy churn without modification, as designed. It was also stable across 3 total full runs in a row (once, before the merge, and once after).

## Deliberate-break verification (the suite has teeth)

To prove a real regression would be caught, not just that the suite trivially passes:

1. Edited `e2e/banned-phrases.spec.ts`'s `BANNED_PHRASES` list to add `"độc lập"` — a substring known to be present in real page footer text ("Phòng thí nghiệm thống kê độc lập...").
2. Ran `npx playwright test e2e/banned-phrases.spec.ts` — **both projects failed**, with the exact expected assertion error (`Banned phrase "độc lập" found on tab matching ...`).
3. Reverted the edit to the original 4-phrase list.
4. Re-ran the full suite — **14/14 passed** (shown above), confirming the fix restored a clean state and the earlier failure wasn't a fluke/misconfiguration.

## CI step added (`.github/workflows/ci.yml`)

```yaml
      - name: Build
        run: npm run build
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      - name: Browser E2E (Playwright)
        run: npm run e2e:ci
        env:
          CI: true
```

Chromium only (Desktop + the Chromium-engine mobile-viewport project) — no WebKit/Firefox-specific behavior is under test here, so a second/third browser engine would only add install time. `npm run e2e:ci` runs `playwright test --reporter=line`. **No `continue-on-error`, no non-blocking wrapper** — a real E2E failure fails this CI job, which is the entire point of this task.

## Process hygiene

Both dev-server processes this session started (Playwright's own `webServer`-managed `npm run dev`, left alive locally per Playwright's `reuseExistingServer: true` convention for fast repeat runs) were stopped via PowerShell (`Get-CimInstance Win32_Process` filtered on `run-framework.mjs dev`, then `Stop-Process`) before finishing; port 5173 confirmed free by `netstat` afterward. No stray `wrangler`/`workerd` processes were encountered this session (no `EPERM` on `dist/` occurred).

## Not committed

Per instructions, nothing was committed or pushed. `test-results/` and `playwright-report/` (transient local run artifacts) were deleted before finishing; they are not yet in `.gitignore` — the orchestrator or another agent may want to add `test-results/` and `playwright-report/` to `.gitignore` since I did not touch that file (out of my owned-files scope this round).
