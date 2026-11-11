import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * One row per person: created anonymously from the `tb_vid` cookie and, if they
 * sign in, the same row gains an email (Auth.js uses this table directly).
 *
 * Naming: `visitor_id` is the anonymous id ("anon_id") and `image` is the
 * avatar URL — Auth.js requires the `name`, `email`, `emailVerified` and
 * `image` property names.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    visitorId: text("visitor_id").notNull().unique(),
    email: text("email").unique(),
    name: text("name"),
    emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
    image: text("image"),

    /** Public name chosen by the user; only shown when `showOnWall` is true. */
    displayName: varchar("display_name", { length: 30 }),
    showOnWall: boolean("show_on_wall").notNull().default(false),
    /** 7-char invite code, assigned when the row becomes an account. */
    referralCode: text("referral_code").unique(),
    /** Set once, when the account is created from an invite link. Never changed. */
    referredByUserId: uuid("referred_by_user_id").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
    /** Team/test accounts: excluded from every public number and the leaderboard. */
    isInternal: boolean("is_internal").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** When the row became an account (first sign-in). Null while anonymous. */
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    visitCount: integer("visit_count").notNull().default(1),
  },
  (t) => [
    index("users_last_seen_at_idx").on(t.lastSeenAt),
    index("users_created_at_idx").on(t.createdAt),
    index("users_joined_at_idx").on(t.joinedAt),
    index("users_referred_by_user_id_idx").on(t.referredByUserId),
  ],
);

// --- Auth.js tables (shape required by @auth/drizzle-adapter) ---

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] }), index("accounts_user_id_idx").on(t.userId)],
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/**
 * One stress-tested trade idea. `originalText` is what the trader typed; the
 * rest is the analysis. Rows created before Phase 1 have a null `verdict` and
 * are hidden from History.
 */
export const theses = pgTable(
  "theses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    symbol: text("symbol"), // underlying ticker, e.g. "NVDA" or "BTC"
    assetType: text("asset_type"), // "stock_token" | "crypto" | null
    direction: text("direction"), // "long" | "short" | "neutral"
    timeHorizon: text("time_horizon"),
    originalText: text("original_text").notNull(),

    verdict: text("verdict"), // "PASS" | "REVISE" | "BLOCK"
    fragility: integer("fragility"), // 0-100, overall
    weakestAssumption: text("weakest_assumption"),
    whatMustBeTrue: jsonb("what_must_be_true").$type<string[]>(),
    summary: text("summary"),
    marketSnapshot: jsonb("market_snapshot"),
    engine: text("engine"), // "qwen" | "offline"
    model: text("model"),
    inputHash: text("input_hash"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("theses_input_hash_idx").on(t.inputHash),
    index("theses_created_at_idx").on(t.createdAt),
    index("theses_user_id_created_at_idx").on(t.userId, t.createdAt),
  ],
);

export const assumptions = pgTable(
  "assumptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    thesisId: uuid("thesis_id")
      .notNull()
      .references(() => theses.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    text: text("text").notNull(),
    category: text("category").notNull(), // fundamental|technical|timing|liquidity|macro|sentiment
    evidenceFor: jsonb("evidence_for").$type<string[]>().notNull(),
    evidenceAgainst: jsonb("evidence_against").$type<string[]>().notNull(),
    status: text("status").notNull(), // holds|weak|broken
    fragility: integer("fragility").notNull(), // 0-100
  },
  (t) => [index("assumptions_thesis_id_idx").on(t.thesisId)],
);

/** Token accounting for every Qwen request (and cache hits, at zero tokens). */
export const qwenCalls = pgTable(
  "qwen_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    thesisId: uuid("thesis_id").references(() => theses.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    inputHash: text("input_hash"),
    model: text("model").notNull(),
    status: text("status").notNull(), // ok | error | cache_hit
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    reasoningTokens: integer("reasoning_tokens"),
    totalTokens: integer("total_tokens"),
    latencyMs: integer("latency_ms"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("qwen_calls_created_at_idx").on(t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Thesis = typeof theses.$inferSelect;
export type AssumptionRow = typeof assumptions.$inferSelect;
export type QwenCall = typeof qwenCalls.$inferSelect;
