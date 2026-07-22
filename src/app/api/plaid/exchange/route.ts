import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { exchangePublicToken } from "@/lib/plaid";
import { db } from "@/db";
import { plaidItems } from "@/db/schema";

const bodySchema = z.object({
  publicToken: z.string(),
  institutionName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const { publicToken, institutionName } = bodySchema.parse(await request.json());

    const { accessToken, plaidItemId } = await exchangePublicToken(publicToken);

    const [item] = await db
      .insert(plaidItems)
      .values({ userId, plaidItemId, accessToken, institutionName })
      .returning({ id: plaidItems.id });

    return NextResponse.json({ itemId: item.id });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
