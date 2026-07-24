import { describe, expect, it, vi, afterAll, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, plaidItems, accounts, transactions } from "@/db/schema";
import { seedCategoryId } from "../helpers/category";

const createMock = vi.fn(async () => ({
  content: [{ type: "text", text: '{"category": "Other"}' }],
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: createMock };
  },
}));

const { resolveCategory } = await import("@/lib/categorize");
const { applyCategoryCorrection } = await import("@/lib/categorize");

const clerkUserId = `test_correction_${crypto.randomUUID()}`;
let userId: string;
let accountId: string;

describe("category correction feedback loop", () => {
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ clerkUserId, email: "correction-test@example.com" }).returning();
    userId = user.id;

    const [item] = await db
      .insert(plaidItems)
      .values({ userId, plaidItemId: `item_${userId}`, accessToken: "access-test" })
      .returning();

    const [account] = await db
      .insert(accounts)
      .values({
        plaidItemId: item.id,
        userId,
        plaidAccountId: `account_${userId}`,
        name: "Test Checking",
        type: "depository",
      })
      .returning();
    accountId = account.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it("a manual correction updates the transaction and auto-resolves future same-merchant transactions with no extra AI call", async () => {
    const otherId = await seedCategoryId("Other");
    const subscriptionsId = await seedCategoryId("Subscriptions");

    const [txn] = await db
      .insert(transactions)
      .values({
        accountId,
        userId,
        plaidTransactionId: `txn_original_${userId}`,
        amount: "19.99",
        date: "2026-07-01",
        name: "WEIRD MERCHANT CODE 123",
        merchantName: "Weird Merchant",
        categoryId: otherId,
        categorySource: "plaid",
      })
      .returning();

    await applyCategoryCorrection({ userId, transactionId: txn.id, categoryId: subscriptionsId });

    const updated = await db.query.transactions.findFirst({ where: eq(transactions.id, txn.id) });
    expect(updated?.categoryId).toBe(subscriptionsId);
    expect(updated?.categorySource).toBe("user_correction");

    createMock.mockClear();

    const resolved = await resolveCategory({
      userId,
      name: "WEIRD MERCHANT CODE 456",
      merchantName: "Weird Merchant",
      amount: 19.99,
      plaidDetailedCategory: "GENERAL_MERCHANDISE_OTHER",
      plaidConfidenceLevel: "LOW",
    });

    expect(resolved).toEqual({ categoryId: subscriptionsId, source: "user_correction" });
    expect(createMock).not.toHaveBeenCalled();
  });
});
