import "server-only";
import { db } from "@/db";
import { insights } from "@/db/schema";
import { runAnomalyDetector } from "./anomaly-detector";
import { runSubscriptionScanner } from "./subscription-scanner";
import { runBudgetVarianceChecker } from "./budget-variance-checker";
import { runSavingsOpportunityFinder } from "./savings-opportunity-finder";
import { runBillTimingChecker } from "./bill-timing-checker";
import { runGoalProjectionChecker } from "./goal-projection-checker";
import { runReminderChecker } from "./reminder-checker";
import type { InsightCandidate } from "./types";

const SUB_AGENTS = [
  runAnomalyDetector,
  runSubscriptionScanner,
  runBudgetVarianceChecker,
  runSavingsOpportunityFinder,
  runBillTimingChecker,
  runGoalProjectionChecker,
  runReminderChecker,
];

/**
 * Runs every insight sub-agent for one user and stores new insights.
 * Dedup is enforced by the `insights` table's unique (userId, dedupKey)
 * index — inserting an already-surfaced insight is a silent no-op.
 */
export async function runInsightOrchestratorForUser(userId: string): Promise<{ newInsights: number }> {
  const candidateLists = await Promise.all(SUB_AGENTS.map((agent) => agent(userId)));
  const candidates: InsightCandidate[] = candidateLists.flat();

  let newInsights = 0;
  for (const candidate of candidates) {
    const [inserted] = await db
      .insert(insights)
      .values({
        userId,
        type: candidate.type,
        title: candidate.title,
        body: candidate.body,
        severity: candidate.severity,
        dedupKey: candidate.dedupKey,
        metadata: candidate.metadata ?? {},
      })
      .onConflictDoNothing({ target: [insights.userId, insights.dedupKey] })
      .returning({ id: insights.id });
    if (inserted) newInsights += 1;
  }

  return { newInsights };
}

/** Runs the orchestrator for every user in the system (the scheduled cron path). */
export async function runInsightOrchestratorForAllUsers(): Promise<
  { userId: string; newInsights?: number; error?: string }[]
> {
  const allUsers = await db.query.users.findMany();
  const results = [];
  for (const user of allUsers) {
    try {
      results.push({ userId: user.id, ...(await runInsightOrchestratorForUser(user.id)) });
    } catch (error) {
      // A user account can be deleted between listing users and processing
      // this one; don't let that abort the run for everyone else.
      results.push({ userId: user.id, error: String(error) });
    }
  }
  return results;
}
