import { describe, expect, it, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, plaidItems, accounts } from "@/db/schema";
import { runSavingsOpportunityFinder } from "@/agents/insights/savings-opportunity-finder";

const clerkUserIds: string[] = [];

afterAll(async () => {
  for (const id of clerkUserIds) {
    await db.delete(users).where(eq(users.clerkUserId, id));
  }
});

describe("savings opportunity finder", () => {
  it("fires for a checking account sitting on a large idle balance", async () => {
    const clerkUserId = `test_savings_high_${crypto.randomUUID()}`;
    clerkUserIds.push(clerkUserId);
    const [user] = await db.insert(users).values({ clerkUserId, email: "savings-high@example.com" }).returning();
    const [item] = await db.insert(plaidItems).values({ userId: user.id, plaidItemId: `item_${user.id}`, accessToken: "x" }).returning();
    await db.insert(accounts).values({
      plaidItemId: item.id,
      userId: user.id,
      plaidAccountId: `acc_${user.id}`,
      name: "Checking",
      type: "depository",
      subtype: "checking",
      currentBalance: "5000.00",
    });

    const candidates = await runSavingsOpportunityFinder(user.id);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].body).toContain("5000.00");
  });

  it("stays silent for a modest checking balance", async () => {
    const clerkUserId = `test_savings_low_${crypto.randomUUID()}`;
    clerkUserIds.push(clerkUserId);
    const [user] = await db.insert(users).values({ clerkUserId, email: "savings-low@example.com" }).returning();
    const [item] = await db.insert(plaidItems).values({ userId: user.id, plaidItemId: `item_${user.id}`, accessToken: "x" }).returning();
    await db.insert(accounts).values({
      plaidItemId: item.id,
      userId: user.id,
      plaidAccountId: `acc_${user.id}`,
      name: "Checking",
      type: "depository",
      subtype: "checking",
      currentBalance: "500.00",
    });

    const candidates = await runSavingsOpportunityFinder(user.id);
    expect(candidates).toHaveLength(0);
  });

  it("stays silent for a savings account regardless of balance", async () => {
    const clerkUserId = `test_savings_subtype_${crypto.randomUUID()}`;
    clerkUserIds.push(clerkUserId);
    const [user] = await db.insert(users).values({ clerkUserId, email: "savings-subtype@example.com" }).returning();
    const [item] = await db.insert(plaidItems).values({ userId: user.id, plaidItemId: `item_${user.id}`, accessToken: "x" }).returning();
    await db.insert(accounts).values({
      plaidItemId: item.id,
      userId: user.id,
      plaidAccountId: `acc_${user.id}`,
      name: "Savings",
      type: "depository",
      subtype: "savings",
      currentBalance: "5000.00",
    });

    const candidates = await runSavingsOpportunityFinder(user.id);
    expect(candidates).toHaveLength(0);
  });
});
