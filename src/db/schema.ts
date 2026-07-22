import {
  pgTable,
  text,
  timestamp,
  numeric,
  boolean,
  jsonb,
  uuid,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const plaidItems = pgTable("plaid_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plaidItemId: text("plaid_item_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  institutionName: text("institution_name"),
  syncCursor: text("sync_cursor"),
  status: text("status", { enum: ["active", "error", "disconnected"] }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  plaidItemId: uuid("plaid_item_id").notNull().references(() => plaidItems.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plaidAccountId: text("plaid_account_id").notNull().unique(),
  name: text("name").notNull(),
  officialName: text("official_name"),
  type: text("type").notNull(),
  subtype: text("subtype"),
  currentBalance: numeric("current_balance", { precision: 14, scale: 2 }),
  availableBalance: numeric("available_balance", { precision: 14, scale: 2 }),
  isoCurrencyCode: text("iso_currency_code").notNull().default("USD"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    plaidTransactionId: text("plaid_transaction_id").notNull().unique(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    isoCurrencyCode: text("iso_currency_code").notNull().default("USD"),
    date: date("date").notNull(),
    authorizedDate: date("authorized_date"),
    name: text("name").notNull(),
    merchantName: text("merchant_name"),
    plaidCategory: text("plaid_category"),
    plaidCategoryConfidence: text("plaid_category_confidence"),
    category: text("category").notNull(),
    categorySource: text("category_source", { enum: ["plaid", "ai", "user_correction"] })
      .notNull()
      .default("plaid"),
    pending: boolean("pending").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.date),
    index("transactions_account_idx").on(t.accountId),
  ],
);

export const categoryCorrections = pgTable(
  "category_corrections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    merchantNameNormalized: text("merchant_name_normalized").notNull(),
    category: text("category").notNull(),
    exampleTransactionId: uuid("example_transaction_id").references(() => transactions.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("category_corrections_user_merchant_idx").on(t.userId, t.merchantNameNormalized)],
);

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  goalType: text("goal_type", {
    enum: ["emergency_fund", "vacation", "debt_payoff", "custom"],
  }).notNull(),
  targetAmount: numeric("target_amount", { precision: 14, scale: 2 }).notNull(),
  targetDate: date("target_date"),
  linkedAccountId: uuid("linked_account_id").references(() => accounts.id, { onDelete: "set null" }),
  startingAmount: numeric("starting_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  status: text("status", { enum: ["active", "completed", "abandoned"] }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const goalProgressSnapshots = pgTable(
  "goal_progress_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    goalId: uuid("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
    snapshotDate: date("snapshot_date").notNull(),
    currentAmount: numeric("current_amount", { precision: 14, scale: 2 }).notNull(),
    projectedCompletionDate: date("projected_completion_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("goal_progress_snapshots_goal_idx").on(t.goalId)],
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    monthlyLimit: numeric("monthly_limit", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("budgets_user_category_idx").on(t.userId, t.category)],
);

export const insights = pgTable(
  "insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: [
        "anomaly",
        "subscription",
        "budget_variance",
        "savings_opportunity",
        "bill_timing",
        "goal_projection",
      ],
    }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    severity: text("severity", { enum: ["info", "warning", "action"] }).notNull().default("info"),
    dedupKey: text("dedup_key").notNull(),
    status: text("status", { enum: ["new", "seen", "dismissed"] }).notNull().default("new"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("insights_user_status_created_idx").on(t.userId, t.status, t.createdAt),
    uniqueIndex("insights_user_dedup_idx").on(t.userId, t.dedupKey),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    merchantNameNormalized: text("merchant_name_normalized").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    cadence: text("cadence", { enum: ["weekly", "monthly", "annual", "irregular"] }).notNull(),
    firstSeenDate: date("first_seen_date").notNull(),
    lastSeenDate: date("last_seen_date").notNull(),
    status: text("status", { enum: ["active", "likely_cancelled"] }).notNull().default("active"),
    relatedTransactionIds: jsonb("related_transaction_ids").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("subscriptions_user_merchant_idx").on(t.userId, t.merchantNameNormalized)],
);

export const cancellationReminders = pgTable("cancellation_reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: uuid("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  remindAt: date("remind_at").notNull(),
  note: text("note"),
  status: text("status", { enum: ["pending", "completed", "dismissed"] }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const digests = pgTable("digests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  narrative: text("narrative").notNull(),
  stats: jsonb("stats").notNull().default({}),
  emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").notNull(),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull(),
    toolCalls: jsonb("tool_calls"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("chat_messages_conversation_idx").on(t.conversationId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type PlaidItem = typeof plaidItems.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type CategoryCorrection = typeof categoryCorrections.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type GoalProgressSnapshot = typeof goalProgressSnapshots.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Insight = typeof insights.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type CancellationReminder = typeof cancellationReminders.$inferSelect;
export type Digest = typeof digests.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
