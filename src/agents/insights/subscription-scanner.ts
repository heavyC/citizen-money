import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { detectRecurringMerchants } from "@/lib/recurring";
import { currentYearMonth } from "@/lib/date-range";
import type { InsightCandidate } from "./types";

/**
 * Upserts detected recurring merchants into `subscriptions`, then surfaces
 * insights for newly-seen subscriptions and a monthly running total.
 */
export async function runSubscriptionScanner(userId: string): Promise<InsightCandidate[]> {
  const recurring = await detectRecurringMerchants(userId);
  const candidates: InsightCandidate[] = [];

  for (const merchant of recurring) {
    const existing = await db.query.subscriptions.findFirst({
      where: and(eq(subscriptions.userId, userId), eq(subscriptions.merchantNameNormalized, merchant.merchantNormalized)),
    });

    await db
      .insert(subscriptions)
      .values({
        userId,
        merchantNameNormalized: merchant.merchantNormalized,
        amount: merchant.averageAmount.toString(),
        cadence: "monthly",
        firstSeenDate: merchant.firstSeenDate,
        lastSeenDate: merchant.lastSeenDate,
      })
      .onConflictDoUpdate({
        target: [subscriptions.userId, subscriptions.merchantNameNormalized],
        set: { lastSeenDate: merchant.lastSeenDate, amount: merchant.averageAmount.toString(), updatedAt: new Date() },
      });

    if (!existing) {
      candidates.push({
        type: "subscription",
        title: "New subscription detected",
        body: `${merchant.merchantName} looks like a new recurring charge of about $${merchant.averageAmount.toFixed(2)}.`,
        severity: "info",
        dedupKey: `subscription-new:${merchant.merchantNormalized}`,
        metadata: { merchant: merchant.merchantName, amount: merchant.averageAmount },
      });
    }
  }

  if (recurring.length > 0) {
    const total = recurring.reduce((sum, r) => sum + r.averageAmount, 0);
    candidates.push({
      type: "subscription",
      title: "Monthly subscription total",
      body: `You have ${recurring.length} recurring subscriptions totaling about $${total.toFixed(2)}/month.`,
      severity: "info",
      dedupKey: `subscription-total:${currentYearMonth()}`,
      metadata: { count: recurring.length, total },
    });
  }

  return candidates;
}
