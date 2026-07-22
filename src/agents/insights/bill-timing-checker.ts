import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { monthRange } from "@/lib/date-range";
import type { InsightCandidate } from "./types";

const LARGE_TRANSACTION_THRESHOLD = 100;
const MIN_CLUSTERED_TRANSACTIONS = 2;

/** Flags same-day clusters of large charges this month (cash-flow timing risk). */
export async function runBillTimingChecker(userId: string): Promise<InsightCandidate[]> {
  const { from } = monthRange(0);

  const rows = await db.query.transactions.findMany({
    where: and(eq(transactions.userId, userId), gte(transactions.date, from), sql`${transactions.amount} >= ${LARGE_TRANSACTION_THRESHOLD}`),
  });

  const byDate = new Map<string, typeof rows>();
  for (const txn of rows) {
    const list = byDate.get(txn.date) ?? [];
    list.push(txn);
    byDate.set(txn.date, list);
  }

  const candidates: InsightCandidate[] = [];
  for (const [date, txns] of byDate) {
    if (txns.length < MIN_CLUSTERED_TRANSACTIONS) continue;
    const total = txns.reduce((sum, t) => sum + Number(t.amount), 0);
    candidates.push({
      type: "bill_timing",
      title: "Multiple large bills land the same day",
      body: `${txns.length} charges totaling $${total.toFixed(2)} all hit on ${date}. Watch your cash flow around that date.`,
      severity: "warning",
      dedupKey: `bill-timing:${date}`,
      metadata: { date, count: txns.length, total },
    });
  }
  return candidates;
}
