"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { generateWeeklyDigest } from "@/agents/digest/generate";

export async function generateDigestNow() {
  const userId = await requireUserId();
  const digest = await generateWeeklyDigest(userId);
  revalidatePath("/digest");
  return digest;
}
