import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { requireUserId } from "@/lib/auth";
import { getAccountsForUser, getNetWorth, getSpendingByCategory } from "@/lib/finance";
import { StatTile } from "@/components/stat-tile";
import { SpendingChart } from "@/components/spending-chart";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export async function Dashboard() {
  await auth.protect();
  const userId = await requireUserId();

  const [accounts, netWorth, spending] = await Promise.all([
    getAccountsForUser(userId),
    getNetWorth(userId),
    getSpendingByCategory(userId),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <nav className="flex gap-4 text-sm underline">
          <Link href="/connect-bank">Connect bank</Link>
          <Link href="/transactions">Transactions</Link>
          <Link href="/budgets">Budgets</Link>
          <Link href="/chat">Chat</Link>
          <Link href="/alerts">Alerts</Link>
          <Link href="/digest">Digest</Link>
          <Link href="/goals">Goals</Link>
          <Link href="/subscriptions">Subscriptions</Link>
        </nav>
      </div>

      <StatTile label="Net worth" value={formatCurrency(netWorth)} />

      <div>
        <h2 className="mb-3 text-lg font-medium">Spending by category (last 30 days)</h2>
        <SpendingChart data={spending} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Accounts</h2>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accounts connected yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {accounts.map((account) => (
              <li key={account.id} className="flex justify-between rounded-md border p-3 text-sm">
                <span>{account.name}</span>
                <span className="tabular-nums">{formatCurrency(Number(account.currentBalance ?? 0))}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
