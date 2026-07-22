import { auth } from "@clerk/nextjs/server";
import { requireUserId } from "@/lib/auth";
import { ChatPanel } from "@/components/chat-panel";

export async function Chat() {
  await auth.protect();
  await requireUserId();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 py-16">
      <h1 className="text-2xl font-semibold">Ask your money anything</h1>
      <div className="min-h-0 flex-1">
        <ChatPanel />
      </div>
    </div>
  );
}
