import { test, expect } from "@playwright/test";
import { signInTestUser } from "./helpers/auth";

test("cron insights route rejects requests without the secret", async ({ request }) => {
  const res = await request.get("/api/cron/insights");
  expect(res.status()).toBe(401);
});

test("cron insights route accepts the correct bearer secret", async ({ request }) => {
  const res = await request.get("/api/cron/insights", {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expect(res.ok()).toBe(true);
});

test("running insights now and dismissing an alert", async ({ page, request }) => {
  await signInTestUser(page, request);
  await page.goto("/alerts");

  await page.getByRole("button", { name: "Run insights now" }).click();
  await expect(page.getByRole("button", { name: "Running…" })).toHaveCount(0, { timeout: 15_000 });

  const dismissButtons = page.getByRole("button", { name: "Dismiss" });
  const count = await dismissButtons.count();
  if (count > 0) {
    await dismissButtons.first().click();
    await expect(dismissButtons).toHaveCount(count - 1);
  }
});
