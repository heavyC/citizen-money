import { describe, expect, it, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { Products } from "plaid";
import { db } from "@/db";
import { users, plaidItems, accounts, transactions } from "@/db/schema";
import { plaidClient, exchangePublicToken } from "@/lib/plaid";
import { syncItemTransactions } from "@/lib/plaid-sync";

const clerkUserId = `test_plaid_sandbox_${crypto.randomUUID()}`;

describe("Plaid sandbox end-to-end", () => {
  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it(
    "links a real sandbox item, exchanges the token, and syncs categorized transactions",
    async () => {
      const [user] = await db.insert(users).values({ clerkUserId, email: "plaid-sandbox-test@example.com" }).returning();

      // Plaid's sandbox-only shortcut for `user_good`/`pass_good` Link flow,
      // skipping the Link UI so this can run headlessly.
      const sandboxTokenResponse = await plaidClient.sandboxPublicTokenCreate({
        institution_id: "ins_109508",
        initial_products: [Products.Transactions],
      });

      const { accessToken, plaidItemId } = await exchangePublicToken(sandboxTokenResponse.data.public_token);
      expect(accessToken).toBeTruthy();

      const [item] = await db
        .insert(plaidItems)
        .values({ userId: user.id, plaidItemId, accessToken, institutionName: "Sandbox Bank" })
        .returning();

      const result = await syncItemTransactions(item.id);
      expect(result.syncedTransactions).toBeGreaterThan(0);

      const syncedAccounts = await db.query.accounts.findMany({ where: eq(accounts.userId, user.id) });
      expect(syncedAccounts.length).toBeGreaterThan(0);

      const syncedTransactions = await db.query.transactions.findMany({ where: eq(transactions.userId, user.id) });
      expect(syncedTransactions.length).toBeGreaterThan(0);
      for (const txn of syncedTransactions) {
        expect(txn.categoryId).toBeTruthy();
      }
      expect(syncedTransactions.some((txn) => txn.plaidCategoryConfidence !== null)).toBe(true);
    },
    90_000,
  );
});
