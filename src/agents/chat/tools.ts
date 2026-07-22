import "server-only";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { accounts, budgets, goals, transactions } from "@/db/schema";
import { monthRange } from "@/lib/date-range";
import { detectRecurringMerchants } from "@/lib/recurring";

const queryTransactionsSchema = z.object({
  category: z.string().optional().describe("Filter to this category, if given."),
  dateFrom: z.string().optional().describe("ISO date (YYYY-MM-DD), inclusive."),
  dateTo: z.string().optional().describe("ISO date (YYYY-MM-DD), inclusive."),
});

async function queryTransactions(userId: string, args: z.infer<typeof queryTransactionsSchema>) {
  const conditions = [eq(transactions.userId, userId)];
  if (args.category) conditions.push(sql`lower(${transactions.category}) = lower(${args.category})`);
  if (args.dateFrom) conditions.push(gte(transactions.date, args.dateFrom));
  if (args.dateTo) conditions.push(lte(transactions.date, args.dateTo));

  const rows = await db.query.transactions.findMany({
    where: and(...conditions),
    orderBy: (t, { desc }) => [desc(t.date)],
    limit: 200,
  });

  const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
  return {
    count: rows.length,
    total,
    transactions: rows.map((r) => ({ date: r.date, name: r.merchantName ?? r.name, category: r.category, amount: Number(r.amount) })),
  };
}

const calculateBudgetVarianceSchema = z.object({
  category: z.string().describe("Budget category to check."),
  period: z.enum(["current_month", "last_month"]).default("current_month"),
});

async function calculateBudgetVariance(userId: string, args: z.infer<typeof calculateBudgetVarianceSchema>) {
  const { from, to } = monthRange(args.period === "current_month" ? 0 : 1);

  const budget = await db.query.budgets.findFirst({
    where: and(eq(budgets.userId, userId), sql`lower(${budgets.category}) = lower(${args.category})`),
  });
  if (!budget) {
    return { error: `No budget set for category "${args.category}".` };
  }

  const rows = await db
    .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        sql`lower(${transactions.category}) = lower(${args.category})`,
        gte(transactions.date, from),
        lte(transactions.date, to),
        sql`${transactions.amount} > 0`,
      ),
    );

  const spent = Number(rows[0]?.total ?? 0);
  const limit = Number(budget.monthlyLimit);
  return { category: args.category, period: args.period, limit, spent, variance: limit - spent, overBudget: spent > limit };
}

async function getAccountBalances(userId: string) {
  const rows = await db.query.accounts.findMany({ where: eq(accounts.userId, userId) });
  const netWorth = rows.reduce((sum, a) => sum + Number(a.currentBalance ?? 0), 0);
  return {
    netWorth,
    accounts: rows.map((a) => ({ name: a.name, type: a.type, balance: Number(a.currentBalance ?? 0) })),
  };
}

async function getGoalsProgress(userId: string) {
  const rows = await db.query.goals.findMany({ where: eq(goals.userId, userId) });
  return {
    goals: rows.map((g) => ({
      name: g.name,
      targetAmount: Number(g.targetAmount),
      startingAmount: Number(g.startingAmount),
      targetDate: g.targetDate,
      status: g.status,
    })),
  };
}

async function detectRecurringCharges(userId: string) {
  const recurring = await detectRecurringMerchants(userId);
  return {
    recurringCharges: recurring.map((r) => ({
      merchant: r.merchantName,
      occurrences: r.occurrences,
      averageAmount: r.averageAmount,
    })),
  };
}

const comparePeriodsSchema = z.object({
  category: z.string().optional().describe("Restrict the comparison to one category."),
});

async function comparePeriods(userId: string, args: z.infer<typeof comparePeriodsSchema>) {
  const current = monthRange(0);
  const previous = monthRange(1);

  async function totalsByCategory(from: string, to: string) {
    const conditions = [eq(transactions.userId, userId), gte(transactions.date, from), lte(transactions.date, to), sql`${transactions.amount} > 0`];
    if (args.category) conditions.push(sql`lower(${transactions.category}) = lower(${args.category})`);

    const rows = await db
      .select({ category: transactions.category, total: sql<string>`sum(${transactions.amount})` })
      .from(transactions)
      .where(and(...conditions))
      .groupBy(transactions.category);
    return new Map(rows.map((r) => [r.category, Number(r.total)]));
  }

  const currentTotals = await totalsByCategory(current.from, current.to);
  const previousTotals = await totalsByCategory(previous.from, previous.to);

  const categories = new Set([...currentTotals.keys(), ...previousTotals.keys()]);
  const deltas = [...categories].map((category) => {
    const currentAmount = currentTotals.get(category) ?? 0;
    const previousAmount = previousTotals.get(category) ?? 0;
    return { category, currentAmount, previousAmount, delta: currentAmount - previousAmount };
  });
  deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    currentPeriod: current,
    previousPeriod: previous,
    currentTotal: [...currentTotals.values()].reduce((a, b) => a + b, 0),
    previousTotal: [...previousTotals.values()].reduce((a, b) => a + b, 0),
    biggestChange: deltas[0] ?? null,
    byCategory: deltas,
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodType;
  execute: (userId: string, args: unknown) => Promise<unknown>;
}

export const chatTools: ToolDefinition[] = [
  {
    name: "query_transactions",
    description: "Look up the user's transactions, optionally filtered by category and/or date range.",
    schema: queryTransactionsSchema,
    execute: (userId, args) => queryTransactions(userId, queryTransactionsSchema.parse(args)),
  },
  {
    name: "calculate_budget_variance",
    description: "Compare actual spend in a category against its monthly budget for the current or last month.",
    schema: calculateBudgetVarianceSchema,
    execute: (userId, args) => calculateBudgetVariance(userId, calculateBudgetVarianceSchema.parse(args)),
  },
  {
    name: "get_account_balances",
    description: "Get the user's account balances and total net worth.",
    schema: z.object({}),
    execute: (userId) => getAccountBalances(userId),
  },
  {
    name: "get_goals_progress",
    description: "Get the user's savings/debt goals and progress toward each.",
    schema: z.object({}),
    execute: (userId) => getGoalsProgress(userId),
  },
  {
    name: "detect_recurring_charges",
    description: "Detect recurring/subscription-like charges from the last 6 months of transactions.",
    schema: z.object({}),
    execute: (userId) => detectRecurringCharges(userId),
  },
  {
    name: "compare_periods",
    description: "Compare this month's spending against last month's, by category, and identify the biggest change.",
    schema: comparePeriodsSchema,
    execute: (userId, args) => comparePeriods(userId, comparePeriodsSchema.parse(args)),
  },
];
