import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, goals, goalProgressSnapshots } from "@/db/schema";
import { computeGoalProjection, recordGoalSnapshot } from "@/agents/goals/project";

const clerkUserId = `test_goal_projection_${crypto.randomUUID()}`;
let userId: string;

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

describe("goal projection", () => {
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ clerkUserId, email: "goal-projection-test@example.com" }).returning();
    userId = user.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it("produces a plausible projected completion date from contribution history", async () => {
    const [goal] = await db
      .insert(goals)
      .values({ userId, name: "Vacation", goalType: "vacation", targetAmount: "2000.00", startingAmount: "500.00" })
      .returning();

    // Two snapshots 60 days apart, gaining $300 -> ~$150/month rate.
    await db.insert(goalProgressSnapshots).values([
      { goalId: goal.id, snapshotDate: daysAgoIso(60), currentAmount: "800.00" },
      { goalId: goal.id, snapshotDate: daysAgoIso(0), currentAmount: "1100.00" },
    ]);

    const projection = await computeGoalProjection(goal);
    expect(projection.currentAmount).toBeCloseTo(1100, 2);
    expect(projection.projectedCompletionDate).toBeTruthy();

    // Remaining $900 at ~$150/month should land roughly 5-7 months out.
    const monthsOut =
      (new Date(projection.projectedCompletionDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
    expect(monthsOut).toBeGreaterThan(4);
    expect(monthsOut).toBeLessThan(8);
  });

  it("returns no projection with fewer than two snapshots", async () => {
    const [goal] = await db
      .insert(goals)
      .values({ userId, name: "New Goal", goalType: "custom", targetAmount: "1000.00", startingAmount: "100.00" })
      .returning();

    const projection = await computeGoalProjection(goal);
    expect(projection.projectedCompletionDate).toBeNull();
  });

  it("recordGoalSnapshot is idempotent for the same day", async () => {
    const [goal] = await db
      .insert(goals)
      .values({ userId, name: "Idempotent Goal", goalType: "custom", targetAmount: "1000.00", startingAmount: "100.00" })
      .returning();

    const first = await recordGoalSnapshot(goal);
    const second = await recordGoalSnapshot(goal);
    expect(second?.id).toBe(first?.id);
  });
});
