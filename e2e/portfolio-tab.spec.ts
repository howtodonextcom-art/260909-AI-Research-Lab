import { test, expect, gotoApp } from "./fixtures";

/**
 * Journey 2 (portfolio frontier). Agent B is actively computing new
 * exact-probability numbers and may add a benchmark table this round, so
 * this asserts STRUCTURAL presence (percentages / a caveat sentence),
 * never exact figures.
 */
test.describe("Portfolio tab", () => {
  test("becomes selected and shows exact-probability content with a non-overclaim caveat", async ({ page }) => {
    await gotoApp(page);

    const portfolioTab = page.getByRole("tab", { name: /Portfolio/i });
    await portfolioTab.click();
    await expect(portfolioTab).toHaveAttribute("aria-selected", "true");

    const panel = page.getByRole("tabpanel", { name: /Portfolio/i }).or(page.locator("[role=tabpanel]:visible"));
    const panelText = await panel.first().innerText();

    // Structural presence of probability-shaped content (a percent sign or
    // "1 / N" odds notation), without pinning exact numbers Agent B owns.
    const hasProbabilityContent = /%/.test(panelText) || /1\s*\/\s*[\d.]+/.test(panelText);
    expect(hasProbabilityContent, "Expected some percentage or odds notation on the Portfolio tab").toBe(true);

    // Non-overclaim caveat: the tab must not assert its algorithm is simply
    // "better" without qualification — look for a hedge/caveat phrase.
    const hasCaveat = /không chứng minh|không đoán số|không chồng lấn|mức cải thiện có thể nhỏ/i.test(panelText);
    expect(hasCaveat, "Expected a non-overclaim caveat sentence on the Portfolio tab").toBe(true);

    // Defensive, best-effort check for a benchmark-style table (e.g. an
    // exact-benchmark comparison Agent B may be adding this round). Not a
    // hard requirement yet since that UI may not have landed at test time.
    const table = panel.locator("table");
    if (await table.count() > 0) {
      const tableText = await table.first().innerText();
      // Only assert content shape if a table exists at all; don't fail the
      // whole spec if the specific header wording differs.
      expect(tableText.length).toBeGreaterThan(0);
    }
  });
});
