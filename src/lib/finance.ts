import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, budgets, categories, transactions } from "@/db/schema";

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

export interface TransactionWithCategory {
  id: string;
  date: string;
  name: string;
  merchantName: string | null;
  amount: string;
  categoryId: string;
  categoryName: string;
}

export async function getRecentTransactions(userId: string, days = 90): Promise<TransactionWithCategory[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  return db
    .select({
      id: transactions.id,
      date: transactions.date,
      name: transactions.name,
      merchantName: transactions.merchantName,
      amount: transactions.amount,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.userId, userId), gte(transactions.date, sinceStr)))
    .orderBy(desc(transactions.date));
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
      category: categories.name,
      total: sql<string>`sum(${transactions.amount})`.as("total"),
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.userId, userId), gte(transactions.date, sinceStr), sql`${transactions.amount} > 0`))
    .groupBy(categories.name)
    .orderBy(desc(sql`sum(${transactions.amount})`));

  return rows.map((r) => ({ category: r.category, total: Number(r.total) }));
}

export interface BudgetWithSpend {
  id: string;
  categoryId: string;
  categoryName: string;
  monthlyLimit: string;
  spent: number;
}

export async function getBudgetsWithSpend(userId: string, days = 30): Promise<BudgetWithSpend[]> {
  const userBudgets = await db
    .select({
      id: budgets.id,
      categoryId: budgets.categoryId,
      categoryName: categories.name,
      monthlyLimit: budgets.monthlyLimit,
    })
    .from(budgets)
    .innerJoin(categories, eq(budgets.categoryId, categories.id))
    .where(eq(budgets.userId, userId))
    .orderBy(categories.name);

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const spendRows = await db
    .select({ categoryId: transactions.categoryId, total: sql<string>`sum(${transactions.amount})` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.date, sinceStr), sql`${transactions.amount} > 0`))
    .groupBy(transactions.categoryId);
  const spendByCategoryId = new Map(spendRows.map((s) => [s.categoryId, Number(s.total)]));

  return userBudgets.map((budget) => ({
    ...budget,
    spent: spendByCategoryId.get(budget.categoryId) ?? 0,
  }));
}
