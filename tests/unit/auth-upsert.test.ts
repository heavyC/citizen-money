import { describe, expect, it, vi, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const clerkUserId = `test_upsert_${crypto.randomUUID()}`;

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: clerkUserId })),
  currentUser: vi.fn(async () => ({
    primaryEmailAddress: { emailAddress: "upsert-test@example.com" },
    emailAddresses: [],
  })),
}));

const { requireUserId } = await import("@/lib/auth");

describe("requireUserId upsert idempotency", () => {
  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it("creates exactly one users row across repeated calls for the same Clerk user", async () => {
    const firstId = await requireUserId();
    const secondId = await requireUserId();

    expect(secondId).toBe(firstId);

    const rows = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId));
    expect(rows).toHaveLength(1);
  });
});
