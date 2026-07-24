import { auth } from "@clerk/nextjs/server";
import { requireUserId } from "@/lib/auth";
import { getBudgetsWithSpend } from "@/lib/finance";
import { listCategories } from "@/lib/category-repo";
import { BudgetProgress } from "@/components/budget-progress";
import { BudgetForm } from "@/components/budget-form";
import { DeleteBudgetButton } from "@/components/delete-budget-button";

export async function Budgets() {
  await auth.protect();
  const userId = await requireUserId();
  const [budgets, categories] = await Promise.all([getBudgetsWithSpend(userId), listCategories()]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 py-16">
      <h1 className="text-2xl font-semibold">Budgets</h1>
      <BudgetForm categories={categories} />
      <div className="flex flex-col gap-4">
        {budgets.length === 0 && <p className="text-sm text-muted-foreground">No budgets set yet.</p>}
        {budgets.map((budget) => (
          <div key={budget.id} className="flex items-center gap-3">
            <div className="flex-1">
              <BudgetProgress category={budget.categoryName} limit={Number(budget.monthlyLimit)} spent={budget.spent} />
            </div>
            <DeleteBudgetButton budgetId={budget.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
