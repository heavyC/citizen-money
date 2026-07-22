"use client";

import { Button } from "@/components/ui/button";
import { deleteGoal } from "@/app/goals/actions";

export function DeleteGoalButton({ goalId }: { goalId: string }) {
  return (
    <Button variant="ghost" size="sm" onClick={() => deleteGoal(goalId)}>
      Remove
    </Button>
  );
}
