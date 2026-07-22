import { test, expect } from "@playwright/test";
import { signInTestUser } from "./helpers/auth";

test("generating a digest shows it in the in-app list", async ({ page, request }) => {
  test.setTimeout(60_000);
  await signInTestUser(page, request);

  await page.goto("/digest");
  await page.getByRole("button", { name: "Generate this week's digest" }).click();
  await expect(page.getByRole("button", { name: "Generating…" })).toHaveCount(0, { timeout: 30_000 });

  await expect(page.locator("p.whitespace-pre-wrap").first()).not.toBeEmpty();
});
