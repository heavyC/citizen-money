import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, type DbCategory } from "@/db/schema";

export async function listCategories(): Promise<DbCategory[]> {
  return db.query.categories.findMany({ orderBy: (c, { asc }) => [asc(c.name)] });
}

export async function getCategoryIdByName(name: string): Promise<string | null> {
  const row = await db.query.categories.findFirst({ where: eq(categories.name, name) });
  return row?.id ?? null;
}

/** Case-insensitive name lookup — for resolving LLM-provided category names. */
export async function getCategoryIdByNameCI(name: string): Promise<string | null> {
  const row = await db.query.categories.findFirst({ where: sql`lower(${categories.name}) = lower(${name})` });
  return row?.id ?? null;
}

/**
 * Resolves a category name to its id, creating the row if this is the first
 * time we've seen it (e.g. a new Plaid taxonomy value). Safe under races —
 * loses a concurrent insert race gracefully by re-reading.
 */
export async function getOrCreateCategoryId(name: string): Promise<string> {
  const existing = await getCategoryIdByName(name);
  if (existing) return existing;

  const [created] = await db.insert(categories).values({ name }).onConflictDoNothing({ target: categories.name }).returning({ id: categories.id });
  if (created) return created.id;

  const raced = await getCategoryIdByName(name);
  if (!raced) {
    throw new Error(`Failed to resolve category "${name}" after insert race`);
  }
  return raced;
}
