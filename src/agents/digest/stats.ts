import "server-only";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, transactions } from "@/db/schema";
import { getNetWorth } from "@/lib/finance";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface WeeklyStats {
  periodStart: string;
  periodEnd: string;
  totalSpend: number;
  avgWeeklySpend: number;
  pctChangeFromAvg: number;
  topCategory: { category: string; amount: number } | null;
  newSubscriptions: string[];
  netWorth: number;
}

/** Computes this week's stats vs the trailing-4-week average, all via SQL — no LLM involved. */
export async function computeWeeklyStats(userId: string): Promise<WeeklyStats> {
  const now = new Date();
  const periodEnd = isoDate(now);
  const periodStartDate = new Date(now);
  periodStartDate.setDate(periodStartDate.getDate() - 6);
  const periodStart = isoDate(periodStartDate);

  const trailingStartDate = new Date(now);
  trailingStartDate.setDate(trailingStartDate.getDate() - 28);
  const trailingStart = isoDate(trailingStartDate);

  const [weekRows, categoryRows, trailingRows, subs, netWorth] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), gte(transactions.date, periodStart), lte(transactions.date, periodEnd), sql`${transactions.amount} > 0`)),
    db
      .select({ category: transactions.category, total: sql<string>`sum(${transactions.amount})` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), gte(transactions.date, periodStart), lte(transactions.date, periodEnd), sql`${transactions.amount} > 0`))
      .groupBy(transactions.category)
      .orderBy(sql`sum(${transactions.amount}) desc`)
      .limit(1),
    db
      .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), gte(transactions.date, trailingStart), lte(transactions.date, periodStart), sql`${transactions.amount} > 0`)),
    db.query.subscriptions.findMany({
      where: and(eq(subscriptions.userId, userId), gte(subscriptions.firstSeenDate, periodStart)),
    }),
    getNetWorth(userId),
  ]);

  const totalSpend = Number(weekRows[0]?.total ?? 0);
  const trailingTotal = Number(trailingRows[0]?.total ?? 0);
  const avgWeeklySpend = trailingTotal / 4;
  const pctChangeFromAvg = avgWeeklySpend > 0 ? ((totalSpend - avgWeeklySpend) / avgWeeklySpend) * 100 : 0;

  return {
    periodStart,
    periodEnd,
    totalSpend,
    avgWeeklySpend,
    pctChangeFromAvg,
    topCategory: categoryRows[0] ? { category: categoryRows[0].category, amount: Number(categoryRows[0].total) } : null,
    newSubscriptions: subs.map((s) => s.merchantNameNormalized),
    netWorth,
  };
}
