import { test as base, expect } from "@playwright/test";
import type { ConsoleMessage, Page } from "@playwright/test";

/**
 * Shared fixture: every spec that imports `test` from here automatically
 * fails if the page logs a console.error or throws an uncaught page error
 * at any point during the test, without each spec having to wire this up
 * itself (Task 2 item 7 / honesty-critical "console discipline" check from
 * reports/26-09-13-17-32-browser-mcp-acceptance.md Journey 8).
 *
 * Known-benign noise (e.g. a browser extension or a favicon 404) can be
 * added to IGNORE_PATTERNS below — kept empty by default so a real
 * regression is never silently swallowed.
 */
const IGNORE_PATTERNS: RegExp[] = [
  // The app's own client (hooks/use-draw-data.ts) fires a background
  // auto-refresh check (GET /api/data/refresh) on mount. The route applies
  // a real, documented soft sliding-window limit of 5 req/10s per isolate
  // (lib/data/rate-limit.ts) to protect the upstream official-fetch cache
  // from request bursts. This whole E2E suite is one such burst by design
  // (many fast, serial navigations against one shared local dev-server
  // isolate) — real users spread across isolates/time don't trip this.
  // A failed refresh never touches already-rendered data (see the "Order
  // of operations" doc comment on useDrawData), so this 429 is inert noise
  // for every content assertion in this suite, not a regression signal.
  /the server responded with a status of 429/,
];

function isIgnored(text: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(text));
}

export const test = base.extend<{ consoleErrors: string[] }>({
  // `auto: true` so every spec gets this check without needing to declare
  // the fixture as a parameter — it runs even for tests that never
  // reference `consoleErrors` directly.
  consoleErrors: [async ({ page }, use) => {
    const errors: string[] = [];

    const onConsole = (message: ConsoleMessage) => {
      if (message.type() === "error" && !isIgnored(message.text())) {
        errors.push(`[console.error] ${message.text()}`);
      }
    };
    const onPageError = (error: Error) => {
      if (!isIgnored(error.message)) {
        errors.push(`[pageerror] ${error.message}`);
      }
    };

    page.on("console", onConsole);
    page.on("pageerror", onPageError);

    await use(errors);

    page.off("console", onConsole);
    page.off("pageerror", onPageError);

    expect(errors, `Expected zero console errors / uncaught exceptions, got:\n${errors.join("\n")}`).toEqual([]);
  }, { auto: true }],
});

export { expect };

/**
 * Navigate to the app root and wait for the workspace shell to mount AND
 * the dataset to finish its initial load. `useDrawData()` (hooks/use-draw-data.ts)
 * renders a "Đang tải dữ liệu kỳ quay…" placeholder on the Research tab
 * until the bundled/cached dataset resolves — on a cold dev server this can
 * take a few seconds, so specs must wait for it to clear rather than
 * asserting against a still-loading page.
 */
export async function gotoApp(page: Page) {
  await page.goto("/");
  await page.locator("#workspace").waitFor({ state: "visible" });
  await expect(page.getByText("Đang tải dữ liệu kỳ quay")).toHaveCount(0, { timeout: 20_000 });
}
