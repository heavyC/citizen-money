import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, ne } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { db } from "@/db";
import { insights } from "@/db/schema";
import { RunInsightsButton } from "@/components/run-insights-button";
import { DismissInsightButton } from "@/components/dismiss-insight-button";

const SEVERITY_COLOR: Record<string, string> = {
  info: "#0ca30c",
  warning: "#fab219",
  action: "#d03b3b",
};

export async function Alerts() {
  await auth.protect();
  const userId = await requireUserId();

  const userInsights = await db.query.insights.findMany({
    where: and(eq(insights.userId, userId), ne(insights.status, "dismissed")),
    orderBy: [desc(insights.createdAt)],
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Alerts</h1>
        <RunInsightsButton />
      </div>
      <div className="flex flex-col gap-3">
        {userInsights.length === 0 && <p className="text-sm text-muted-foreground">No alerts right now.</p>}
        {userInsights.map((insight) => (
          <div key={insight.id} className="flex items-start justify-between gap-4 rounded-md border p-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: SEVERITY_COLOR[insight.severity] }}
                />
                <span className="text-xs uppercase text-muted-foreground">{insight.severity}</span>
              </div>
              <p className="font-medium">{insight.title}</p>
              <p className="text-sm text-muted-foreground">{insight.body}</p>
            </div>
            <DismissInsightButton insightId={insight.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
