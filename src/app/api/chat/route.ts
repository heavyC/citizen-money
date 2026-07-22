import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { runChatTurn } from "@/agents/chat/graph";
import { loadConversationHistory, appendTurn } from "@/agents/chat/persistence";

const bodySchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const { conversationId, message } = bodySchema.parse(await request.json());

    const history = await loadConversationHistory(userId, conversationId);
    const { reply, messages } = await runChatTurn(userId, history, message);

    const toolCalls = messages
      .flatMap((m) => (Array.isArray(m.content) ? m.content : []))
      .filter((block) => block.type === "tool_use" || block.type === "tool_result");

    await appendTurn({
      userId,
      conversationId,
      userMessage: message,
      assistantReply: reply,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    });

    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
