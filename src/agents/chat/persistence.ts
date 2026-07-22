import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import type Anthropic from "@anthropic-ai/sdk";

type AnthropicMessageParam = Anthropic.Messages.MessageParam;

export async function loadConversationHistory(userId: string, conversationId: string): Promise<AnthropicMessageParam[]> {
  const rows = await db.query.chatMessages.findMany({
    where: and(eq(chatMessages.userId, userId), eq(chatMessages.conversationId, conversationId)),
    orderBy: (m, { asc: ascOrder }) => [ascOrder(m.createdAt)],
  });
  return rows.map((row) => ({ role: row.role, content: row.content }));
}

export async function appendTurn(input: {
  userId: string;
  conversationId: string;
  userMessage: string;
  assistantReply: string;
  toolCalls?: unknown;
}) {
  await db.insert(chatMessages).values([
    { userId: input.userId, conversationId: input.conversationId, role: "user", content: input.userMessage },
    {
      userId: input.userId,
      conversationId: input.conversationId,
      role: "assistant",
      content: input.assistantReply,
      toolCalls: input.toolCalls,
    },
  ]);
}

export async function listConversationMessages(userId: string, conversationId: string) {
  return db.query.chatMessages.findMany({
    where: and(eq(chatMessages.userId, userId), eq(chatMessages.conversationId, conversationId)),
    orderBy: asc(chatMessages.createdAt),
  });
}
