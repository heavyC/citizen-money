import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, plaidItems, accounts, transactions, budgets } from "@/db/schema";
import { runBudgetVarianceChecker } from "@/agents/insights/budget-variance-checker";
import { monthRange } from "@/lib/date-range";

const clerkUserId = `test_budget_variance_${crypto.randomUUID()}`;
let userId: string;
let accountId: string;

describe("budget variance checker", () => {
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ clerkUserId, email: "budget-variance-test@example.com" }).returning();
    userId = user.id;
    const [item] = await db.insert(plaidItems).values({ userId, plaidItemId: `item_${userId}`, accessToken: "x" }).returning();
    const [account] = await db
      .insert(accounts)
      .values({ plaidItemId: item.id, userId, plaidAccountId: `acc_${userId}`, name: "Checking", type: "depository" })
      .returning();
    accountId = account.id;
    await db.insert(budgets).values({ userId, category: "Groceries", monthlyLimit: "100.00" });
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it("fires when current-month spend exceeds the budget", async () => {
    await db.insert(transactions).values({
      accountId,
      userId,
      plaidTransactionId: `over_${userId}`,
      amount: "150.00",
      date: monthRange(0).from,
      name: "Grocery Store",
      category: "Groceries",
    });

    const candidates = await runBudgetVarianceChecker(userId);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].dedupKey).toMatch(/^budget-variance:Groceries:/);
  });

  it("stays silent when spend is under the budget", async () => {
    const underUserId = `test_budget_variance_under_${crypto.randomUUID()}`;
    const [user] = await db.insert(users).values({ clerkUserId: underUserId, email: "budget-variance-under@example.com" }).returning();
    const [item] = await db.insert(plaidItems).values({ userId: user.id, plaidItemId: `item_${user.id}`, accessToken: "x" }).returning();
    const [account] = await db
      .insert(accounts)
      .values({ plaidItemId: item.id, userId: user.id, plaidAccountId: `acc_${user.id}`, name: "Checking", type: "depository" })
      .returning();
    await db.insert(budgets).values({ userId: user.id, category: "Groceries", monthlyLimit: "500.00" });
    await db.insert(transactions).values({
      accountId: account.id,
      userId: user.id,
      plaidTransactionId: `under_${user.id}`,
      amount: "50.00",
      date: monthRange(0).from,
      name: "Grocery Store",
      category: "Groceries",
    });

    const candidates = await runBudgetVarianceChecker(user.id);
    expect(candidates).toHaveLength(0);

    await db.delete(users).where(eq(users.clerkUserId, underUserId));
  });
});
