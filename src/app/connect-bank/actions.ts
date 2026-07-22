"use server";

import { requireUserId } from "@/lib/auth";
import { createLinkToken, exchangePublicToken } from "@/lib/plaid";
import { db } from "@/db";
import { plaidItems } from "@/db/schema";
import { syncItemTransactions } from "@/lib/plaid-sync";

export async function createLinkTokenAction() {
  const userId = await requireUserId();
  return createLinkToken(userId);
}

export async function completeLinkAction(publicToken: string, institutionName?: string) {
  const userId = await requireUserId();
  const { accessToken, plaidItemId } = await exchangePublicToken(publicToken);

  const [item] = await db
    .insert(plaidItems)
    .values({ userId, plaidItemId, accessToken, institutionName })
    .returning({ id: plaidItems.id });

  return syncItemTransactions(item.id);
}
