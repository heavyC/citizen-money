import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, budgets, transactions } from "@/db/schema";

export async function getAccountsForUser(userId: string) {
  return db.query.accounts.findMany({
    where: eq(accounts.userId, userId),
    orderBy: (a, { asc }) => [asc(a.name)],
  });
}

export async function getNetWorth(userId: string): Promise<number> {
  const userAccounts = await getAccountsForUser(userId);
  return userAccounts.reduce((sum, account) => sum + Number(account.currentBalance ?? 0), 0);
}

export async function getRecentTransactions(userId: string, days = 90) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  return db.query.transactions.findMany({
    where: and(eq(transactions.userId, userId), gte(transactions.date, sinceStr)),
    orderBy: (t, { desc: descOrder }) => [descOrder(t.date)],
  });
}

export interface CategorySpending {
  category: string;
  total: number;
}

/** Spend (positive-amount outflows only) grouped by category, descending. */
export async function getSpendingByCategory(userId: string, days = 30): Promise<CategorySpending[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const rows = await db
    .select({
      category: transactions.category,
      total: sql<string>`sum(${transactions.amount})`.as("total"),
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.date, sinceStr), sql`${transactions.amount} > 0`))
    .groupBy(transactions.category)
    .orderBy(desc(sql`sum(${transactions.amount})`));

  return rows.map((r) => ({ category: r.category, total: Number(r.total) }));
}

export async function getBudgetsWithSpend(userId: string, days = 30) {
  const userBudgets = await db.query.budgets.findMany({
    where: eq(budgets.userId, userId),
    orderBy: (b, { asc }) => [asc(b.category)],
  });
  const spending = await getSpendingByCategory(userId, days);
  const spendByCategory = new Map(spending.map((s) => [s.category, s.total]));

  return userBudgets.map((budget) => ({
    ...budget,
    spent: spendByCategory.get(budget.category) ?? 0,
  }));
}
