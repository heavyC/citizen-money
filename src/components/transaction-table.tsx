"use client";

import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { CATEGORIES } from "@/lib/categories";
import { correctTransactionCategory } from "@/app/transactions/actions";
import type { Transaction } from "@/db/schema";

function formatCurrency(value: string): string {
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  const { category, search } = useAppSelector((state) => state.transactionFilters);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions.filter((txn) => {
      if (category && txn.category !== category) return false;
      if (term && !txn.name.toLowerCase().includes(term) && !(txn.merchantName ?? "").toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [transactions, category, search]);

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
                defaultValue={txn.category}
                onChange={(e) => correctTransactionCategory(txn.id, e.target.value)}
                className="rounded-md border bg-background px-1.5 py-1 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {!CATEGORIES.includes(txn.category as (typeof CATEGORIES)[number]) && (
                  <option value={txn.category}>{txn.category}</option>
                )}
              </select>
            </td>
            <td className="py-2 text-right tabular-nums">{formatCurrency(txn.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
