import { describe, expect, it, vi, afterAll, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, categoryCorrections } from "@/db/schema";

const createMock = vi.fn(async () => ({
  content: [{ type: "text", text: '{"category": "Restaurants"}' }],
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: createMock };
  },
}));

const { resolveCategory, normalizeMerchantName } = await import("@/lib/categorize");

const clerkUserId = `test_categorize_${crypto.randomUUID()}`;
let userId: string;

describe("resolveCategory", () => {
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ clerkUserId, email: "categorize-test@example.com" }).returning();
    userId = user.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  });

  it("uses a stored user correction and never calls Claude", async () => {
    await db.insert(categoryCorrections).values({
      userId,
      merchantNameNormalized: normalizeMerchantName("Trader Joes"),
      category: "Groceries",
    });

    const result = await resolveCategory({
      userId,
      name: "TRADER JOES #123",
      merchantName: "Trader Joes",
      amount: 42.1,
      plaidDetailedCategory: "FOOD_AND_DRINK_RESTAURANT",
      plaidConfidenceLevel: "VERY_HIGH",
    });

    expect(result).toEqual({ category: "Groceries", source: "user_correction" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("uses a high-confidence Plaid category directly without calling Claude", async () => {
    const result = await resolveCategory({
      userId,
      name: "SHELL OIL",
      merchantName: "Shell",
      amount: 30,
      plaidDetailedCategory: "TRANSPORTATION_GAS",
      plaidConfidenceLevel: "HIGH",
    });

    expect(result).toEqual({ category: "TRANSPORTATION_GAS", source: "plaid" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("falls back to Claude for low-confidence or missing Plaid categories", async () => {
    const result = await resolveCategory({
      userId,
      name: "SOME AMBIGUOUS MERCHANT",
      merchantName: "Ambiguous Merchant Co",
      amount: 15,
      plaidDetailedCategory: "GENERAL_MERCHANDISE_OTHER",
      plaidConfidenceLevel: "LOW",
    });

    expect(result).toEqual({ category: "Restaurants", source: "ai" });
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
