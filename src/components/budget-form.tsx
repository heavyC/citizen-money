"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { upsertBudget } from "@/app/budgets/actions";
import type { DbCategory } from "@/db/schema";

export function BudgetForm({ categories }: { categories: DbCategory[] }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        const categoryId = String(formData.get("categoryId"));
        const monthlyLimit = Number(formData.get("monthlyLimit"));
        await upsertBudget(categoryId, monthlyLimit);
        formRef.current?.reset();
      }}
      className="flex items-end gap-3"
    >
      <label className="flex flex-col gap-1 text-sm">
        Category
        <select name="categoryId" className="rounded-md border bg-background px-2 py-1.5" required>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
