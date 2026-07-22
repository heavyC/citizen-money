"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { runInsightsNow } from "@/app/alerts/actions";

export function RunInsightsButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");

  return (
    <Button
      onClick={async () => {
        setStatus("running");
        await runInsightsNow();
        setStatus("done");
      }}
      disabled={status === "running"}
    >
      {status === "running" ? "Running…" : "Run insights now"}
    </Button>
  );
}
