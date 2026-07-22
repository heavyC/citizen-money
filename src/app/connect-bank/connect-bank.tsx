import { auth } from "@clerk/nextjs/server";
import { requireUserId } from "@/lib/auth";
import { PlaidLinkButton } from "@/components/plaid-link-button";

export async function ConnectBank() {
  await auth.protect();
  await requireUserId();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-16">
      <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm">
        This is a demo running against Plaid&apos;s sandbox environment. No real
        bank credentials are used or stored — use Plaid&apos;s test credentials
        (username <code>user_good</code>, password <code>pass_good</code>).
      </div>
      <h1 className="text-2xl font-semibold">Connect a bank account</h1>
      <PlaidLinkButton />
    </div>
  );
}
