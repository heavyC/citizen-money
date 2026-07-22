"use client";

import { Button } from "@/components/ui/button";
import { dismissInsight } from "@/app/alerts/actions";

export function DismissInsightButton({ insightId }: { insightId: string }) {
  return (
    <Button variant="ghost" size="sm" onClick={() => dismissInsight(insightId)}>
      Dismiss
    </Button>
  );
}
