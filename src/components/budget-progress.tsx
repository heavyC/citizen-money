import { computeBudgetStatus, type BudgetStatusLabel } from "@/lib/budget-status";

const STATUS_COLOR: Record<BudgetStatusLabel, string> = {
  "on track": "#0ca30c",
  "near limit": "#fab219",
  "over budget": "#d03b3b",
};

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function BudgetProgress({
  category,
  limit,
  spent,
}: {
  category: string;
  limit: number;
  spent: number;
}) {
  const status = computeBudgetStatus(spent, limit);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{category}</span>
        <span className="text-muted-foreground">
          {formatCurrency(spent)} / {formatCurrency(limit)} ({status.label})
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted">
        <div
          className="h-3 rounded-full"
          style={{ width: `${status.barWidth}%`, backgroundColor: STATUS_COLOR[status.label] }}
        />
      </div>
    </div>
  );
}
