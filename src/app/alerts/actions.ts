"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { db } from "@/db";
import { insights } from "@/db/schema";
import { runInsightOrchestratorForUser } from "@/agents/insights/orchestrator";

export async function runInsightsNow() {
  const userId = await requireUserId();
  const result = await runInsightOrchestratorForUser(userId);
  revalidatePath("/alerts");
  return result;
}

export async function dismissInsight(insightId: string) {
  const userId = await requireUserId();
  await db
    .update(insights)
    .set({ status: "dismissed" })
    .where(and(eq(insights.id, insightId), eq(insights.userId, userId)));
  revalidatePath("/alerts");
}
