"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCategory, setSearch } from "@/store/slices/transaction-filters-slice";
import { CATEGORIES } from "@/lib/categories";

export function TransactionFilters() {
  const dispatch = useAppDispatch();
  const { category, search } = useAppSelector((state) => state.transactionFilters);

  return (
    <div className="flex gap-3">
      <select
        value={category ?? ""}
        onChange={(e) => dispatch(setCategory(e.target.value || null))}
        className="rounded-md border bg-background px-2 py-1.5 text-sm"
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
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
