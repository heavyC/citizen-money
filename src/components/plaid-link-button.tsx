"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { createLinkTokenAction, completeLinkAction } from "@/app/connect-bank/actions";

export function PlaidLinkButton() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "syncing" | "done" | "error">("idle");

  useEffect(() => {
    createLinkTokenAction().then(setLinkToken);
  }, []);

  const onSuccess = useCallback(async (publicToken: string, metadata: { institution?: { name: string } | null }) => {
    setStatus("syncing");
    try {
      await completeLinkAction(publicToken, metadata.institution?.name);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess,
  });

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        onClick={() => {
          setStatus("loading");
          open();
        }}
        disabled={!ready || status === "syncing"}
      >
        {status === "syncing" ? "Syncing transactions…" : "Connect a sandbox bank account"}
      </Button>
      {status === "done" && <p className="text-sm text-muted-foreground">Connected and synced.</p>}
      {status === "error" && <p className="text-sm text-destructive">Something went wrong. Try again.</p>}
    </div>
  );
}
