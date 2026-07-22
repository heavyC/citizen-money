"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createCancellationReminder } from "@/app/subscriptions/actions";

export function ReminderForm({ subscriptionId }: { subscriptionId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Remind me to cancel
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        await createCancellationReminder({
          subscriptionId,
          remindAt: String(formData.get("remindAt")),
          note: String(formData.get("note") || ""),
        });
        setOpen(false);
      }}
      className="flex items-end gap-2"
    >
      <label className="flex flex-col gap-1 text-xs">
        Remind on
        <input name="remindAt" type="date" required className="rounded-md border bg-background px-2 py-1 text-sm" />
      </label>
      <Button type="submit" size="sm">
        Save
      </Button>
    </form>
  );
}
