import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { createLinkToken } from "@/lib/plaid";

export async function POST() {
  try {
    const userId = await requireUserId();
    const linkToken = await createLinkToken(userId);
    return NextResponse.json({ linkToken });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
