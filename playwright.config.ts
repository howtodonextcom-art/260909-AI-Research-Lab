import { defineConfig, devices } from "@playwright/test";

/**
 * Automated Playwright E2E suite for the Mega 6/45 Research Lab.
 *
 * Why `npm run dev` and not `npm run start`: `start` boots a full local
 * Cloudflare Workers runtime via `wrangler dev` against a pre-built
 * `dist/server/wrangler.json`, which is heavier to boot reliably and
 * reproducibly inside CI (and requires a prior successful `build` targeting
 * the Workers output specifically). `dev` (vinext's dev server, bound to
 * a fixed port via `scripts/run-framework.mjs`) is faster to start, matches
 * what every prior manual Playwright MCP acceptance pass in this repo's
 * history has run against (see reports/26-09-13-17-32-browser-mcp-acceptance.md),
 * and is what Playwright's own `webServer` auto-start feature is designed for.
 */
export default defineConfig({
  testDir: "./e2e",
  // Serialized on purpose: all specs share ONE local dev-server instance
  // (see `webServer` below), and the app's client applies a real, honest
  // soft rate limit to its own refresh endpoint (5 req/10s per isolate —
  // see lib/data/rate-limit.ts). Running specs/projects in parallel here
  // just means several browser contexts hammering that single isolate at
  // once and tripping the limiter mid-test (observed: 429s -> the page
  // falls back to its data-load-error state -> unrelated assertions fail).
  // A real multi-isolate deployment doesn't have this problem; a single
  // shared CI dev server does, so workers is pinned to 1 everywhere.
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "Desktop Chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "Mobile 390x844",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
