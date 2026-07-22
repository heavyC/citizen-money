import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, plaidItems, accounts, transactions, budgets, goals } from "@/db/schema";
import { chatTools } from "@/agents/chat/tools";

function getTool(name: string) {
  const tool = chatTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
}

const clerkUserId = `test_chat_tools_${crypto.randomUUID()}`;
let userId: string;
let accountId: string;

function monthsAgoDate(monthsAgo: number, day: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, day);
  return d.toISOString().slice(0, 10);
}

describe("chat tools", () => {
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ clerkUserId, email: "chat-tools-test@example.com" }).returning();
    userId = user.id;

    const [item] = await db.insert(plaidItems).values({ userId, plaidItemId: `item_${userId}`, accessToken: "x" }).returning();
    const [account] = await db
      .insert(accounts)
      .values({ plaidItemId: item.id, userId, plaidAccountId: `acc_${userId}`, name: "Checking", type: "depository", currentBalance: "2500.00" })
      .returning();
    accountId = account.id;

    await db.insert(budgets).values({ userId, category: "Groceries", monthlyLimit: "300.00" });
    await db.insert(goals).values({ userId, name: "Vacation", goalType: "vacation", targetAmount: "2000.00", startingAmount: "500.00" });

    await db.insert(transactions).values([
      // Current month groceries: 150 total
      { accountId, userId, plaidTransactionId: `t1_${userId}`, amount: "100.00", date: monthsAgoDate(0, 3), name: "Grocery Store", category: "Groceries" },
      { accountId, userId, plaidTransactionId: `t2_${userId}`, amount: "50.00", date: monthsAgoDate(0, 10), name: "Grocery Store", category: "Groceries" },
      // Last month groceries: 60 total
      { accountId, userId, plaidTransactionId: `t3_${userId}`, amount: "60.00", date: monthsAgoDate(1, 5), name: "Grocery Store", category: "Groceries" },
      // Recurring subscription-like charge, same amount 3 months running
      { accountId, userId, plaidTransactionId: `t4_${userId}`, amount: "15.99", date: monthsAgoDate(0, 1), name: "Streamflix", merchantName: "Streamflix", category: "Subscriptions" },
      { accountId, userId, plaidTransactionId: `t5_${userId}`, amount: "15.99", date: monthsAgoDate(1, 1), name: "Streamflix", merchantName: "Streamflix", category: "Subscriptions" },
      { accountId, userId, plaidTransactionId: `t6_${userId}`, amount: "15.99", date: monthsAgoDate(2, 1), name: "Streamflix", merchantName: "Streamflix", category: "Subscriptions" },
    ]);
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it("query_transactions filters by category and totals correctly", async () => {
    const result = (await getTool("query_transactions").execute(userId, { category: "Groceries" })) as {
      count: number;
      total: number;
    };
    expect(result.count).toBe(3);
    expect(result.total).toBeCloseTo(210, 2);
  });

  it("calculate_budget_variance compares spend to the budget for the current month", async () => {
    const result = (await getTool("calculate_budget_variance").execute(userId, {
      category: "Groceries",
      period: "current_month",
    })) as { limit: number; spent: number; overBudget: boolean };
    expect(result.limit).toBe(300);
    expect(result.spent).toBeCloseTo(150, 2);
    expect(result.overBudget).toBe(false);
  });

  it("get_account_balances returns the user's accounts and net worth", async () => {
    const result = (await getTool("get_account_balances").execute(userId, {})) as { netWorth: number };
    expect(result.netWorth).toBeCloseTo(2500, 2);
  });

  it("get_goals_progress returns the user's goals", async () => {
    const result = (await getTool("get_goals_progress").execute(userId, {})) as { goals: { name: string }[] };
    expect(result.goals.some((g) => g.name === "Vacation")).toBe(true);
  });

  it("detect_recurring_charges flags the repeated same-amount merchant", async () => {
    const result = (await getTool("detect_recurring_charges").execute(userId, {})) as {
      recurringCharges: { merchant: string; occurrences: number }[];
    };
    const streamflix = result.recurringCharges.find((r) => r.merchant === "Streamflix");
    expect(streamflix?.occurrences).toBe(3);
  });

  it("compare_periods identifies Groceries as the biggest change vs last month", async () => {
    const result = (await getTool("compare_periods").execute(userId, {})) as {
      biggestChange: { category: string; delta: number } | null;
    };
    expect(result.biggestChange?.category).toBe("Groceries");
    expect(result.biggestChange?.delta).toBeCloseTo(90, 2);
  });
});
