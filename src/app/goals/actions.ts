"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { db } from "@/db";
import { goals, type Goal } from "@/db/schema";

export async function createGoal(input: {
  name: string;
  goalType: Goal["goalType"];
  targetAmount: number;
  startingAmount: number;
  targetDate?: string;
}) {
  const userId = await requireUserId();
  await db.insert(goals).values({
    userId,
    name: input.name,
    goalType: input.goalType,
    targetAmount: input.targetAmount.toString(),
    startingAmount: input.startingAmount.toString(),
    targetDate: input.targetDate || null,
  });
  revalidatePath("/goals");
}

export async function deleteGoal(goalId: string) {
  const userId = await requireUserId();
  await db.delete(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  revalidatePath("/goals");
}
