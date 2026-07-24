import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, plaidItems, accounts, transactions, subscriptions } from "@/db/schema";
import { runSubscriptionScanner } from "@/agents/insights/subscription-scanner";
import { monthRange } from "@/lib/date-range";
import { seedCategoryId } from "../helpers/category";

const clerkUserId = `test_subscription_${crypto.randomUUID()}`;
let userId: string;
let accountId: string;

describe("subscription scanner", () => {
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ clerkUserId, email: "subscription-test@example.com" }).returning();
    userId = user.id;
    const [item] = await db.insert(plaidItems).values({ userId, plaidItemId: `item_${userId}`, accessToken: "x" }).returning();
    const [account] = await db
      .insert(accounts)
      .values({ plaidItemId: item.id, userId, plaidAccountId: `acc_${userId}`, name: "Checking", type: "depository" })
      .returning();
    accountId = account.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it("fires for a merchant charging the same amount repeatedly", async () => {
    const subscriptionsId = await seedCategoryId("Subscriptions");
    await db.insert(transactions).values([
      { accountId, userId, plaidTransactionId: `s1_${userId}`, amount: "15.99", date: monthRange(0).from, name: "Streamflix", merchantName: "Streamflix", categoryId: subscriptionsId },
      { accountId, userId, plaidTransactionId: `s2_${userId}`, amount: "15.99", date: monthRange(1).from, name: "Streamflix", merchantName: "Streamflix", categoryId: subscriptionsId },
    ]);

    const candidates = await runSubscriptionScanner(userId);
    expect(candidates.some((c) => c.dedupKey.startsWith("subscription-new:"))).toBe(true);
    expect(candidates.some((c) => c.dedupKey.startsWith("subscription-total:"))).toBe(true);

    const stored = await db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, userId) });
    expect(stored).toBeTruthy();
  });

  it("stays silent for a merchant seen only once", async () => {
    const soloUserId = `test_subscription_solo_${crypto.randomUUID()}`;
    const [user] = await db.insert(users).values({ clerkUserId: soloUserId, email: "subscription-solo@example.com" }).returning();
    const [item] = await db.insert(plaidItems).values({ userId: user.id, plaidItemId: `item_${user.id}`, accessToken: "x" }).returning();
    const [account] = await db
      .insert(accounts)
      .values({ plaidItemId: item.id, userId: user.id, plaidAccountId: `acc_${user.id}`, name: "Checking", type: "depository" })
      .returning();

    const shoppingId = await seedCategoryId("Shopping");
    await db.insert(transactions).values({
      accountId: account.id,
      userId: user.id,
      plaidTransactionId: `solo_${user.id}`,
      amount: "15.99",
      date: monthRange(0).from,
      name: "One Time Shop",
      categoryId: shoppingId,
    });

    const candidates = await runSubscriptionScanner(user.id);
    expect(candidates).toHaveLength(0);

    await db.delete(users).where(eq(users.clerkUserId, soloUserId));
  });
});
