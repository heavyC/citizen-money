# Citizen Money

An AI layer on top of personal finance data: Plaid-synced transactions, an AI
categorizer, a chat agent that answers questions grounded in your own data, a
proactive insight engine, a weekly digest, goal tracking with AI check-ins,
and a subscription audit agent.

This is a demo running against Plaid's **sandbox** environment. No real bank
credentials are ever used or stored.

## Stack

Next.js (App Router) + Tailwind + shadcn/ui, Clerk (auth), Neon Postgres via
Drizzle ORM, Plaid (sandbox), Claude (Anthropic API) via LangGraph.js, Resend
(email), Redux Toolkit (client UI state only).

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in:

   | Var | Where to get it |
   | --- | --- |
   | `DATABASE_URL` | A [Neon](https://neon.tech) Postgres project connection string |
   | `PLAID_CLIENT_ID`, `PLAID_SECRET` | A [Plaid](https://dashboard.plaid.com) account, sandbox keys. Leave `PLAID_ENV=sandbox` |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | A [Clerk](https://clerk.com) application |
   | `ANTHROPIC_API_KEY` | An [Anthropic](https://console.anthropic.com) API key |
   | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | A [Resend](https://resend.com) account (optional — digest generation works without it, email sending is skipped if unset) |
   | `CRON_SECRET` | Any random string — guards the `/api/cron/*` routes |

3. Apply the database schema and seed the base categories:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. Run the app:

   ```bash
   npm run dev
   ```

5. Sign up, then connect a bank account from `/connect-bank` using Plaid's
   sandbox test credentials: username `user_good`, password `pass_good`.

## Scheduled jobs

`/api/cron/insights` (daily) and `/api/cron/digest` (weekly) are Route
Handlers guarded by `CRON_SECRET`, intended to be triggered by Vercel Cron
(see `vercel.json`) — sent as `Authorization: Bearer $CRON_SECRET`. Each also
has a manual "run now" trigger in-app (Alerts and Digest pages) for trying
them without waiting on a schedule.

## Testing

```bash
npm test          # Vitest unit/integration tests
npm run test:e2e  # Playwright end-to-end tests (starts the dev server itself)
```

Both suites run against the real Neon database and real Plaid sandbox /
Anthropic APIs configured in `.env` — there are no mocks for the core data
paths, only for third-party side effects like sending email.
