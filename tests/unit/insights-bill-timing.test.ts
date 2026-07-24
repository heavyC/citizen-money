import { describe, expect, it, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, plaidItems, accounts, transactions } from "@/db/schema";
import { runBillTimingChecker } from "@/agents/insights/bill-timing-checker";
import { monthRange } from "@/lib/date-range";
import { seedCategoryId } from "../helpers/category";

const clerkUserIds: string[] = [];

afterAll(async () => {
  for (const id of clerkUserIds) {
    await db.delete(users).where(eq(users.clerkUserId, id));
  }
});

async function setupUser(clerkUserId: string) {
  const [user] = await db.insert(users).values({ clerkUserId, email: `${clerkUserId}@example.com` }).returning();
  const [item] = await db.insert(plaidItems).values({ userId: user.id, plaidItemId: `item_${user.id}`, accessToken: "x" }).returning();
  const [account] = await db
    .insert(accounts)
    .values({ plaidItemId: item.id, userId: user.id, plaidAccountId: `acc_${user.id}`, name: "Checking", type: "depository" })
    .returning();
  return { userId: user.id, accountId: account.id };
}

describe("bill timing checker", () => {
  it("fires when two or more large bills land on the same day", async () => {
    const clerkUserId = `test_bill_timing_cluster_${crypto.randomUUID()}`;
    clerkUserIds.push(clerkUserId);
    const { userId, accountId } = await setupUser(clerkUserId);
    const date = monthRange(0).from;
    const rentId = await seedCategoryId("Rent/Mortgage");
    const insuranceId = await seedCategoryId("Insurance");

    await db.insert(transactions).values([
      { accountId, userId, plaidTransactionId: `b1_${userId}`, amount: "200.00", date, name: "Rent", categoryId: rentId },
      { accountId, userId, plaidTransactionId: `b2_${userId}`, amount: "150.00", date, name: "Car Insurance", categoryId: insuranceId },
    ]);

    const candidates = await runBillTimingChecker(userId);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].dedupKey).toBe(`bill-timing:${date}`);
  });

  it("stays silent when large bills land on different days", async () => {
    const clerkUserId = `test_bill_timing_spread_${crypto.randomUUID()}`;
    clerkUserIds.push(clerkUserId);
    const { userId, accountId } = await setupUser(clerkUserId);
    const { from, to } = monthRange(0);
    const rentId = await seedCategoryId("Rent/Mortgage");
    const insuranceId = await seedCategoryId("Insurance");

    await db.insert(transactions).values([
      { accountId, userId, plaidTransactionId: `s1_${userId}`, amount: "200.00", date: from, name: "Rent", categoryId: rentId },
      { accountId, userId, plaidTransactionId: `s2_${userId}`, amount: "150.00", date: to, name: "Car Insurance", categoryId: insuranceId },
    ]);

    const candidates = await runBillTimingChecker(userId);
    expect(candidates).toHaveLength(0);
  });
});
