import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * One stress-tested trade idea. `originalText` is what the trader typed; the
 * rest is the analysis. Rows created before Phase 1 have a null `verdict` and
 * are hidden from History.
 */
export const theses = pgTable(
  "theses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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

export type Thesis = typeof theses.$inferSelect;
export type AssumptionRow = typeof assumptions.$inferSelect;
export type QwenCall = typeof qwenCalls.$inferSelect;
