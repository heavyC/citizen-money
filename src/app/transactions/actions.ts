"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { applyCategoryCorrection } from "@/lib/categorize";

export async function correctTransactionCategory(transactionId: string, category: string) {
  const userId = await requireUserId();
  await applyCategoryCorrection({ userId, transactionId, category });
  revalidatePath("/transactions");
}
