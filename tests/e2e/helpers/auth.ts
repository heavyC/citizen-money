import type { Page, APIRequestContext } from "@playwright/test";

const CRON_SECRET = process.env.CRON_SECRET;

/** Signs `page` in as the fixed e2e test user via a Clerk sign-in ticket. */
export async function signInTestUser(page: Page, request: APIRequestContext) {
  const response = await request.post("/api/test/sign-in-token", {
    headers: { "x-test-secret": CRON_SECRET ?? "" },
  });
  if (!response.ok()) {
    throw new Error(`Failed to mint test sign-in token: ${response.status()} ${await response.text()}`);
  }
  const { ticket } = await response.json();

  await page.goto(`/sign-in?__clerk_ticket=${ticket}`);
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), { timeout: 15_000 });
}
