import { describe, expect, it, vi, afterAll, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, plaidItems } from "@/db/schema";

const clerkUserId = `test_plaid_exchange_${crypto.randomUUID()}`;
let userId: string;

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: clerkUserId })),
  currentUser: vi.fn(async () => ({
    primaryEmailAddress: { emailAddress: "plaid-exchange-test@example.com" },
    emailAddresses: [],
  })),
}));

vi.mock("@/lib/plaid", () => ({
  exchangePublicToken: vi.fn(async () => ({
    accessToken: "access-sandbox-super-secret",
    plaidItemId: `item_${crypto.randomUUID()}`,
  })),
}));

const { POST } = await import("@/app/api/plaid/exchange/route");

describe("POST /api/plaid/exchange", () => {
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ clerkUserId, email: "plaid-exchange-test@example.com" }).returning();
    userId = user.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it("stores the access token server-side but never returns it to the client", async () => {
    const request = new Request("http://localhost/api/plaid/exchange", {
      method: "POST",
      body: JSON.stringify({ publicToken: "public-sandbox-token", institutionName: "Sandbox Bank" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).not.toContain("access-sandbox-super-secret");
    expect(body).not.toHaveProperty("accessToken");

    const stored = await db.query.plaidItems.findFirst({ where: eq(plaidItems.userId, userId) });
    expect(stored?.accessToken).toBe("access-sandbox-super-secret");

    if (stored) {
      await db.delete(plaidItems).where(eq(plaidItems.id, stored.id));
    }
  });
});
