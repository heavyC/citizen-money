"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { applyCategoryCorrection } from "@/lib/categorize";

export async function correctTransactionCategory(transactionId: string, categoryId: string) {
  const userId = await requireUserId();
  await applyCategoryCorrection({ userId, transactionId, categoryId });
  revalidatePath("/transactions");
}
