import { expect, test } from "@playwright/test";

test("runs the Japan Trip decision flow variants", async ({ page, request }) => {
  await expect(async () => {
    const response = await request.get("http://localhost:8787/api/health");
    expect(response.ok()).toBe(true);
  }).toPass({ timeout: 30_000 });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Japan Trip Decision Flow" })).toBeVisible();
  await expect(page.getByTestId("decision-badge")).toHaveText("allow");

  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByTestId("decision-badge")).toHaveText("ask");

  await page.getByRole("button", { name: "Deny" }).click();
  await expect(page.getByTestId("decision-badge")).toHaveText("deny");

  await page.getByRole("button", { name: "Missing AI" }).click();
  await expect(page.getByTestId("decision-badge")).toHaveText("ask");

  await expect(page.getByText("Debug rules")).toBeVisible();
});
