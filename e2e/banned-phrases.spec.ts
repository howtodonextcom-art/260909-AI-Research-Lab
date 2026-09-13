import { test, expect, gotoApp } from "./fixtures";

/**
 * Journey 8 (banned-phrase scan): the app must never assert a guaranteed
 * win / a beaten-probability claim. Scans the full visible body text of
 * each tab.
 */
const BANNED_PHRASES = ["chắc thắng", "chắc chắn trúng", "đảm bảo trúng", "đánh bại xác suất"];

test.describe("Banned-phrase scan", () => {
  test("no overclaiming phrases appear on any tab", async ({ page }) => {
    await gotoApp(page);

    for (const tabName of [/Nghiên cứu/i, /Portfolio/i, /Vé mô phỏng/i]) {
      await page.getByRole("tab", { name: tabName }).click();
      const bodyText = (await page.locator("body").innerText()).toLowerCase();
      for (const phrase of BANNED_PHRASES) {
        expect(bodyText, `Banned phrase "${phrase}" found on tab matching ${tabName}`).not.toContain(phrase);
      }
    }
  });
});
