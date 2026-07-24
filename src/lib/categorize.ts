import "server-only";
import { eq, and } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { db } from "@/db";
import { categoryCorrections, transactions } from "@/db/schema";
import { CATEGORIES, type Category } from "@/lib/categories";
import { getOrCreateCategoryId } from "@/lib/category-repo";

export { CATEGORIES } from "@/lib/categories";
export type { Category } from "@/lib/categories";

const HIGH_CONFIDENCE_LEVELS = new Set(["VERY_HIGH", "HIGH"]);

export function normalizeCategoryName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMerchantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 5 });

const categoryResponseSchema = z.object({ category: z.enum(CATEGORIES) });

async function categorizeWithClaude(input: { name: string; merchantName?: string | null; amount: number }): Promise<Category> {
  const message = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 100,
    system: `You categorize a single bank transaction into exactly one of: ${CATEGORIES.join(", ")}. Respond with only a JSON object: {"category": "<one of the categories>"}.`,
    messages: [
      {
        role: "user",
        content: `Transaction name: ${input.name}\nMerchant: ${input.merchantName ?? "unknown"}\nAmount: ${input.amount}`,
      },
    ],
  });

  const block = message.content.find((c) => c.type === "text");
  const raw = block && block.type === "text" ? block.text : "{}";
  const parsed = categoryResponseSchema.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data.category : "Other";
}

/**
 * Resolution order: a stored user correction for this merchant always wins
 * (no LLM call); otherwise a high-confidence Plaid category is used as-is;
 * only ambiguous cases are sent to Claude. Always returns a `categoryId`
 * referencing a row in `categories` — the category name is resolved (and
 * created on first use) via `getOrCreateCategoryId`.
 */
export async function resolveCategory(input: {
  userId: string;
  name: string;
  merchantName?: string | null;
  amount: number;
  plaidDetailedCategory?: string | null;
  plaidConfidenceLevel?: string | null;
}): Promise<{ categoryId: string; source: "plaid" | "ai" | "user_correction" }> {
  const normalized = normalizeMerchantName(input.merchantName ?? input.name);

  const correction = await db.query.categoryCorrections.findFirst({
    where: and(eq(categoryCorrections.userId, input.userId), eq(categoryCorrections.merchantNameNormalized, normalized)),
  });
  if (correction) {
    return { categoryId: correction.categoryId, source: "user_correction" };
  }

  if (input.plaidDetailedCategory && input.plaidConfidenceLevel && HIGH_CONFIDENCE_LEVELS.has(input.plaidConfidenceLevel)) {
    const categoryId = await getOrCreateCategoryId(normalizeCategoryName(input.plaidDetailedCategory));
    return { categoryId, source: "plaid" };
  }

  const category = await categorizeWithClaude(input);
  const categoryId = await getOrCreateCategoryId(category);
  return { categoryId, source: "ai" };
}

/**
 * Records a user's manual category correction and applies it to the given
 * transaction. Future transactions from the same merchant resolve directly
 * from this table without another AI call.
 */
export async function applyCategoryCorrection(input: { userId: string; transactionId: string; categoryId: string }) {
  const txn = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, input.transactionId), eq(transactions.userId, input.userId)),
  });
  if (!txn) {
    throw new Error("Transaction not found");
  }

  const normalized = normalizeMerchantName(txn.merchantName ?? txn.name);

  await db
    .insert(categoryCorrections)
    .values({
      userId: input.userId,
      merchantNameNormalized: normalized,
      categoryId: input.categoryId,
      exampleTransactionId: txn.id,
    })
    .onConflictDoUpdate({
      target: [categoryCorrections.userId, categoryCorrections.merchantNameNormalized],
      set: { categoryId: input.categoryId, exampleTransactionId: txn.id },
    });

  await db
    .update(transactions)
    .set({ categoryId: input.categoryId, categorySource: "user_correction", updatedAt: new Date() })
    .where(eq(transactions.id, txn.id));
}
