import "server-only";
import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { cancellationReminders, subscriptions } from "@/db/schema";
import type { InsightCandidate } from "./types";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Surfaces an alert for any cancellation reminder whose date has arrived. */
export async function runReminderChecker(userId: string): Promise<InsightCandidate[]> {
  const today = isoDate(new Date());
  const due = await db.query.cancellationReminders.findMany({
    where: and(eq(cancellationReminders.userId, userId), eq(cancellationReminders.status, "pending"), lte(cancellationReminders.remindAt, today)),
  });

  const candidates: InsightCandidate[] = [];
  for (const reminder of due) {
    const subscription = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, reminder.subscriptionId) });
    candidates.push({
      type: "subscription",
      title: "Cancellation reminder",
      body: reminder.note || `You set a reminder to consider cancelling ${subscription?.merchantNameNormalized ?? "a subscription"}.`,
      severity: "action",
      dedupKey: `reminder-due:${reminder.id}`,
      metadata: { reminderId: reminder.id, subscriptionId: reminder.subscriptionId },
    });
  }
  return candidates;
}
