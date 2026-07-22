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

    expect(result).toEqual({ category: "transportation gas", source: "plaid" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("falls back to Claude for low-confidence Plaid categories", async () => {
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

  it("falls back to Claude when Plaid provides no category at all", async () => {
    const result = await resolveCategory({
      userId,
      name: "NO PLAID CATEGORY MERCHANT",
      merchantName: "No Category Co",
      amount: 12,
      plaidDetailedCategory: null,
      plaidConfidenceLevel: null,
    });

    expect(result.source).toBe("ai");
    expect(createMock).toHaveBeenCalled();
  });

  it("defaults to Other when Claude's response doesn't parse as a valid category", async () => {
    createMock.mockResolvedValueOnce({ content: [{ type: "text", text: '{"category": "Not A Real Category"}' }] });

    const result = await resolveCategory({
      userId,
      name: "GARBLED RESPONSE MERCHANT",
      merchantName: "Garbled Co",
      amount: 8,
      plaidDetailedCategory: null,
      plaidConfidenceLevel: null,
    });

    expect(result).toEqual({ category: "Other", source: "ai" });
  });
});
