import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, plaidItems, accounts, transactions } from "@/db/schema";
import { getNetWorth, getSpendingByCategory } from "@/lib/finance";
import { seedCategoryId } from "../helpers/category";

const clerkUserIdA = `test_finance_a_${crypto.randomUUID()}`;
const clerkUserIdB = `test_finance_b_${crypto.randomUUID()}`;
let userAId: string;
let userBId: string;

describe("finance queries", () => {
  beforeAll(async () => {
    const [userA] = await db.insert(users).values({ clerkUserId: clerkUserIdA, email: "finance-a@example.com" }).returning();
    const [userB] = await db.insert(users).values({ clerkUserId: clerkUserIdB, email: "finance-b@example.com" }).returning();
    userAId = userA.id;
    userBId = userB.id;

    const [itemA] = await db.insert(plaidItems).values({ userId: userAId, plaidItemId: `item_a_${userAId}`, accessToken: "x" }).returning();
    const [itemB] = await db.insert(plaidItems).values({ userId: userBId, plaidItemId: `item_b_${userBId}`, accessToken: "x" }).returning();

    await db.insert(accounts).values([
      { plaidItemId: itemA.id, userId: userAId, plaidAccountId: `acc_a1_${userAId}`, name: "Checking A", type: "depository", currentBalance: "1000.00" },
      { plaidItemId: itemA.id, userId: userAId, plaidAccountId: `acc_a2_${userAId}`, name: "Savings A", type: "depository", currentBalance: "500.50" },
      { plaidItemId: itemB.id, userId: userBId, plaidAccountId: `acc_b1_${userBId}`, name: "Checking B", type: "depository", currentBalance: "9999.00" },
    ]);

    const [accountA1] = await db.select().from(accounts).where(eq(accounts.plaidAccountId, `acc_a1_${userAId}`));

    const groceriesId = await seedCategoryId("Groceries");
    const coffeeId = await seedCategoryId("Coffee Shops");

    await db.insert(transactions).values([
      { accountId: accountA1.id, userId: userAId, plaidTransactionId: `txn1_${userAId}`, amount: "40.00", date: "2026-07-01", name: "Groceries A", categoryId: groceriesId },
      { accountId: accountA1.id, userId: userAId, plaidTransactionId: `txn2_${userAId}`, amount: "60.00", date: "2026-07-05", name: "Groceries B", categoryId: groceriesId },
      { accountId: accountA1.id, userId: userAId, plaidTransactionId: `txn3_${userAId}`, amount: "25.00", date: "2026-07-10", name: "Coffee", categoryId: coffeeId },
      // A refund/inflow (negative amount) should not count as spend.
      { accountId: accountA1.id, userId: userAId, plaidTransactionId: `txn4_${userAId}`, amount: "-15.00", date: "2026-07-12", name: "Refund", categoryId: groceriesId },
    ]);
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserIdA));
    await db.delete(users).where(eq(users.clerkUserId, clerkUserIdB));
  });

  it("sums net worth only across the signed-in user's own accounts", async () => {
    expect(await getNetWorth(userAId)).toBeCloseTo(1500.5, 2);
    expect(await getNetWorth(userBId)).toBeCloseTo(9999, 2);
  });

  it("groups spending by category, excluding non-positive (inflow) amounts", async () => {
    const spending = await getSpendingByCategory(userAId);
    const groceries = spending.find((s) => s.category === "Groceries");
    const coffee = spending.find((s) => s.category === "Coffee Shops");

    expect(groceries?.total).toBeCloseTo(100, 2);
    expect(coffee?.total).toBeCloseTo(25, 2);
  });
});
