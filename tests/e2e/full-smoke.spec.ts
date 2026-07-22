import { test, expect } from "@playwright/test";
import { signInTestUser } from "./helpers/auth";

const PAGES: { path: string; heading: string }[] = [
  { path: "/dashboard", heading: "Dashboard" },
  { path: "/connect-bank", heading: "Connect a bank account" },
  { path: "/transactions", heading: "Transactions" },
  { path: "/budgets", heading: "Budgets" },
  { path: "/chat", heading: "Ask your money anything" },
  { path: "/alerts", heading: "Alerts" },
  { path: "/digest", heading: "Weekly digest" },
  { path: "/goals", heading: "Goals" },
  { path: "/subscriptions", heading: "Subscriptions" },
];

test("every core page is reachable and renders for a signed-in user", async ({ page, request }) => {
  await signInTestUser(page, request);

  for (const { path, heading } of PAGES) {
    const response = await page.goto(path);
    expect(response?.ok(), `${path} should respond 200`).toBe(true);
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
  }
});
