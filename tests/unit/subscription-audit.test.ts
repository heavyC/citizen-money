import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, subscriptions } from "@/db/schema";
import { getSubscriptionsWithFlags, totalMonthlySpend } from "@/lib/subscription-audit";

const clerkUserId = `test_subscription_audit_${crypto.randomUUID()}`;
let userId: string;

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

describe("subscription audit", () => {
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ clerkUserId, email: "subscription-audit-test@example.com" }).returning();
    userId = user.id;

    await db.insert(subscriptions).values([
      {
        userId,
        merchantNameNormalized: "streamflix",
        amount: "15.99",
        cadence: "monthly",
        firstSeenDate: daysAgoIso(90),
        lastSeenDate: daysAgoIso(2),
      },
      {
        userId,
        merchantNameNormalized: "streamflix premium",
        amount: "16.50",
        cadence: "monthly",
        firstSeenDate: daysAgoIso(60),
        lastSeenDate: daysAgoIso(3),
      },
      {
        userId,
        merchantNameNormalized: "old gym membership",
        amount: "40.00",
        cadence: "monthly",
        firstSeenDate: daysAgoIso(200),
        lastSeenDate: daysAgoIso(100),
      },
      {
        userId,
        merchantNameNormalized: "unrelated grocery box",
        amount: "35.00",
        cadence: "monthly",
        firstSeenDate: daysAgoIso(90),
        lastSeenDate: daysAgoIso(1),
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it("totals monthly spend across all subscriptions", async () => {
    const rows = await db.query.subscriptions.findMany({ where: eq(subscriptions.userId, userId) });
    expect(totalMonthlySpend(rows)).toBeCloseTo(15.99 + 16.5 + 40 + 35, 2);
  });

  it("flags similarly-named, similarly-priced merchants as possible duplicates", async () => {
    const flagged = await getSubscriptionsWithFlags(userId);
    const streamflix = flagged.find((s) => s.merchantNameNormalized === "streamflix");
    expect(streamflix?.duplicateOf).toContain("streamflix premium");
  });

  it("does not false-positive unrelated merchants as duplicates", async () => {
    const flagged = await getSubscriptionsWithFlags(userId);
    const grocery = flagged.find((s) => s.merchantNameNormalized === "unrelated grocery box");
    expect(grocery?.duplicateOf).toHaveLength(0);
  });

  it("flags a subscription not seen in a long time as likely unused", async () => {
    const flagged = await getSubscriptionsWithFlags(userId);
    const gym = flagged.find((s) => s.merchantNameNormalized === "old gym membership");
    const streamflix = flagged.find((s) => s.merchantNameNormalized === "streamflix");
    expect(gym?.likelyUnused).toBe(true);
    expect(streamflix?.likelyUnused).toBe(false);
  });
});
