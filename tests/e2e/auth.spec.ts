import { test, expect } from "@playwright/test";

test("unauthenticated home page redirects to sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("unauthenticated whoami API returns 401", async ({ request }) => {
  const res = await request.get("/api/whoami");
  expect(res.status()).toBe(401);
});

test("sign-up page renders", async ({ page }) => {
  await page.goto("/sign-up");
  await expect(page.locator("body")).toBeVisible();
});
