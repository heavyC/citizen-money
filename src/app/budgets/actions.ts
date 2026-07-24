"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { db } from "@/db";
import { budgets } from "@/db/schema";

export async function upsertBudget(categoryId: string, monthlyLimit: number) {
  const userId = await requireUserId();
  await db
    .insert(budgets)
    .values({ userId, categoryId, monthlyLimit: monthlyLimit.toString() })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.categoryId],
      set: { monthlyLimit: monthlyLimit.toString(), updatedAt: new Date() },
    });
  revalidatePath("/budgets");
}

export async function deleteBudget(budgetId: string) {
  const userId = await requireUserId();
  await db.delete(budgets).where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)));
  revalidatePath("/budgets");
}
