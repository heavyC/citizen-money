import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { db } from "@/db";
import { plaidItems } from "@/db/schema";
import { syncItemTransactions } from "@/lib/plaid-sync";

export async function POST() {
  try {
    const userId = await requireUserId();
    const items = await db.query.plaidItems.findMany({ where: eq(plaidItems.userId, userId) });

    const results = await Promise.all(
      items.map(async (item) => ({ itemId: item.id, ...(await syncItemTransactions(item.id)) })),
    );

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
