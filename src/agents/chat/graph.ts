import "server-only";
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { chatTools } from "./tools";
import { CATEGORIES } from "@/lib/categories";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 5 });

type AnthropicMessageParam = Anthropic.Messages.MessageParam;

const ChatState = Annotation.Root({
  userId: Annotation<string>,
  messages: Annotation<AnthropicMessageParam[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
});

const anthropicTools: Anthropic.Messages.Tool[] = chatTools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  input_schema: z.toJSONSchema(tool.schema) as Anthropic.Messages.Tool.InputSchema,
}));

function systemPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `You are a helpful financial assistant with tools to look up the signed-in user's own transactions, budgets, accounts, goals, and recurring charges. Always call a tool to get real numbers before answering a question about the user's finances — never guess or estimate. Answer in plain English, citing the actual figures returned by the tools.

Today's date is ${today}. Use it to compute any relative date range (e.g. "last 3 months") yourself when calling query_transactions — do not guess a different current date.

When filtering by category, use exactly one of these values (case-sensitive): ${CATEGORIES.join(", ")}.`;
}

async function callModel(state: typeof ChatState.State) {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    system: systemPrompt(),
    tools: anthropicTools,
    messages: state.messages,
  });

  return {
    messages: [{ role: "assistant", content: response.content } as AnthropicMessageParam],
  };
}

function shouldContinue(state: typeof ChatState.State): "tools" | typeof END {
  const last = state.messages[state.messages.length - 1];
  const content = Array.isArray(last?.content) ? last.content : [];
  const hasToolUse = content.some((block) => block.type === "tool_use");
  return hasToolUse ? "tools" : END;
}

async function callTools(state: typeof ChatState.State) {
  const last = state.messages[state.messages.length - 1];
  const content = Array.isArray(last.content) ? last.content : [];
  const toolUseBlocks = content.filter((block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use");

  const resultBlocks: Anthropic.Messages.ToolResultBlockParam[] = await Promise.all(
    toolUseBlocks.map(async (block) => {
      const tool = chatTools.find((t) => t.name === block.name);
      if (!tool) {
        return { type: "tool_result", tool_use_id: block.id, content: `Unknown tool: ${block.name}`, is_error: true };
      }
      try {
        const result = await tool.execute(state.userId, block.input);
        return { type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) };
      } catch (error) {
        return { type: "tool_result", tool_use_id: block.id, content: String(error), is_error: true };
      }
    }),
  );

  return { messages: [{ role: "user", content: resultBlocks } as AnthropicMessageParam] };
}

const graph = new StateGraph(ChatState)
  .addNode("agent", callModel)
  .addNode("tools", callTools)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, { tools: "tools", [END]: END })
  .addEdge("tools", "agent");

export const chatGraph = graph.compile();

export async function runChatTurn(userId: string, history: AnthropicMessageParam[], userMessage: string) {
  const result = await chatGraph.invoke({
    userId,
    messages: [...history, { role: "user", content: userMessage }],
  });

  const newMessages = result.messages.slice(history.length + 1);
  const finalAssistantMessage = [...newMessages].reverse().find((m) => m.role === "assistant");
  const textBlocks = Array.isArray(finalAssistantMessage?.content)
    ? finalAssistantMessage.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    : [];

  return {
    reply: textBlocks.map((b) => b.text).join("\n"),
    messages: newMessages,
  };
}
