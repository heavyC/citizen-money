import { test, expect } from "@playwright/test";
import { signInTestUser } from "./helpers/auth";

test("ask a grounded question in the chat panel and get a reply", async ({ page, request }) => {
  test.setTimeout(60_000);
  await signInTestUser(page, request);

  await page.goto("/chat");
  await page.getByPlaceholder("Ask your money anything…").fill("What is my current net worth?");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("Thinking…")).toBeVisible();
  await expect(page.getByText("Thinking…")).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator("p.whitespace-pre-wrap").last()).not.toBeEmpty();
});
