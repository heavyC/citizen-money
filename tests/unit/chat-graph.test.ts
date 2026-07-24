import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, plaidItems, accounts, transactions, goals } from "@/db/schema";
import { runChatTurn } from "@/agents/chat/graph";
import { seedCategoryId } from "../helpers/category";

const clerkUserId = `test_chat_graph_${crypto.randomUUID()}`;
let userId: string;
let accountId: string;

function monthsAgoDate(monthsAgo: number, day: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, day);
  return d.toISOString().slice(0, 10);
}

describe("chat graph end-to-end (real Claude)", () => {
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ clerkUserId, email: "chat-graph-test@example.com" }).returning();
    userId = user.id;

    const [item] = await db.insert(plaidItems).values({ userId, plaidItemId: `item_${userId}`, accessToken: "x" }).returning();
    const [account] = await db
      .insert(accounts)
      .values({ plaidItemId: item.id, userId, plaidAccountId: `acc_${userId}`, name: "Checking", type: "depository", currentBalance: "1000.00" })
      .returning();
    accountId = account.id;

    await db.insert(goals).values({
      userId,
      name: "Vacation",
      goalType: "vacation",
      targetAmount: "2000.00",
      startingAmount: "1200.00",
      targetDate: monthsAgoDate(-6, 1),
    });

    const groceriesId = await seedCategoryId("Groceries");
    const shoppingId = await seedCategoryId("Shopping");

    await db.insert(transactions).values([
      { accountId, userId, plaidTransactionId: `t1_${userId}`, amount: "80.00", date: monthsAgoDate(0, 3), name: "Grocery Store", categoryId: groceriesId },
      { accountId, userId, plaidTransactionId: `t2_${userId}`, amount: "45.00", date: monthsAgoDate(1, 3), name: "Grocery Store", categoryId: groceriesId },
      { accountId, userId, plaidTransactionId: `t3_${userId}`, amount: "40.00", date: monthsAgoDate(2, 3), name: "Grocery Store", categoryId: groceriesId },
      { accountId, userId, plaidTransactionId: `t4_${userId}`, amount: "300.00", date: monthsAgoDate(0, 5), name: "Home Depot", categoryId: shoppingId },
    ]);
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it(
    "answers a grocery-spend question grounded in the real transaction total",
    async () => {
      const { reply } = await runChatTurn(userId, [], "How much did I spend on groceries in the last 3 months?");
      expect(reply).toMatch(/165/);
    },
    30_000,
  );

  it(
    "answers a goal-progress question citing the real target and current amounts",
    async () => {
      const { reply } = await runChatTurn(userId, [], "Am I on track to hit my vacation savings goal?");
      expect(reply).toMatch(/1,?200/);
      expect(reply).toMatch(/2,?000/);
    },
    30_000,
  );

  it(
    "answers a biggest-spending-change question naming the right category",
    async () => {
      const { reply } = await runChatTurn(userId, [], "What's my biggest spending change vs last month?");
      expect(reply.toLowerCase()).toMatch(/shopping/);
    },
    30_000,
  );
});
