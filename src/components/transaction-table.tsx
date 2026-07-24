"use client";

import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { correctTransactionCategory } from "@/app/transactions/actions";
import type { DbCategory } from "@/db/schema";
import type { TransactionWithCategory } from "@/lib/finance";

function formatCurrency(value: string): string {
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function TransactionTable({
  transactions,
  categories,
}: {
  transactions: TransactionWithCategory[];
  categories: DbCategory[];
}) {
  const { categoryId, search } = useAppSelector((state) => state.transactionFilters);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions.filter((txn) => {
      if (categoryId && txn.categoryId !== categoryId) return false;
      if (term && !txn.name.toLowerCase().includes(term) && !(txn.merchantName ?? "").toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [transactions, categoryId, search]);

  if (filtered.length === 0) {
    return <p className="text-sm text-muted-foreground">No transactions match.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 font-normal">Date</th>
          <th className="py-2 font-normal">Name</th>
          <th className="py-2 font-normal">Category</th>
          <th className="py-2 text-right font-normal">Amount</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((txn) => (
          <tr key={txn.id} className="border-b last:border-0">
            <td className="py-2 tabular-nums">{txn.date}</td>
            <td className="py-2">{txn.merchantName ?? txn.name}</td>
            <td className="py-2">
              <select
                defaultValue={txn.categoryId}
                onChange={(e) => correctTransactionCategory(txn.id, e.target.value)}
                className="rounded-md border bg-background px-1.5 py-1 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </td>
            <td className="py-2 text-right tabular-nums">{formatCurrency(txn.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
