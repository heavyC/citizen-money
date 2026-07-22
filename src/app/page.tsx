import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { requireUserId } from "@/lib/auth";

export default async function Home() {
  await auth.protect();
  await requireUserId();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-semibold">Citizen Money</h1>
      <div className="flex gap-4">
        <Link href="/dashboard" className="underline">
          Dashboard
        </Link>
        <Link href="/connect-bank" className="underline">
          Connect a bank account
        </Link>
      </div>
      <UserButton />
    </div>
  );
}
