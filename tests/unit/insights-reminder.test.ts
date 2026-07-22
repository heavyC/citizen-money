import { describe, expect, it, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, subscriptions, cancellationReminders } from "@/db/schema";
import { runReminderChecker } from "@/agents/insights/reminder-checker";

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
function daysFromNowIso(n: number): string {
  return daysAgoIso(-n);
}

describe("reminder checker", () => {
  it("fires for a reminder whose date has passed", async () => {
    const clerkUserId = `test_reminder_due_${crypto.randomUUID()}`;
    clerkUserIds.push(clerkUserId);
    const [user] = await db.insert(users).values({ clerkUserId, email: "reminder-due@example.com" }).returning();
    const [sub] = await db
      .insert(subscriptions)
      .values({ userId: user.id, merchantNameNormalized: "streamflix", amount: "15.99", cadence: "monthly", firstSeenDate: daysAgoIso(60), lastSeenDate: daysAgoIso(1) })
      .returning();
    await db.insert(cancellationReminders).values({ userId: user.id, subscriptionId: sub.id, remindAt: daysAgoIso(1) });

    const candidates = await runReminderChecker(user.id);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].severity).toBe("action");
  });

  it("stays silent for a reminder scheduled in the future", async () => {
    const clerkUserId = `test_reminder_future_${crypto.randomUUID()}`;
    clerkUserIds.push(clerkUserId);
    const [user] = await db.insert(users).values({ clerkUserId, email: "reminder-future@example.com" }).returning();
    const [sub] = await db
      .insert(subscriptions)
      .values({ userId: user.id, merchantNameNormalized: "streamflix", amount: "15.99", cadence: "monthly", firstSeenDate: daysAgoIso(60), lastSeenDate: daysAgoIso(1) })
      .returning();
    await db.insert(cancellationReminders).values({ userId: user.id, subscriptionId: sub.id, remindAt: daysFromNowIso(30) });

    const candidates = await runReminderChecker(user.id);
    expect(candidates).toHaveLength(0);
  });
});
