"use client";

import { useAuth } from "@clerk/nextjs";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleChat, closeChat } from "@/store/slices/chat-ui-slice";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat-panel";

export function ChatLauncher() {
  const { isSignedIn } = useAuth();
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.chatUi.isOpen);

  if (!isSignedIn) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="flex h-112 w-80 flex-col gap-3 rounded-lg border bg-background p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Ask your money anything</p>
            <Button variant="ghost" size="sm" onClick={() => dispatch(closeChat())}>
              Close
            </Button>
          </div>
          <ChatPanel />
        </div>
      ) : (
        <Button onClick={() => dispatch(toggleChat())}>Ask your money anything</Button>
      )}
    </div>
  );
}
