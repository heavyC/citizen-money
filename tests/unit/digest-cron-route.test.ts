import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, plaidItems, accounts, transactions, digests } from "@/db/schema";

const sendDigestEmailMock = vi.fn(async () => ({ data: { id: "email_123" }, error: null }));
vi.mock("@/lib/resend", () => ({ sendDigestEmail: sendDigestEmailMock }));

const { GET } = await import("@/app/api/cron/digest/route");

const clerkUserId = `test_digest_cron_${crypto.randomUUID()}`;
let userId: string;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

describe("GET /api/cron/digest", () => {
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ clerkUserId, email: "digest-cron-test@example.com" }).returning();
    userId = user.id;
    const [item] = await db.insert(plaidItems).values({ userId, plaidItemId: `item_${userId}`, accessToken: "x" }).returning();
    const [account] = await db
      .insert(accounts)
      .values({ plaidItemId: item.id, userId, plaidAccountId: `acc_${userId}`, name: "Checking", type: "depository" })
      .returning();
    await db.insert(transactions).values({
      accountId: account.id,
      userId,
      plaidTransactionId: `c1_${userId}`,
      amount: "42.00",
      date: daysAgo(1),
      name: "Coffee Shop",
      category: "Coffee Shops",
    });
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it("401s without the correct bearer secret", async () => {
    const request = new Request("http://localhost/api/cron/digest");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it(
    "generates and emails a digest for every user when authorized",
    async () => {
      const request = new Request("http://localhost/api/cron/digest", {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      const response = await GET(request);
      expect(response.status).toBe(200);

      expect(sendDigestEmailMock).toHaveBeenCalledWith(
        "digest-cron-test@example.com",
        "Your weekly financial digest",
        expect.any(String),
      );

      const stored = await db.query.digests.findFirst({ where: eq(digests.userId, userId) });
      expect(stored?.emailSentAt).toBeTruthy();
    },
    120_000,
  );
});
