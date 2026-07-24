import "server-only";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { monthRange, currentYearMonth } from "@/lib/date-range";
import type { InsightCandidate } from "./types";

export async function runBudgetVarianceChecker(userId: string): Promise<InsightCandidate[]> {
  const { from, to } = monthRange(0);
  const userBudgets = await db
    .select({ id: budgets.id, categoryId: budgets.categoryId, categoryName: categories.name, monthlyLimit: budgets.monthlyLimit })
    .from(budgets)
    .innerJoin(categories, eq(budgets.categoryId, categories.id))
    .where(eq(budgets.userId, userId));
  if (userBudgets.length === 0) return [];

  const candidates: InsightCandidate[] = [];

  for (const budget of userBudgets) {
    const rows = await db
      .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.categoryId, budget.categoryId),
          gte(transactions.date, from),
          lte(transactions.date, to),
          sql`${transactions.amount} > 0`,
        ),
      );

    const spent = Number(rows[0]?.total ?? 0);
    const limit = Number(budget.monthlyLimit);
    if (spent > limit) {
      candidates.push({
        type: "budget_variance",
        title: `Over budget in ${budget.categoryName}`,
        body: `You've spent $${spent.toFixed(2)} on ${budget.categoryName} this month, over your $${limit.toFixed(2)} budget.`,
        severity: "action",
        dedupKey: `budget-variance:${budget.categoryId}:${currentYearMonth()}`,
        metadata: { category: budget.categoryName, spent, limit },
      });
    }
  }

  return candidates;
}
