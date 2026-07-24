import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, plaidItems, accounts, transactions } from "@/db/schema";
import { runAnomalyDetector } from "@/agents/insights/anomaly-detector";
import { monthRange } from "@/lib/date-range";
import { seedCategoryId } from "../helpers/category";

const clerkUserId = `test_anomaly_${crypto.randomUUID()}`;
let userId: string;
let accountId: string;
let groceriesId: string;

describe("anomaly detector", () => {
  beforeAll(async () => {
    groceriesId = await seedCategoryId("Groceries");

    const [user] = await db.insert(users).values({ clerkUserId, email: "anomaly-test@example.com" }).returning();
    userId = user.id;
    const [item] = await db.insert(plaidItems).values({ userId, plaidItemId: `item_${userId}`, accessToken: "x" }).returning();
    const [account] = await db
      .insert(accounts)
      .values({ plaidItemId: item.id, userId, plaidAccountId: `acc_${userId}`, name: "Checking", type: "depository" })
      .returning();
    accountId = account.id;

    // Baseline history: ~$50 groceries transactions in prior months.
    const prior1 = monthRange(1).from;
    const prior2 = monthRange(2).from;
    await db.insert(transactions).values([
      { accountId, userId, plaidTransactionId: `hist1_${userId}`, amount: "50.00", date: prior1, name: "Grocery Store", categoryId: groceriesId },
      { accountId, userId, plaidTransactionId: `hist2_${userId}`, amount: "48.00", date: prior2, name: "Grocery Store", categoryId: groceriesId },
    ]);
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it("fires for a current-month charge well above the category's historical average", async () => {
    const current = monthRange(0).from;
    await db.insert(transactions).values({
      accountId,
      userId,
      plaidTransactionId: `anomaly_${userId}`,
      amount: "300.00",
      date: current,
      name: "Grocery Store",
      merchantName: "Grocery Store",
      categoryId: groceriesId,
    });

    const candidates = await runAnomalyDetector(userId);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].body).toContain("300.00");
  });

  it("stays silent for a current-month charge in line with history", async () => {
    const normalUserId = `test_anomaly_normal_${crypto.randomUUID()}`;
    const [user] = await db.insert(users).values({ clerkUserId: normalUserId, email: "anomaly-normal@example.com" }).returning();
    const [item] = await db.insert(plaidItems).values({ userId: user.id, plaidItemId: `item_${user.id}`, accessToken: "x" }).returning();
    const [account] = await db
      .insert(accounts)
      .values({ plaidItemId: item.id, userId: user.id, plaidAccountId: `acc_${user.id}`, name: "Checking", type: "depository" })
      .returning();

    await db.insert(transactions).values([
      { accountId: account.id, userId: user.id, plaidTransactionId: `n1_${user.id}`, amount: "50.00", date: monthRange(1).from, name: "Grocery Store", categoryId: groceriesId },
      { accountId: account.id, userId: user.id, plaidTransactionId: `n2_${user.id}`, amount: "48.00", date: monthRange(2).from, name: "Grocery Store", categoryId: groceriesId },
      { accountId: account.id, userId: user.id, plaidTransactionId: `n3_${user.id}`, amount: "52.00", date: monthRange(0).from, name: "Grocery Store", categoryId: groceriesId },
    ]);

    const candidates = await runAnomalyDetector(user.id);
    expect(candidates).toHaveLength(0);

    await db.delete(users).where(eq(users.clerkUserId, normalUserId));
  });
});
