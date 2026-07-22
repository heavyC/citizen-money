import type { insights } from "@/db/schema";

export interface InsightCandidate {
  type: (typeof insights.$inferInsert)["type"];
  title: string;
  body: string;
  severity: (typeof insights.$inferInsert)["severity"];
  dedupKey: string;
  metadata?: Record<string, unknown>;
}
