export type BudgetStatusLabel = "on track" | "near limit" | "over budget";

export interface BudgetStatus {
  pct: number;
  barWidth: number;
  label: BudgetStatusLabel;
}

export function computeBudgetStatus(spent: number, limit: number): BudgetStatus {
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  const label: BudgetStatusLabel = pct >= 100 ? "over budget" : pct >= 80 ? "near limit" : "on track";
  return { pct, barWidth: Math.min(pct, 100), label };
}
