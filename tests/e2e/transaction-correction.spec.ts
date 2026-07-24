import { test, expect } from "@playwright/test";
import { signInTestUser } from "./helpers/auth";

test("correcting a transaction's category persists across reload", async ({ page, request }) => {
  await signInTestUser(page, request);

  const seedResponse = await page.request.post("/api/test/seed-transaction", {
    headers: { "x-test-secret": process.env.CRON_SECRET ?? "" },
  });
  if (!seedResponse.ok()) {
    throw new Error(`seed-transaction failed: ${seedResponse.status()} ${await seedResponse.text()}`);
  }

  await page.goto("/transactions");

  const firstRowSelect = page.locator("tbody tr").first().locator("select");
  await expect(page.locator("tbody tr")).toHaveCount(1, { timeout: 10_000 });

  const currentValue = await firstRowSelect.inputValue();
  const optionValues = await firstRowSelect.locator("option").evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
  const targetValue = optionValues.find((v) => v !== currentValue);
  if (!targetValue) throw new Error("Need at least two category options to test switching.");

  await firstRowSelect.selectOption(targetValue);
  await page.waitForTimeout(500); // let the server action's revalidate land
  await page.reload();

  const reloadedValue = await page.locator("tbody tr").first().locator("select").inputValue();
  expect(reloadedValue).toBe(targetValue);
});
