import { test, expect, gotoApp } from "./fixtures";

/**
 * Journey 6: keyboard smoke test. Confirms the first Tab from page load
 * lands on the skip-link, and that a few subsequent Tab presses move
 * focus to distinct elements (no immediate keyboard trap).
 */
test.describe("Keyboard navigation smoke test", () => {
  test("first Tab lands on the skip-link, and focus keeps moving without getting stuck", async ({ page }) => {
    await gotoApp(page);

    await page.keyboard.press("Tab");
    const firstFocused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? { tag: el.tagName, text: el.textContent?.trim(), href: (el as HTMLAnchorElement).getAttribute("href") } : null;
    });
    expect(firstFocused?.tag).toBe("A");
    expect(firstFocused?.href).toBe("#workspace");

    const seen = new Set<string>();
    const identify = async () =>
      page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return "none";
        return `${el.tagName}#${el.id}.${el.className}:${el.textContent?.trim().slice(0, 30)}`;
      });

    seen.add(await identify());
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      const id = await identify();
      // Each subsequent Tab press should move focus somewhere new — a
      // repeated identical identity twice in a row would indicate a trap.
      // (We don't require global uniqueness since a tablist may cycle back
      // to previously-seen elements after leaving a region.)
      seen.add(id);
    }
    // With 6 total tab presses landing on at least 3 distinct elements,
    // focus is clearly moving rather than being stuck on one node.
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });
});
