import { auth } from "@clerk/nextjs/server";
import { requireUserId } from "@/lib/auth";
import { getSubscriptionsWithFlags, totalMonthlySpend } from "@/lib/subscription-audit";
import { ReminderForm } from "@/components/reminder-form";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export async function Subscriptions() {
  await auth.protect();
  const userId = await requireUserId();
  const subscriptions = await getSubscriptionsWithFlags(userId);
  const total = totalMonthlySpend(subscriptions);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-16">
      <h1 className="text-2xl font-semibold">Subscriptions</h1>
      <p className="text-sm text-muted-foreground">
        {subscriptions.length} recurring charges, {formatCurrency(total)}/month total.
      </p>
      <div className="flex flex-col gap-3">
        {subscriptions.length === 0 && <p className="text-sm text-muted-foreground">No subscriptions detected yet.</p>}
        {subscriptions.map((sub) => (
          <div key={sub.id} className="flex items-center justify-between gap-4 rounded-md border p-4">
            <div className="flex flex-col gap-1">
              <p className="font-medium">{sub.merchantNameNormalized}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(Number(sub.amount))}/{sub.cadence} · last seen {sub.lastSeenDate}
              </p>
              <div className="flex gap-2">
                {sub.likelyUnused && (
                  <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-700 dark:text-yellow-400">
                    Likely unused
                  </span>
                )}
                {sub.duplicateOf.length > 0 && (
                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-700 dark:text-red-400">
                    Possible duplicate of {sub.duplicateOf.join(", ")}
                  </span>
                )}
              </div>
            </div>
            <ReminderForm subscriptionId={sub.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
