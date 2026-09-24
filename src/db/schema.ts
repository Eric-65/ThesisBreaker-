import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  uuid,
  numeric,
} from "drizzle-orm/pg-core";

export const theses = pgTable("theses", {
  id: uuid("id").primaryKey().defaultRandom(),
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull().default("STOCK"), // STOCK|ETF|CRYPTO|NFT_COLLECTION
  direction: text("direction").notNull(), // "long" | "short"
  timeHorizon: text("time_horizon").notNull().default("3-6M"),
  positionSize: text("position_size").notNull().default("1000"),
  riskTolerance: text("risk_tolerance").notNull().default("moderate"),
  originalText: text("original_text").notNull(),
  catalysts: text("catalysts"),
  expectedOutcome: text("expected_outcome"),

  // Immutable snapshot of first analysis (WHAT I BELIEVED THEN)
  originalAnalysis: jsonb("original_analysis").notNull(),
  originalExtraction: jsonb("original_extraction").notNull(),
  initialScore: integer("initial_score").notNull(),

  // Latest analysis (WHAT THE EVIDENCE SHOWS NOW)
  analysis: jsonb("analysis").notNull(),
  currentScore: integer("current_score").notNull(),
  status: text("status").notNull().default("CHALLENGED"),
  paperOrderId: text("paper_order_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  thesisId: uuid("thesis_id").notNull().references(() => theses.id, { onDelete: "cascade" }),
  alpacaOrderId: text("alpaca_order_id"),
  clientOrderId: text("client_order_id").notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // buy | sell
  qty: numeric("qty").notNull(),
  orderType: text("order_type").notNull().default("market"),
  status: text("status").notNull(), // filled | pending | rejected | ...
  estimatedPrice: numeric("estimated_price"),
  estimatedNotional: numeric("estimated_notional"),
  mode: text("mode").notNull().default("demo"), // demo | live
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const monitoringEvents = pgTable("monitoring_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  thesisId: uuid("thesis_id").notNull().references(() => theses.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  message: text("message").notNull(),
  scoreBefore: integer("score_before"),
  scoreAfter: integer("score_after"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Thesis = typeof theses.$inferSelect;
export type NewThesis = typeof theses.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type MonitoringEvent = typeof monitoringEvents.$inferSelect;
export type NewMonitoringEvent = typeof monitoringEvents.$inferInsert;

export const watchlist = pgTable("watchlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  symbol: text("symbol").notNull().unique(),
  assetType: text("asset_type").notNull(), // STOCK|ETF|CRYPTO|NFT_COLLECTION
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WatchlistItem = typeof watchlist.$inferSelect;
