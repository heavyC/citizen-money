import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, plaidItems, transactions } from "@/db/schema";

const syncTransactionsMock = vi.fn();
vi.mock("@/lib/plaid", () => ({ syncTransactions: syncTransactionsMock }));

const { syncItemTransactions } = await import("@/lib/plaid-sync");

const clerkUserId = `test_plaid_confidence_${crypto.randomUUID()}`;
let userId: string;
let itemId: string;

function page(overrides: Partial<Parameters<typeof syncTransactionsMock>[0]> = {}) {
  return {
    accounts: [
      {
        account_id: "acc_1",
        name: "Checking",
        official_name: null,
        type: "depository",
        subtype: "checking",
        balances: { current: 100, available: 100, iso_currency_code: "USD" },
      },
    ],
    added: [],
    modified: [],
    removed: [],
    next_cursor: "cursor_1",
    has_more: false,
    ...overrides,
  };
}

describe("plaidCategoryConfidence persistence", () => {
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ clerkUserId, email: "plaid-confidence-test@example.com" }).returning();
    userId = user.id;
    const [item] = await db.insert(plaidItems).values({ userId, plaidItemId: `item_${userId}`, accessToken: "x" }).returning();
    itemId = item.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it("stores the confidence level from Plaid on insert", async () => {
    syncTransactionsMock.mockResolvedValueOnce(
      page({
        added: [
          {
            transaction_id: `txn_${userId}`,
            account_id: "acc_1",
            amount: 42,
            iso_currency_code: "USD",
            date: "2026-07-01",
            authorized_date: null,
            name: "Coffee Shop",
            merchant_name: "Coffee Shop",
            pending: false,
            personal_finance_category: { detailed: "FOOD_AND_DRINK_COFFEE", confidence_level: "VERY_HIGH" },
          },
        ],
      }),
    );

    await syncItemTransactions(itemId);

    const txn = await db.query.transactions.findFirst({ where: eq(transactions.plaidTransactionId, `txn_${userId}`) });
    expect(txn?.plaidCategoryConfidence).toBe("VERY_HIGH");
  });

  it("updates the confidence level when Plaid reports a modified transaction", async () => {
    syncTransactionsMock.mockResolvedValueOnce(
      page({
        modified: [
          {
            transaction_id: `txn_${userId}`,
            account_id: "acc_1",
            amount: 42,
            iso_currency_code: "USD",
            date: "2026-07-01",
            authorized_date: null,
            name: "Coffee Shop",
            merchant_name: "Coffee Shop",
            pending: false,
            personal_finance_category: { detailed: "FOOD_AND_DRINK_COFFEE", confidence_level: "LOW" },
          },
        ],
      }),
    );

    await syncItemTransactions(itemId);

    const txn = await db.query.transactions.findFirst({ where: eq(transactions.plaidTransactionId, `txn_${userId}`) });
    expect(txn?.plaidCategoryConfidence).toBe("LOW");
  });
});
