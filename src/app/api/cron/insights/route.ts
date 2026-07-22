import { NextResponse } from "next/server";
import { runInsightOrchestratorForAllUsers } from "@/agents/insights/orchestrator";

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
}

/** Invoked by Vercel Cron (see vercel.json), which sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results = await runInsightOrchestratorForAllUsers();
  return NextResponse.json({ results });
}
