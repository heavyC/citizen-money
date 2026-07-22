import { test, expect } from "@playwright/test";
import { signInTestUser } from "./helpers/auth";

test("creating a goal shows it with progress", async ({ page, request }) => {
  await signInTestUser(page, request);
  await page.goto("/goals");

  const goalName = `Test Vacation Fund ${crypto.randomUUID().slice(0, 8)}`;
  await page.getByLabel("Name").fill(goalName);
  await page.getByLabel("Target amount").fill("3000");
  await page.getByLabel("Starting amount").fill("500");
  await page.getByRole("button", { name: "Create goal" }).click();

  const goalRow = page.locator("div", { has: page.getByText(goalName, { exact: true }) }).last();
  await expect(page.getByText(goalName, { exact: true })).toBeVisible();
  await expect(goalRow.getByText(/\$500.*\$3,?000/)).toBeVisible();
});
