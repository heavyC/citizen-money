"use client";

import { Button } from "@/components/ui/button";
import { deleteBudget } from "@/app/budgets/actions";

export function DeleteBudgetButton({ budgetId }: { budgetId: string }) {
  return (
    <Button variant="ghost" size="sm" onClick={() => deleteBudget(budgetId)}>
      Remove
    </Button>
  );
}
