import { auth } from "@clerk/nextjs/server";
import { requireUserId } from "@/lib/auth";
import { getRecentTransactions } from "@/lib/finance";
import { TransactionFilters } from "@/components/transaction-filters";
import { TransactionTable } from "@/components/transaction-table";

export async function Transactions() {
  await auth.protect();
  const userId = await requireUserId();
  const transactions = await getRecentTransactions(userId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-16">
      <h1 className="text-2xl font-semibold">Transactions</h1>
      <TransactionFilters />
      <TransactionTable transactions={transactions} />
    </div>
  );
}
