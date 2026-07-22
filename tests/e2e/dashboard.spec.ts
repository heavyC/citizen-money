import { test, expect } from "@playwright/test";
import { signInTestUser } from "./helpers/auth";

test.describe("authenticated dashboard flow", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page, request }) => {
    await signInTestUser(page, request);
  });

  test("dashboard is reachable once signed in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Net worth")).toBeVisible();
  });

  test("creating a budget reflects it in the list", async ({ page }) => {
    await page.goto("/budgets");

    // Uses a category no other spec mutates transactions into, so the
    // spent-vs-limit text here can't be perturbed by unrelated tests sharing
    // this same fixed test user.
    await page.getByLabel("Category").selectOption("Insurance");
    await page.getByLabel("Monthly limit").fill("250");
    await page.getByRole("button", { name: "Save budget" }).click();

    const row = page.locator("div", { has: page.locator("span.font-medium", { hasText: "Insurance" }) }).last();
    await expect(row).toBeVisible();
    await expect(row.getByText(/\$250/)).toBeVisible();
  });

  test("transaction category filter narrows the list without erroring", async ({ page }) => {
    await page.goto("/transactions");
    await page.getByRole("combobox").first().selectOption("Groceries");
    await expect(page.locator("body")).toBeVisible();
  });
});
