"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { generateDigestNow } from "@/app/digest/actions";

export function GenerateDigestButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");

  return (
    <Button
      onClick={async () => {
        setStatus("running");
        await generateDigestNow();
        setStatus("done");
      }}
      disabled={status === "running"}
    >
      {status === "running" ? "Generating…" : "Generate this week's digest"}
    </Button>
  );
}
