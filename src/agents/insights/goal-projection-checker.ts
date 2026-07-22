import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { goalProgressSnapshots } from "@/db/schema";
import { getActiveGoals, recordGoalSnapshot } from "@/agents/goals/project";
import type { InsightCandidate } from "./types";

const MATERIAL_CHANGE_DAYS = 14;

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Records today's snapshot for each active goal and surfaces an insight only
 * when the projected completion date moved materially vs the prior snapshot.
 */
export async function runGoalProjectionChecker(userId: string): Promise<InsightCandidate[]> {
  const activeGoals = await getActiveGoals(userId);
  const candidates: InsightCandidate[] = [];

  for (const goal of activeGoals) {
    const previous = await db.query.goalProgressSnapshots.findFirst({
      where: eq(goalProgressSnapshots.goalId, goal.id),
      orderBy: [desc(goalProgressSnapshots.snapshotDate)],
    });

    const snapshot = await recordGoalSnapshot(goal);
    if (!snapshot) continue;

    const prevDate = previous?.projectedCompletionDate;
    const newDate = snapshot.projectedCompletionDate;
    if (!prevDate || !newDate || prevDate === newDate) continue;

    const delta = daysBetween(prevDate, newDate);
    if (delta < MATERIAL_CHANGE_DAYS) continue;

    const direction = new Date(newDate) > new Date(prevDate) ? "later" : "sooner";
    candidates.push({
      type: "goal_projection",
      title: `Your "${goal.name}" projection changed`,
      body: `At your current savings rate you'll now hit "${goal.name}" on ${newDate}, ${direction} than the previous estimate of ${prevDate}.`,
      severity: "info",
      dedupKey: `goal-projection:${goal.id}:${snapshot.snapshotDate}`,
      metadata: { goalId: goal.id, previousDate: prevDate, newDate },
    });
  }

  return candidates;
}
