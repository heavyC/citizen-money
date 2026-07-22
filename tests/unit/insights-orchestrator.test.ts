import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, plaidItems, accounts, transactions, budgets, insights } from "@/db/schema";
import { runInsightOrchestratorForUser } from "@/agents/insights/orchestrator";
import { monthRange } from "@/lib/date-range";

const clerkUserId = `test_orchestrator_${crypto.randomUUID()}`;
let userId: string;

describe("insight orchestrator", () => {
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ clerkUserId, email: "orchestrator-test@example.com" }).returning();
    userId = user.id;
    const [item] = await db.insert(plaidItems).values({ userId, plaidItemId: `item_${userId}`, accessToken: "x" }).returning();
    const [account] = await db
      .insert(accounts)
      .values({ plaidItemId: item.id, userId, plaidAccountId: `acc_${userId}`, name: "Checking", type: "depository", currentBalance: "50.00" })
      .returning();
    await db.insert(budgets).values({ userId, category: "Groceries", monthlyLimit: "50.00" });
    await db.insert(transactions).values({
      accountId: account.id,
      userId,
      plaidTransactionId: `t1_${userId}`,
      amount: "200.00",
      date: monthRange(0).from,
      name: "Grocery Store",
      category: "Groceries",
    });
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it("running twice on identical data produces each insight only once", async () => {
    const first = await runInsightOrchestratorForUser(userId);
    expect(first.newInsights).toBeGreaterThan(0);

    const second = await runInsightOrchestratorForUser(userId);
    expect(second.newInsights).toBe(0);

    const stored = await db.query.insights.findMany({ where: eq(insights.userId, userId) });
    const dedupKeys = stored.map((i) => i.dedupKey);
    expect(new Set(dedupKeys).size).toBe(dedupKeys.length);
  });
});
