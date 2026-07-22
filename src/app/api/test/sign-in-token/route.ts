import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

const TEST_USER_EMAIL = "e2e-test@example.com";

/**
 * Test-only: mints a Clerk sign-in ticket for a fixed test user so Playwright
 * can authenticate without driving Clerk's hosted sign-up UI. Disabled
 * outside development and requires a shared secret.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const secret = request.headers.get("x-test-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();

  async function findTestUser() {
    const existing = await client.users.getUserList({ emailAddress: [TEST_USER_EMAIL] });
    return existing.data[0];
  }

  let user = await findTestUser();
  if (!user) {
    try {
      user = await client.users.createUser({
        emailAddress: [TEST_USER_EMAIL],
        password: crypto.randomUUID(),
        skipPasswordChecks: true,
      });
    } catch {
      // Lost a race with a concurrent request creating the same test user.
      user = await findTestUser();
    }
  }
  if (!user) {
    return NextResponse.json({ error: "Failed to resolve test user" }, { status: 500 });
  }

  const signInToken = await client.signInTokens.createSignInToken({
    userId: user.id,
    expiresInSeconds: 60,
  });

  return NextResponse.json({ ticket: signInToken.token });
}
