import { expect, test } from "@playwright/test";

test("shows the Japan Trip decision flow shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Japan Trip Decision Flow" })).toBeVisible();
  await expect(page.getByText("allow / ask / deny")).toBeVisible();
  await expect(page.getByText("Mock execution", { exact: true })).toBeVisible();
});
