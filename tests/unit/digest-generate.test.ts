import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, plaidItems, accounts, transactions } from "@/db/schema";
import { generateWeeklyDigest } from "@/agents/digest/generate";
import { seedCategoryId } from "../helpers/category";

const clerkUserId = `test_digest_generate_${crypto.randomUUID()}`;
let userId: string;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

describe("generateWeeklyDigest (real Claude)", () => {
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ clerkUserId, email: "digest-generate-test@example.com" }).returning();
    userId = user.id;
    const [item] = await db.insert(plaidItems).values({ userId, plaidItemId: `item_${userId}`, accessToken: "x" }).returning();
    const [account] = await db
      .insert(accounts)
      .values({ plaidItemId: item.id, userId, plaidAccountId: `acc_${userId}`, name: "Checking", type: "depository", currentBalance: "1000.00" })
      .returning();

    const categoryId = await seedCategoryId("Shopping");
    await db.insert(transactions).values({
      accountId: account.id,
      userId,
      plaidTransactionId: `w1_${userId}`,
      amount: "247.00",
      date: daysAgo(2),
      name: "Home Depot",
      categoryId,
    });
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it(
    "narrates using the real computed total spend and is idempotent for the same period",
    async () => {
      const digest = await generateWeeklyDigest(userId);
      expect(digest?.narrative).toMatch(/247/);

      const again = await generateWeeklyDigest(userId);
      expect(again?.id).toBe(digest?.id);
    },
    30_000,
  );
});
