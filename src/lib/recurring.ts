import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { normalizeMerchantName } from "@/lib/categorize";
import { monthRange } from "@/lib/date-range";

export interface RecurringMerchant {
  merchantNormalized: string;
  merchantName: string;
  occurrences: number;
  averageAmount: number;
  firstSeenDate: string;
  lastSeenDate: string;
}

/** Merchants charging a near-constant amount at least twice in the trailing `months`. */
export async function detectRecurringMerchants(userId: string, months = 6): Promise<RecurringMerchant[]> {
  const since = monthRange(months - 1).from;

  const rows = await db.query.transactions.findMany({
    where: and(eq(transactions.userId, userId), gte(transactions.date, since), sql`${transactions.amount} > 0`),
  });

  const byMerchant = new Map<string, { name: string; amounts: number[]; dates: string[] }>();
  for (const txn of rows) {
    const key = normalizeMerchantName(txn.merchantName ?? txn.name);
    const entry = byMerchant.get(key) ?? { name: txn.merchantName ?? txn.name, amounts: [], dates: [] };
    entry.amounts.push(Number(txn.amount));
    entry.dates.push(txn.date);
    byMerchant.set(key, entry);
  }

  return [...byMerchant.entries()]
    .filter(([, entry]) => entry.amounts.length >= 2)
    .filter(([, entry]) => {
      const avg = entry.amounts.reduce((a, b) => a + b, 0) / entry.amounts.length;
      return entry.amounts.every((amt) => Math.abs(amt - avg) / avg < 0.1);
    })
    .map(([key, entry]) => ({
      merchantNormalized: key,
      merchantName: entry.name,
      occurrences: entry.amounts.length,
      averageAmount: entry.amounts.reduce((a, b) => a + b, 0) / entry.amounts.length,
      firstSeenDate: entry.dates.sort()[0],
      lastSeenDate: entry.dates.sort().at(-1)!,
    }));
}
