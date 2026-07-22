import { describe, expect, it, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, goals, goalProgressSnapshots } from "@/db/schema";
import { runGoalProjectionChecker } from "@/agents/insights/goal-projection-checker";

const clerkUserIds: string[] = [];

afterAll(async () => {
  for (const id of clerkUserIds) {
    await db.delete(users).where(eq(users.clerkUserId, id));
  }
});

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function setupUser(clerkUserId: string) {
  const [user] = await db.insert(users).values({ clerkUserId, email: `${clerkUserId}@example.com` }).returning();
  return user.id;
}

describe("goal projection checker", () => {
  it("fires when the projected completion date moves materially", async () => {
    const clerkUserId = `test_goal_check_material_${crypto.randomUUID()}`;
    clerkUserIds.push(clerkUserId);
    const userId = await setupUser(clerkUserId);

    const [goal] = await db
      .insert(goals)
      .values({ userId, name: "Vacation", goalType: "vacation", targetAmount: "5000.00", startingAmount: "0" })
      .returning();

    // A prior "run" recorded a snapshot with an optimistic projection (fast rate).
    await db.insert(goalProgressSnapshots).values([
      { goalId: goal.id, snapshotDate: daysAgoIso(60), currentAmount: "0.00" },
      { goalId: goal.id, snapshotDate: daysAgoIso(30), currentAmount: "1000.00", projectedCompletionDate: daysAgoIso(-90) },
    ]);

    const candidates = await runGoalProjectionChecker(userId);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].type).toBe("goal_projection");
    expect(candidates[0].body).toContain(goal.name);
  });

  it("stays silent when there is no prior projection to compare against", async () => {
    const clerkUserId = `test_goal_check_first_${crypto.randomUUID()}`;
    clerkUserIds.push(clerkUserId);
    const userId = await setupUser(clerkUserId);

    await db.insert(goals).values({ userId, name: "Emergency Fund", goalType: "emergency_fund", targetAmount: "5000.00", startingAmount: "1000.00" });

    const candidates = await runGoalProjectionChecker(userId);
    expect(candidates).toHaveLength(0);
  });

  it("stays silent when the projection barely changes", async () => {
    const clerkUserId = `test_goal_check_negligible_${crypto.randomUUID()}`;
    clerkUserIds.push(clerkUserId);
    const userId = await setupUser(clerkUserId);

    const [goal] = await db
      .insert(goals)
      .values({ userId, name: "Stable Goal", goalType: "custom", targetAmount: "5000.00", startingAmount: "0" })
      .returning();

    // Consistent, steady rate -> today's recomputed projection should land
    // within days of the last stored one.
    await db.insert(goalProgressSnapshots).values([
      { goalId: goal.id, snapshotDate: daysAgoIso(60), currentAmount: "0.00" },
      { goalId: goal.id, snapshotDate: daysAgoIso(30), currentAmount: "500.00", projectedCompletionDate: daysAgoIso(-270) },
    ]);

    const candidates = await runGoalProjectionChecker(userId);
    expect(candidates).toHaveLength(0);
  });
});
