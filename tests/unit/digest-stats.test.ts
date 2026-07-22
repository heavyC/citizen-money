import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, plaidItems, accounts, transactions } from "@/db/schema";
import { computeWeeklyStats } from "@/agents/digest/stats";

const clerkUserId = `test_digest_stats_${crypto.randomUUID()}`;
let userId: string;
let accountId: string;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

describe("computeWeeklyStats", () => {
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ clerkUserId, email: "digest-stats-test@example.com" }).returning();
    userId = user.id;
    const [item] = await db.insert(plaidItems).values({ userId, plaidItemId: `item_${userId}`, accessToken: "x" }).returning();
    const [account] = await db
      .insert(accounts)
      .values({ plaidItemId: item.id, userId, plaidAccountId: `acc_${userId}`, name: "Checking", type: "depository", currentBalance: "1000.00" })
      .returning();
    accountId = account.id;

    await db.insert(transactions).values([
      // This week: 100 groceries + 40 coffee = 140
      { accountId, userId, plaidTransactionId: `w1_${userId}`, amount: "100.00", date: daysAgo(2), name: "Grocery Store", category: "Groceries" },
      { accountId, userId, plaidTransactionId: `w2_${userId}`, amount: "40.00", date: daysAgo(1), name: "Coffee Shop", category: "Coffee Shops" },
      // Trailing weeks (8-28 days ago): 80 total -> avg weekly = 20
      { accountId, userId, plaidTransactionId: `t1_${userId}`, amount: "80.00", date: daysAgo(20), name: "Grocery Store", category: "Groceries" },
    ]);
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it("computes total spend, top category, and net worth correctly", async () => {
    const stats = await computeWeeklyStats(userId);
    expect(stats.totalSpend).toBeCloseTo(140, 2);
    expect(stats.topCategory?.category).toBe("Groceries");
    expect(stats.topCategory?.amount).toBeCloseTo(100, 2);
    expect(stats.netWorth).toBeCloseTo(1000, 2);
    expect(stats.avgWeeklySpend).toBeCloseTo(20, 2);
  });
});
