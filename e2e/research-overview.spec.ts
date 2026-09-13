import { test, expect, gotoApp } from "./fixtures";

/**
 * Journey 1 (research-overview honesty) from the manual MCP acceptance
 * report, made permanent/automated. Uses substrings, not exact copy, since
 * Agent C is actively reshaping this page's DOM/copy this round.
 */
test.describe("Research overview honesty", () => {
  test("Research tab is selected by default and shows an unproven-edge disclosure", async ({ page }) => {
    await gotoApp(page);

    const researchTab = page.getByRole("tab", { name: /Nghiên cứu/i });
    await expect(researchTab).toHaveAttribute("aria-selected", "true");

    // Honesty-critical: the app must not claim a demonstrated edge exists.
    // "CHƯA CHỨNG MINH" ("not yet proven") is the established disclosure
    // string; fall back to a couple of close synonyms so a copy tweak by
    // another agent doesn't silently defang this check.
    const bodyText = await page.locator("body").innerText();
    const hasDisclosure = /CHƯA CHỨNG MINH|chưa chứng minh|NO_DEMONSTRATED|không chứng minh/i.test(bodyText);
    expect(hasDisclosure, "Expected an explicit 'not demonstrated / no proven edge' disclosure somewhere on the Research tab").toBe(true);
  });
});
