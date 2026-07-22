import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, type Subscription } from "@/db/schema";

const UNUSED_AFTER_DAYS = 45;
const DUPLICATE_AMOUNT_TOLERANCE = 0.2;
const STOP_WORDS = new Set(["the", "inc", "llc", "co", "com"]);

function significantTokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4 && !STOP_WORDS.has(t)),
  );
}

function sharesToken(a: Set<string>, b: Set<string>): boolean {
  for (const token of a) {
    if (b.has(token)) return true;
  }
  return false;
}

export interface SubscriptionWithFlags extends Subscription {
  likelyUnused: boolean;
  duplicateOf: string[];
}

export async function getSubscriptionsWithFlags(userId: string): Promise<SubscriptionWithFlags[]> {
  const rows = await db.query.subscriptions.findMany({ where: eq(subscriptions.userId, userId) });
  const today = new Date();

  return rows.map((row) => {
    const daysSinceLastSeen = (today.getTime() - new Date(row.lastSeenDate).getTime()) / (1000 * 60 * 60 * 24);
    const likelyUnused = daysSinceLastSeen > UNUSED_AFTER_DAYS;

    const rowTokens = significantTokens(row.merchantNameNormalized);
    const duplicateOf = rows
      .filter((other) => other.id !== row.id)
      .filter((other) => {
        const amountA = Number(row.amount);
        const amountB = Number(other.amount);
        const withinTolerance = Math.abs(amountA - amountB) / Math.max(amountA, amountB) <= DUPLICATE_AMOUNT_TOLERANCE;
        return withinTolerance && sharesToken(rowTokens, significantTokens(other.merchantNameNormalized));
      })
      .map((other) => other.merchantNameNormalized);

    return { ...row, likelyUnused, duplicateOf };
  });
}

export function totalMonthlySpend(rows: Subscription[]): number {
  return rows.reduce((sum, r) => sum + Number(r.amount), 0);
}
