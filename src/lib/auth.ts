import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

/**
 * Resolves the app-level `users.id` for the signed-in Clerk user, creating
 * the row on first call (no Clerk webhook needed for this MVP).
 *
 * Throws `UnauthorizedError` if there is no session. Server Components /
 * Pages should call `await auth.protect()` first, which redirects to sign-in
 * instead; Route Handlers should catch `UnauthorizedError` and respond 401.
 */
export async function requireUserId(): Promise<string> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    throw new UnauthorizedError();
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  if (existing) {
    return existing.id;
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error("Clerk user has no email address");
  }

  const [created] = await db
    .insert(users)
    .values({ clerkUserId, email })
    .onConflictDoNothing({ target: users.clerkUserId })
    .returning();

  if (created) {
    return created.id;
  }

  // Lost a race with a concurrent request that inserted first.
  const raced = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  if (!raced) {
    throw new Error("Failed to resolve user after insert race");
  }
  return raced.id;
}
