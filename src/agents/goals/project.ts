import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, goalProgressSnapshots, goals, type Goal } from "@/db/schema";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function resolveCurrentAmount(goal: Goal): Promise<number> {
  if (goal.linkedAccountId) {
    const account = await db.query.accounts.findFirst({ where: eq(accounts.id, goal.linkedAccountId) });
    if (account) return Number(account.currentBalance ?? 0);
  }

  const latestSnapshot = await db.query.goalProgressSnapshots.findFirst({
    where: eq(goalProgressSnapshots.goalId, goal.id),
    orderBy: [desc(goalProgressSnapshots.snapshotDate)],
  });
  return latestSnapshot ? Number(latestSnapshot.currentAmount) : Number(goal.startingAmount);
}

export interface GoalProjection {
  currentAmount: number;
  projectedCompletionDate: string | null;
}

/**
 * Projects a completion date from the trailing monthly savings rate between
 * the goal's earliest and most recent snapshot. Needs at least two snapshots
 * to establish a rate; returns `projectedCompletionDate: null` otherwise.
 */
export async function computeGoalProjection(goal: Goal): Promise<GoalProjection> {
  const currentAmount = await resolveCurrentAmount(goal);
  const targetAmount = Number(goal.targetAmount);

  if (currentAmount >= targetAmount) {
    return { currentAmount, projectedCompletionDate: isoDate(new Date()) };
  }

  const history = await db.query.goalProgressSnapshots.findMany({
    where: eq(goalProgressSnapshots.goalId, goal.id),
    orderBy: [goalProgressSnapshots.snapshotDate],
  });

  if (history.length < 2) {
    return { currentAmount, projectedCompletionDate: null };
  }

  const earliest = history[0];
  const latest = history[history.length - 1];
  const monthsBetween =
    (new Date(latest.snapshotDate).getTime() - new Date(earliest.snapshotDate).getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsBetween <= 0) {
    return { currentAmount, projectedCompletionDate: null };
  }

  const monthlyRate = (Number(latest.currentAmount) - Number(earliest.currentAmount)) / monthsBetween;
  if (monthlyRate <= 0) {
    return { currentAmount, projectedCompletionDate: null };
  }

  const monthsRemaining = (targetAmount - currentAmount) / monthlyRate;
  return { currentAmount, projectedCompletionDate: isoDate(addMonths(new Date(), monthsRemaining)) };
}

/** Computes and stores today's snapshot for one goal. Idempotent per goal per day. */
export async function recordGoalSnapshot(goal: Goal) {
  const today = isoDate(new Date());
  const existing = await db.query.goalProgressSnapshots.findFirst({
    where: and(eq(goalProgressSnapshots.goalId, goal.id), eq(goalProgressSnapshots.snapshotDate, today)),
  });
  if (existing) return existing;

  const projection = await computeGoalProjection(goal);
  const [snapshot] = await db
    .insert(goalProgressSnapshots)
    .values({
      goalId: goal.id,
      snapshotDate: today,
      currentAmount: projection.currentAmount.toString(),
      projectedCompletionDate: projection.projectedCompletionDate,
    })
    .returning();
  return snapshot;
}

export async function getActiveGoals(userId: string) {
  return db.query.goals.findMany({ where: and(eq(goals.userId, userId), eq(goals.status, "active")) });
}
