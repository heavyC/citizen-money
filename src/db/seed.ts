import { db } from "./index";
import { categories } from "./schema";
import { CATEGORIES } from "@/lib/categories";

async function main() {
  await db
    .insert(categories)
    .values(CATEGORIES.map((name) => ({ name })))
    .onConflictDoNothing({ target: categories.name });
  console.log(`Seeded ${CATEGORIES.length} categories.`);
}

main();
