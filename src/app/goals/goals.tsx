import { auth } from "@clerk/nextjs/server";
import { requireUserId } from "@/lib/auth";
import { getActiveGoals, computeGoalProjection } from "@/agents/goals/project";
import { GoalForm } from "@/components/goal-form";
import { DeleteGoalButton } from "@/components/delete-goal-button";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export async function Goals() {
  await auth.protect();
  const userId = await requireUserId();
  const activeGoals = await getActiveGoals(userId);
  const withProjections = await Promise.all(
    activeGoals.map(async (goal) => ({ goal, projection: await computeGoalProjection(goal) })),
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 py-16">
      <h1 className="text-2xl font-semibold">Goals</h1>
      <GoalForm />
      <div className="flex flex-col gap-4">
        {withProjections.length === 0 && <p className="text-sm text-muted-foreground">No goals yet.</p>}
        {withProjections.map(({ goal, projection }) => {
          const pct = Math.min((projection.currentAmount / Number(goal.targetAmount)) * 100, 100);
          return (
            <div key={goal.id} className="flex items-start justify-between gap-4 rounded-md border p-4">
              <div className="flex flex-1 flex-col gap-1">
                <p className="font-medium">{goal.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(projection.currentAmount)} / {formatCurrency(Number(goal.targetAmount))}
                  {projection.projectedCompletionDate && ` — projected ${projection.projectedCompletionDate}`}
                </p>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <DeleteGoalButton goalId={goal.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
