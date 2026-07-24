import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { plaidItems, accounts, transactions } from "@/db/schema";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { getOrCreateCategoryId } from "@/lib/category-repo";

/**
 * Test-only: ensures the signed-in test user has at least one transaction to
 * exercise UI flows against (e.g. category correction), without requiring a
 * full Plaid Link run in every Playwright test. Disabled outside development
 * and requires a shared secret.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const secret = request.headers.get("x-test-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = await requireUserId();

    const existing = await db.query.transactions.findFirst({ where: eq(transactions.userId, userId) });
    if (existing) {
      return NextResponse.json({ transactionId: existing.id });
    }

    let item = await db.query.plaidItems.findFirst({ where: eq(plaidItems.userId, userId) });
    if (!item) {
      [item] = await db
        .insert(plaidItems)
        .values({ userId, plaidItemId: `test_item_${userId}`, accessToken: "test-access-token" })
        .returning();
    }

    let account = await db.query.accounts.findFirst({ where: eq(accounts.userId, userId) });
    if (!account) {
      [account] = await db
        .insert(accounts)
        .values({ plaidItemId: item.id, userId, plaidAccountId: `test_account_${userId}`, name: "Test Checking", type: "depository", currentBalance: "1000.00" })
        .returning();
    }

    const categoryId = await getOrCreateCategoryId("Shopping");
    const [txn] = await db
      .insert(transactions)
      .values({
        accountId: account.id,
        userId,
        plaidTransactionId: `test_txn_${crypto.randomUUID()}`,
        amount: "25.00",
        date: new Date().toISOString().slice(0, 10),
        name: "Test Merchant",
        categoryId,
      })
      .returning();

    return NextResponse.json({ transactionId: txn.id });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
