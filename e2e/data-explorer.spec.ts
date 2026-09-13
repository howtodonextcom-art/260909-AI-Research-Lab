import { test, expect, gotoApp } from "./fixtures";

/**
 * Journey 4: Data Explorer — typing a real draw id from the bundled
 * dataset (public/data/power645.jsonl) returns the exact matching row.
 * The id/date/result below are the last real record in that file at the
 * time this spec was written (2026-09-11, id 01561). If the dataset is
 * re-synced and this id ever stops existing, update these three constants
 * to another real trailing record — do not weaken this to a substring-only
 * check, the whole point of this journey is exactness.
 */
const REAL_DRAW_ID = "01561";
const REAL_DRAW_DATE = "11/9/2026"; // vi-VN formatted d/M/yyyy
const REAL_DRAW_RESULT = ["14", "18", "20", "21", "26", "27"];

test.describe("Data Explorer", () => {
  test("typing a real draw id returns the exact matching row", async ({ page }) => {
    await gotoApp(page);
    // Data Explorer lives on the Research tab (default tab).
    await expect(page.getByRole("tab", { name: /Nghiên cứu/i })).toHaveAttribute("aria-selected", "true");

    const idInput = page.getByRole("textbox", { name: /Mã kỳ/i });
    await idInput.fill(REAL_DRAW_ID);

    const row = page.getByRole("row", { name: new RegExp(REAL_DRAW_ID) });
    await expect(row).toBeVisible();
    const rowText = await row.innerText();

    expect(rowText).toContain(REAL_DRAW_DATE);
    for (const ball of REAL_DRAW_RESULT) {
      expect(rowText).toContain(ball);
    }
  });
});
