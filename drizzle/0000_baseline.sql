CREATE TABLE "monitoring_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thesis_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"score_before" integer,
	"score_after" integer,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thesis_id" uuid NOT NULL,
	"alpaca_order_id" text,
	"client_order_id" text NOT NULL,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"qty" numeric NOT NULL,
	"order_type" text DEFAULT 'market' NOT NULL,
	"status" text NOT NULL,
	"estimated_price" numeric,
	"estimated_notional" numeric,
	"mode" text DEFAULT 'demo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "theses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"asset_type" text DEFAULT 'STOCK' NOT NULL,
	"direction" text NOT NULL,
	"time_horizon" text DEFAULT '3-6M' NOT NULL,
	"position_size" text DEFAULT '1000' NOT NULL,
	"risk_tolerance" text DEFAULT 'moderate' NOT NULL,
	"original_text" text NOT NULL,
	"catalysts" text,
	"expected_outcome" text,
	"original_analysis" jsonb NOT NULL,
	"original_extraction" jsonb NOT NULL,
	"initial_score" integer NOT NULL,
	"analysis" jsonb NOT NULL,
	"current_score" integer NOT NULL,
	"status" text DEFAULT 'CHALLENGED' NOT NULL,
	"paper_order_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"asset_type" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
ALTER TABLE "monitoring_events" ADD CONSTRAINT "monitoring_events_thesis_id_theses_id_fk" FOREIGN KEY ("thesis_id") REFERENCES "public"."theses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_thesis_id_theses_id_fk" FOREIGN KEY ("thesis_id") REFERENCES "public"."theses"("id") ON DELETE cascade ON UPDATE no action;