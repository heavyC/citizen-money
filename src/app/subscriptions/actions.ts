"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { db } from "@/db";
import { cancellationReminders } from "@/db/schema";

export async function createCancellationReminder(input: { subscriptionId: string; remindAt: string; note?: string }) {
  const userId = await requireUserId();
  await db.insert(cancellationReminders).values({
    userId,
    subscriptionId: input.subscriptionId,
    remindAt: input.remindAt,
    note: input.note || null,
  });
  revalidatePath("/subscriptions");
}
