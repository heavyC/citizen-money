import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, plaidItems, transactions } from "@/db/schema";
import { syncTransactions } from "@/lib/plaid";
import { resolveCategory } from "@/lib/categorize";

async function upsertAccount(userId: string, plaidItemRowId: string, account: {
  account_id: string;
  name: string;
  official_name?: string | null;
  type: string;
  subtype?: string | null;
  balances: { current: number | null; available: number | null; iso_currency_code: string | null };
}) {
  const [row] = await db
    .insert(accounts)
    .values({
      plaidItemId: plaidItemRowId,
      userId,
      plaidAccountId: account.account_id,
      name: account.name,
      officialName: account.official_name ?? null,
      type: account.type,
      subtype: account.subtype ?? null,
      currentBalance: account.balances.current?.toString() ?? null,
      availableBalance: account.balances.available?.toString() ?? null,
      isoCurrencyCode: account.balances.iso_currency_code ?? "USD",
    })
    .onConflictDoUpdate({
      target: accounts.plaidAccountId,
      set: {
        name: account.name,
        officialName: account.official_name ?? null,
        currentBalance: account.balances.current?.toString() ?? null,
        availableBalance: account.balances.available?.toString() ?? null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: accounts.id });
  return row.id;
}

/**
 * Pages through Plaid's `/transactions/sync` for one item until caught up,
 * persisting accounts/transactions and resolving categories for new ones.
 */
export async function syncItemTransactions(plaidItemRowId: string) {
  const item = await db.query.plaidItems.findFirst({ where: eq(plaidItems.id, plaidItemRowId) });
  if (!item) {
    throw new Error("Plaid item not found");
  }

  let cursor = item.syncCursor ?? undefined;
  let hasMore = true;
  const accountIdByPlaidId = new Map<string, string>();
  let addedOrModifiedCount = 0;
  let firstPage: Awaited<ReturnType<typeof syncTransactions>> | undefined;

  // Freshly linked (sandbox) items can take a few seconds before
  // /transactions/sync has data ready; retry the first page only.
  if (!item.syncCursor) {
    for (let attempt = 0; attempt < 5; attempt++) {
      firstPage = await syncTransactions(item.accessToken);
      if (firstPage.added.length > 0 || firstPage.has_more) break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  while (hasMore) {
    const page = firstPage ?? (await syncTransactions(item.accessToken, cursor));
    firstPage = undefined;

    for (const account of page.accounts) {
      const rowId = await upsertAccount(item.userId, plaidItemRowId, account);
      accountIdByPlaidId.set(account.account_id, rowId);
    }

    for (const txn of [...page.added, ...page.modified]) {
      const accountRowId = accountIdByPlaidId.get(txn.account_id);
      if (!accountRowId) continue;

      const { category, source } = await resolveCategory({
        userId: item.userId,
        name: txn.name,
        merchantName: txn.merchant_name,
        amount: txn.amount,
        plaidDetailedCategory: txn.personal_finance_category?.detailed ?? null,
        plaidConfidenceLevel: txn.personal_finance_category?.confidence_level ?? null,
      });

      await db
        .insert(transactions)
        .values({
          accountId: accountRowId,
          userId: item.userId,
          plaidTransactionId: txn.transaction_id,
          amount: txn.amount.toString(),
          isoCurrencyCode: txn.iso_currency_code ?? "USD",
          date: txn.date,
          authorizedDate: txn.authorized_date ?? null,
          name: txn.name,
          merchantName: txn.merchant_name ?? null,
          plaidCategory: txn.personal_finance_category?.detailed ?? null,
          category,
          categorySource: source,
          pending: txn.pending,
        })
        .onConflictDoUpdate({
          target: transactions.plaidTransactionId,
          set: {
            amount: txn.amount.toString(),
            name: txn.name,
            merchantName: txn.merchant_name ?? null,
            pending: txn.pending,
            updatedAt: new Date(),
          },
        });
      addedOrModifiedCount += 1;
    }

    for (const removed of page.removed) {
      if (!removed.transaction_id) continue;
      await db.delete(transactions).where(eq(transactions.plaidTransactionId, removed.transaction_id));
    }

    cursor = page.next_cursor;
    hasMore = page.has_more;
  }

  await db.update(plaidItems).set({ syncCursor: cursor, updatedAt: new Date() }).where(eq(plaidItems.id, plaidItemRowId));

  return { syncedTransactions: addedOrModifiedCount };
}
