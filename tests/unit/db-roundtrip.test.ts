import { describe, expect, it, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, transactions, accounts, plaidItems } from "@/db/schema";
import { seedCategoryId } from "../helpers/category";

describe("db round-trip", () => {
  const clerkUserId = `test_${crypto.randomUUID()}`;

  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it("inserts and reads back a user, plaid item, account, and transaction", async () => {
    const [user] = await db
      .insert(users)
      .values({ clerkUserId, email: "roundtrip@example.com" })
      .returning();
    expect(user.id).toBeTruthy();

    const [item] = await db
      .insert(plaidItems)
      .values({
        userId: user.id,
        plaidItemId: `item_${user.id}`,
        accessToken: "access-sandbox-test",
      })
      .returning();

    const [account] = await db
      .insert(accounts)
      .values({
        plaidItemId: item.id,
        userId: user.id,
        plaidAccountId: `account_${user.id}`,
        name: "Test Checking",
        type: "depository",
        currentBalance: "1000.00",
      })
      .returning();

    const categoryId = await seedCategoryId("Groceries");
    const [txn] = await db
      .insert(transactions)
      .values({
        accountId: account.id,
        userId: user.id,
        plaidTransactionId: `txn_${user.id}`,
        amount: "42.50",
        date: "2026-07-01",
        name: "Test Merchant",
        categoryId,
      })
      .returning();

    const found = await db.query.transactions.findFirst({
      where: eq(transactions.id, txn.id),
    });

    expect(found?.name).toBe("Test Merchant");
    expect(found?.amount).toBe("42.50");
  });
});
