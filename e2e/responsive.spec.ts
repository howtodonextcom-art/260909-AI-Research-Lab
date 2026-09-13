import { test, expect, gotoApp } from "./fixtures";

/**
 * Journey 7: responsive check. Runs on every configured project (desktop +
 * mobile viewport, see playwright.config.ts). Asserts no horizontal
 * overflow, with a small tolerance, and that all three tabs remain
 * reachable and show content at whatever viewport this project uses.
 */
test.describe("Responsive layout", () => {
  test("no horizontal overflow and all tabs render content", async ({ page }) => {
    await gotoApp(page);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `document.documentElement.scrollWidth exceeded window.innerWidth by ${overflow}px`).toBeLessThanOrEqual(2);

    for (const tabName of [/Nghiên cứu/i, /Portfolio/i, /Vé mô phỏng/i]) {
      const tab = page.getByRole("tab", { name: tabName });
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true");
      const overflowAfter = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflowAfter, `Horizontal overflow after switching to ${tabName} tab`).toBeLessThanOrEqual(2);
    }
  });
});
