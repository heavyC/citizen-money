"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCategoryId, setSearch } from "@/store/slices/transaction-filters-slice";
import type { DbCategory } from "@/db/schema";

export function TransactionFilters({ categories }: { categories: DbCategory[] }) {
  const dispatch = useAppDispatch();
  const { categoryId, search } = useAppSelector((state) => state.transactionFilters);

  return (
    <div className="flex gap-3">
      <select
        value={categoryId ?? ""}
        onChange={(e) => dispatch(setCategoryId(e.target.value || null))}
        className="rounded-md border bg-background px-2 py-1.5 text-sm"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        value={search}
        onChange={(e) => dispatch(setSearch(e.target.value))}
        placeholder="Search transactions…"
        className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
      />
    </div>
  );
}
