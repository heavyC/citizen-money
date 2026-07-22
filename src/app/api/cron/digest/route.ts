import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { digests } from "@/db/schema";
import { generateWeeklyDigest } from "@/agents/digest/generate";
import { sendDigestEmail } from "@/lib/resend";

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
}

/** Invoked by Vercel Cron (see vercel.json), which sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allUsers = await db.query.users.findMany();
  const results = [];

  for (const user of allUsers) {
    try {
      const digest = await generateWeeklyDigest(user.id);
      if (digest && !digest.emailSentAt) {
        await sendDigestEmail(user.email, "Your weekly financial digest", digest.narrative);
        await db.update(digests).set({ emailSentAt: new Date() }).where(eq(digests.id, digest.id));
      }
      results.push({ userId: user.id, digestId: digest?.id });
    } catch (error) {
      // A user account can be deleted between listing users and processing
      // this one; don't let that abort digests for everyone else.
      results.push({ userId: user.id, error: String(error) });
    }
  }

  return NextResponse.json({ results });
}
