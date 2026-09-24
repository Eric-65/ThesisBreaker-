ALTER TABLE "monitoring_events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "orders" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "watchlist" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "monitoring_events" CASCADE;--> statement-breakpoint
DROP TABLE "orders" CASCADE;--> statement-breakpoint
DROP TABLE "watchlist" CASCADE;--> statement-breakpoint
ALTER TABLE "theses" ALTER COLUMN "symbol" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "theses" ALTER COLUMN "asset_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "theses" ALTER COLUMN "asset_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "theses" ALTER COLUMN "direction" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "theses" ALTER COLUMN "time_horizon" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "theses" ALTER COLUMN "time_horizon" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "theses" DROP COLUMN "position_size";--> statement-breakpoint
ALTER TABLE "theses" DROP COLUMN "risk_tolerance";--> statement-breakpoint
ALTER TABLE "theses" DROP COLUMN "catalysts";--> statement-breakpoint
ALTER TABLE "theses" DROP COLUMN "expected_outcome";--> statement-breakpoint
ALTER TABLE "theses" DROP COLUMN "original_analysis";--> statement-breakpoint
ALTER TABLE "theses" DROP COLUMN "original_extraction";--> statement-breakpoint
ALTER TABLE "theses" DROP COLUMN "initial_score";--> statement-breakpoint
ALTER TABLE "theses" DROP COLUMN "analysis";--> statement-breakpoint
ALTER TABLE "theses" DROP COLUMN "current_score";--> statement-breakpoint
ALTER TABLE "theses" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "theses" DROP COLUMN "paper_order_id";