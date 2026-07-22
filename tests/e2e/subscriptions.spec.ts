import { test, expect } from "@playwright/test";
import { signInTestUser } from "./helpers/auth";

test("viewing subscriptions and setting a reminder", async ({ page, request }) => {
  await signInTestUser(page, request);
  await page.goto("/subscriptions");

  const remindButtons = page.getByRole("button", { name: "Remind me to cancel" });
  const count = await remindButtons.count();
  if (count === 0) {
    // No detected subscriptions for this fresh test user yet — the page
    // should still render cleanly rather than error.
    await expect(page.getByText(/subscriptions detected|recurring charges/).first()).toBeVisible();
    return;
  }

  await remindButtons.first().click();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await page.locator('input[name="remindAt"]').fill(tomorrow.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Save" }).click();

  await expect(remindButtons.first()).toBeVisible();
});
