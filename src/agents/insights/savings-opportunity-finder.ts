import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { currentYearMonth } from "@/lib/date-range";
import type { InsightCandidate } from "./types";

const IDLE_CASH_THRESHOLD = 2000;

/** Flags checking accounts sitting on a large balance that could earn more in savings. */
export async function runSavingsOpportunityFinder(userId: string): Promise<InsightCandidate[]> {
  const userAccounts = await db.query.accounts.findMany({ where: eq(accounts.userId, userId) });

  const candidates: InsightCandidate[] = [];
  for (const account of userAccounts) {
    if (account.type !== "depository" || account.subtype === "savings") continue;

    const balance = Number(account.currentBalance ?? 0);
    if (balance > IDLE_CASH_THRESHOLD) {
      candidates.push({
        type: "savings_opportunity",
        title: "Idle cash sitting in checking",
        body: `${account.name} has $${balance.toFixed(2)} sitting in checking, earning little to no interest. Consider moving some to savings.`,
        severity: "info",
        dedupKey: `savings-opportunity:${account.id}:${currentYearMonth()}`,
        metadata: { accountId: account.id, balance },
      });
    }
  }
  return candidates;
}
