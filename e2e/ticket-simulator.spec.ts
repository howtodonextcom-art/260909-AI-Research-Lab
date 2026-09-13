import { test, expect, gotoApp } from "./fixtures";

/**
 * Journey 3: Ticket Simulator — Chọn nhanh (quick pick) -> Mô phỏng kỳ quay
 * (simulate draw) -> a result renders. Uses role+text selectors so this
 * survives DOM/class reshuffles from Agent C.
 */
test.describe("Ticket simulator", () => {
  test("quick pick selects 6 numbers and simulating a draw renders a result", async ({ page }) => {
    await gotoApp(page);

    await page.getByRole("tab", { name: /Vé mô phỏng/i }).click();

    await page.getByRole("button", { name: /Chọn nhanh/i }).click();

    // 6 number "balls" should now be pressed (aria-pressed="true").
    const pressedBalls = page.getByRole("button", { name: /^Số \d+$/ }).and(page.locator('[aria-pressed="true"]'));
    await expect(pressedBalls).toHaveCount(6);

    const simulateButton = page.getByRole("button", { name: /Mô phỏng kỳ quay|Quay kỳ tiếp theo/i });
    await expect(simulateButton).toBeEnabled();
    await simulateButton.click();

    // A result renders: either a match-count sentence or a drawn set of
    // balls under the "Phòng quay mô phỏng" / "Kết quả độc lập" region.
    await expect(page.getByText(/\/6 số/i).first()).toBeVisible();
  });
});
