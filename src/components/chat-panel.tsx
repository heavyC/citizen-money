"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export function ChatPanel() {
  const conversationId = useRef(crypto.randomUUID());
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function send() {
    const message = input.trim();
    if (!message || pending) return;

    setTurns((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversationId.current, message }),
      });
      const data = await res.json();
      setTurns((prev) => [...prev, { role: "assistant", content: res.ok ? data.reply : `Error: ${data.error}` }]);
    } catch {
      setTurns((prev) => [...prev, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {turns.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask about your spending, budgets, goals, or recurring charges.
          </p>
        )}
        {turns.map((turn, i) => (
          <div key={i} className={turn.role === "user" ? "self-end rounded-lg bg-primary px-3 py-2 text-primary-foreground" : "self-start rounded-lg bg-muted px-3 py-2"}>
            <p className="whitespace-pre-wrap text-sm">{turn.content}</p>
          </div>
        ))}
        {pending && <p className="text-sm text-muted-foreground">Thinking…</p>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your money anything…"
          className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
        />
        <Button type="submit" disabled={pending}>
          Send
        </Button>
      </form>
    </div>
  );
}
