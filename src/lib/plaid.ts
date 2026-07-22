import "server-only";
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV ?? "sandbox"],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
      "PLAID-SECRET": process.env.PLAID_SECRET!,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export async function createLinkToken(clerkUserId: string) {
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: clerkUserId },
    client_name: "Citizen Money",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
  });
  return response.data.link_token;
}

export async function exchangePublicToken(publicToken: string) {
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });
  return {
    accessToken: response.data.access_token,
    plaidItemId: response.data.item_id,
  };
}

/**
 * Fetches one page of transaction changes since `cursor` (or the beginning,
 * if `cursor` is undefined) via Plaid's cursor-based `/transactions/sync`.
 */
export async function syncTransactions(accessToken: string, cursor?: string) {
  const response = await plaidClient.transactionsSync({
    access_token: accessToken,
    cursor,
  });
  return response.data;
}
