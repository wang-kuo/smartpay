import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

function readLocalSecret(name: string): string | undefined {
  if (process.env[name]) {
    return process.env[name];
  }

  const path = resolve(process.cwd(), "secrets/admin.env");
  if (!existsSync(path)) {
    return undefined;
  }

  const line = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
}

test("runs the public Japan Trip chat flow without admin panels", async ({ page, request }) => {
  await expect(async () => {
    const response = await request.get("http://localhost:8787/api/health");
    expect(response.ok()).toBe(true);
  }).toPass({ timeout: 30_000 });

  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Japan Trip Decision Flow" })).toBeVisible();
  await page.getByLabel("Email").fill("demo@example.com");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("What would you like to do today?")).toBeVisible();
  await page.getByRole("button", { name: "Analyze request" }).click();
  await expect(page.getByTestId("decision-badge")).toHaveText(/allow|ask|deny/);
  await expect(page.getByText("Structured analysis")).toBeHidden();
  await expect(page.getByText("Debug rules")).toBeHidden();
  await expect(page.getByRole("button", { name: "Allow" })).toBeHidden();
});

test("runs the admin backend flow with analysis and debug panels", async ({ page, request }) => {
  const adminEmail = readLocalSecret("DEMO_ADMIN_EMAIL") ?? "admin@smartpay.local";
  const adminPassword = readLocalSecret("DEMO_ADMIN_PASSWORD");
  test.skip(!adminPassword, "secrets/admin.env is required for the local admin e2e flow.");

  await expect(async () => {
    const response = await request.get("http://localhost:8787/api/health");
    expect(response.ok()).toBe(true);
  }).toPass({ timeout: 30_000 });

  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "Japan Trip Decision Flow" })).toBeVisible();
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword ?? "");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Structured analysis")).toBeVisible();
  await page.getByRole("button", { name: "Analyze request" }).click();
  await expect(page.getByTestId("decision-badge")).toHaveText(/allow|ask|deny/);
  await expect(page.getByLabel("Decision workspace").getByText("Fit check")).toBeVisible();

  await page.getByRole("button", { name: "Allow" }).click();
  await expect(page.getByTestId("decision-badge")).toHaveText("allow");

  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByTestId("decision-badge")).toHaveText("ask");

  await page.getByRole("button", { name: "Deny" }).click();
  await expect(page.getByTestId("decision-badge")).toHaveText("deny");

  await page.getByRole("button", { name: "Missing AI" }).click();
  await expect(page.getByTestId("decision-badge")).toHaveText("ask");

  await expect(page.getByText("Debug rules")).toBeVisible();
});
