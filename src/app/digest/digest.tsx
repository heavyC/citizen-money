import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { db } from "@/db";
import { digests } from "@/db/schema";
import { GenerateDigestButton } from "@/components/generate-digest-button";

export async function Digest() {
  await auth.protect();
  const userId = await requireUserId();

  const userDigests = await db.query.digests.findMany({
    where: eq(digests.userId, userId),
    orderBy: [desc(digests.periodEnd)],
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Weekly digest</h1>
        <GenerateDigestButton />
      </div>
      <div className="flex flex-col gap-4">
        {userDigests.length === 0 && <p className="text-sm text-muted-foreground">No digests yet.</p>}
        {userDigests.map((digest) => (
          <div key={digest.id} className="rounded-md border p-4">
            <p className="text-xs text-muted-foreground">
              {digest.periodStart} – {digest.periodEnd}
            </p>
            <p className="mt-2 text-sm whitespace-pre-wrap">{digest.narrative}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
