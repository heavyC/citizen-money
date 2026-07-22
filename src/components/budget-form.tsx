"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";
import { upsertBudget } from "@/app/budgets/actions";

export function BudgetForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        const category = String(formData.get("category"));
        const monthlyLimit = Number(formData.get("monthlyLimit"));
        await upsertBudget(category, monthlyLimit);
        formRef.current?.reset();
      }}
      className="flex items-end gap-3"
    >
      <label className="flex flex-col gap-1 text-sm">
        Category
        <select name="category" className="rounded-md border bg-background px-2 py-1.5" required>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Monthly limit
        <input
          name="monthlyLimit"
          type="number"
          min="0"
          step="1"
          required
          className="w-32 rounded-md border bg-background px-2 py-1.5"
        />
      </label>
      <Button type="submit">Save budget</Button>
    </form>
  );
}
