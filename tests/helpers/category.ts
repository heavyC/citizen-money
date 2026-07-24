import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";

/** Test helper: get-or-create a category row by name, returning its id. */
export async function seedCategoryId(name: string): Promise<string> {
  const existing = await db.query.categories.findFirst({ where: eq(categories.name, name) });
  if (existing) return existing.id;

  const [created] = await db.insert(categories).values({ name }).onConflictDoNothing({ target: categories.name }).returning({ id: categories.id });
  if (created) return created.id;

  const raced = await db.query.categories.findFirst({ where: eq(categories.name, name) });
  if (!raced) throw new Error(`Failed to seed category "${name}"`);
  return raced.id;
}
