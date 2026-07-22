import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { digests } from "@/db/schema";
import { computeWeeklyStats, type WeeklyStats } from "./stats";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 5 });

async function narrate(stats: WeeklyStats): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 300,
    system:
      "You write a short, plain-English weekly financial digest (2-4 sentences) for a personal finance app. Use ONLY the numbers given to you in the user message — never invent or estimate a figure that wasn't provided. Be direct and factual, not hyped.",
    messages: [{ role: "user", content: JSON.stringify(stats) }],
  });

  const block = message.content.find((c) => c.type === "text");
  return block && block.type === "text" ? block.text : "";
}

/** Computes this week's stats, narrates them, and stores the digest. Idempotent per user per period. */
export async function generateWeeklyDigest(userId: string) {
  const stats = await computeWeeklyStats(userId);

  const existing = await db.query.digests.findFirst({
    where: (d, { and, eq }) => and(eq(d.userId, userId), eq(d.periodStart, stats.periodStart), eq(d.periodEnd, stats.periodEnd)),
  });
  if (existing) return existing;

  const narrative = await narrate(stats);

  const [digest] = await db
    .insert(digests)
    .values({
      userId,
      periodStart: stats.periodStart,
      periodEnd: stats.periodEnd,
      narrative,
      stats,
    })
    .returning();

  return digest;
}
