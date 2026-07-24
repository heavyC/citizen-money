import "server-only";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { monthRange } from "@/lib/date-range";
import type { InsightCandidate } from "./types";

const ANOMALY_MULTIPLIER = 2;
const MIN_HISTORY_SAMPLES = 2;

/** Flags current-month transactions well above the category's trailing average. */
export async function runAnomalyDetector(userId: string): Promise<InsightCandidate[]> {
  const current = monthRange(0);
  const historyStart = monthRange(3).from;

  const history = await db
    .select({
      categoryId: transactions.categoryId,
      avgAmount: sql<string>`avg(${transactions.amount})`,
      count: sql<string>`count(*)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, historyStart),
        lt(transactions.date, current.from),
        sql`${transactions.amount} > 0`,
      ),
    )
    .groupBy(transactions.categoryId);

  const baseline = new Map(
    history
      .filter((h) => Number(h.count) >= MIN_HISTORY_SAMPLES)
      .map((h) => [h.categoryId, Number(h.avgAmount)]),
  );

  if (baseline.size === 0) return [];

  const currentTxns = await db
    .select({
      id: transactions.id,
      name: transactions.name,
      merchantName: transactions.merchantName,
      amount: transactions.amount,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.userId, userId), gte(transactions.date, current.from), sql`${transactions.amount} > 0`));

  const candidates: InsightCandidate[] = [];
  for (const txn of currentTxns) {
    const avg = baseline.get(txn.categoryId);
    if (!avg) continue;
    const amount = Number(txn.amount);
    if (amount > avg * ANOMALY_MULTIPLIER) {
      candidates.push({
        type: "anomaly",
        title: "Unusual charge detected",
        body: `${txn.merchantName ?? txn.name} charged $${amount.toFixed(2)} in ${txn.categoryName}, well above your typical $${avg.toFixed(2)} for that category.`,
        severity: "warning",
        dedupKey: `anomaly:${txn.id}`,
        metadata: { transactionId: txn.id, amount, categoryAverage: avg },
      });
    }
  }
  return candidates;
}
