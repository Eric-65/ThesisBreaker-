-- ThesisBreaker: create or update the production database (all migrations up to 0004) without a terminal.
-- Works on a brand-new empty database and on one that already has earlier migrations.
-- Paste this whole script into the database's SQL editor (e.g. Neon / Supabase) and run it once.
-- Safe to run more than once: each migration runs only if it hasn't been
-- recorded yet, and it is recorded exactly the way `npm run db:migrate` does,
-- so future migrations keep working. If anything fails, nothing is changed.

BEGIN;

CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

-- 0000_baseline
DO $mig$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1790256776515) THEN
    EXECUTE $stmt$CREATE TABLE "monitoring_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thesis_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"score_before" integer,
	"score_after" integer,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$stmt$;
    EXECUTE $stmt$CREATE TABLE "orders" (
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
);$stmt$;
    EXECUTE $stmt$CREATE TABLE "theses" (
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
);$stmt$;
    EXECUTE $stmt$CREATE TABLE "watchlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"asset_type" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_symbol_unique" UNIQUE("symbol")
);$stmt$;
    EXECUTE $stmt$ALTER TABLE "monitoring_events" ADD CONSTRAINT "monitoring_events_thesis_id_theses_id_fk" FOREIGN KEY ("thesis_id") REFERENCES "public"."theses"("id") ON DELETE cascade ON UPDATE no action;$stmt$;
    EXECUTE $stmt$ALTER TABLE "orders" ADD CONSTRAINT "orders_thesis_id_theses_id_fk" FOREIGN KEY ("thesis_id") REFERENCES "public"."theses"("id") ON DELETE cascade ON UPDATE no action;$stmt$;
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('f8b8735ebe538af0deb01b5941199e3aa2be6f99f2a78acd488b4aa986ecf3b2', 1790256776515);
    RAISE NOTICE 'applied 0000_baseline';
  ELSE
    RAISE NOTICE 'already applied: 0000_baseline';
  END IF;
END
$mig$;

-- 0001_drop_paper_trading
DO $mig$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1790256884576) THEN
    EXECUTE $stmt$ALTER TABLE "monitoring_events" DISABLE ROW LEVEL SECURITY;$stmt$;
    EXECUTE $stmt$ALTER TABLE "orders" DISABLE ROW LEVEL SECURITY;$stmt$;
    EXECUTE $stmt$ALTER TABLE "watchlist" DISABLE ROW LEVEL SECURITY;$stmt$;
    EXECUTE $stmt$DROP TABLE "monitoring_events" CASCADE;$stmt$;
    EXECUTE $stmt$DROP TABLE "orders" CASCADE;$stmt$;
    EXECUTE $stmt$DROP TABLE "watchlist" CASCADE;$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" ALTER COLUMN "symbol" DROP NOT NULL;$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" ALTER COLUMN "asset_type" DROP DEFAULT;$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" ALTER COLUMN "asset_type" DROP NOT NULL;$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" ALTER COLUMN "direction" DROP NOT NULL;$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" ALTER COLUMN "time_horizon" DROP DEFAULT;$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" ALTER COLUMN "time_horizon" DROP NOT NULL;$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" DROP COLUMN "position_size";$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" DROP COLUMN "risk_tolerance";$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" DROP COLUMN "catalysts";$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" DROP COLUMN "expected_outcome";$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" DROP COLUMN "original_analysis";$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" DROP COLUMN "original_extraction";$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" DROP COLUMN "initial_score";$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" DROP COLUMN "analysis";$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" DROP COLUMN "current_score";$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" DROP COLUMN "status";$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" DROP COLUMN "paper_order_id";$stmt$;
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('47081cad330ae27b22a89265e18807195a739a4e9ef6eb70a8f8eb0f8cdcbaf2', 1790256884576);
    RAISE NOTICE 'applied 0001_drop_paper_trading';
  ELSE
    RAISE NOTICE 'already applied: 0001_drop_paper_trading';
  END IF;
END
$mig$;

-- 0002_phase1_stress_test
DO $mig$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1790256898986) THEN
    EXECUTE $stmt$CREATE TABLE "assumptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thesis_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"text" text NOT NULL,
	"category" text NOT NULL,
	"evidence_for" jsonb NOT NULL,
	"evidence_against" jsonb NOT NULL,
	"status" text NOT NULL,
	"fragility" integer NOT NULL
);$stmt$;
    EXECUTE $stmt$CREATE TABLE "qwen_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thesis_id" uuid,
	"input_hash" text,
	"model" text NOT NULL,
	"status" text NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"reasoning_tokens" integer,
	"total_tokens" integer,
	"latency_ms" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" ADD COLUMN "verdict" text;$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" ADD COLUMN "fragility" integer;$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" ADD COLUMN "weakest_assumption" text;$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" ADD COLUMN "what_must_be_true" jsonb;$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" ADD COLUMN "summary" text;$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" ADD COLUMN "market_snapshot" jsonb;$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" ADD COLUMN "engine" text;$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" ADD COLUMN "model" text;$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" ADD COLUMN "input_hash" text;$stmt$;
    EXECUTE $stmt$ALTER TABLE "assumptions" ADD CONSTRAINT "assumptions_thesis_id_theses_id_fk" FOREIGN KEY ("thesis_id") REFERENCES "public"."theses"("id") ON DELETE cascade ON UPDATE no action;$stmt$;
    EXECUTE $stmt$ALTER TABLE "qwen_calls" ADD CONSTRAINT "qwen_calls_thesis_id_theses_id_fk" FOREIGN KEY ("thesis_id") REFERENCES "public"."theses"("id") ON DELETE set null ON UPDATE no action;$stmt$;
    EXECUTE $stmt$CREATE INDEX "assumptions_thesis_id_idx" ON "assumptions" USING btree ("thesis_id");$stmt$;
    EXECUTE $stmt$CREATE INDEX "qwen_calls_created_at_idx" ON "qwen_calls" USING btree ("created_at");$stmt$;
    EXECUTE $stmt$CREATE INDEX "theses_input_hash_idx" ON "theses" USING btree ("input_hash");$stmt$;
    EXECUTE $stmt$CREATE INDEX "theses_created_at_idx" ON "theses" USING btree ("created_at");$stmt$;
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('367ba74e05cda38e765415502b4016321e0503f815741303e332a059babf8da1', 1790256898986);
    RAISE NOTICE 'applied 0002_phase1_stress_test';
  ELSE
    RAISE NOTICE 'already applied: 0002_phase1_stress_test';
  END IF;
END
$mig$;

-- 0003_users_and_auth
DO $mig$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1794326781417) THEN
    EXECUTE $stmt$CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);$stmt$;
    EXECUTE $stmt$CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);$stmt$;
    EXECUTE $stmt$CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" text NOT NULL,
	"email" text,
	"name" text,
	"email_verified" timestamp with time zone,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"visit_count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "users_visitor_id_unique" UNIQUE("visitor_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);$stmt$;
    EXECUTE $stmt$CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);$stmt$;
    EXECUTE $stmt$ALTER TABLE "qwen_calls" ADD COLUMN "user_id" uuid;$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" ADD COLUMN "user_id" uuid;$stmt$;
    EXECUTE $stmt$ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;$stmt$;
    EXECUTE $stmt$ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;$stmt$;
    EXECUTE $stmt$CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");$stmt$;
    EXECUTE $stmt$CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");$stmt$;
    EXECUTE $stmt$CREATE INDEX "users_last_seen_at_idx" ON "users" USING btree ("last_seen_at");$stmt$;
    EXECUTE $stmt$ALTER TABLE "qwen_calls" ADD CONSTRAINT "qwen_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;$stmt$;
    EXECUTE $stmt$ALTER TABLE "theses" ADD CONSTRAINT "theses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;$stmt$;
    EXECUTE $stmt$CREATE INDEX "theses_user_id_created_at_idx" ON "theses" USING btree ("user_id","created_at");$stmt$;
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('98ae07e538e22507a2250370b037f2125690c2c2b02140be9abc7220c5c889fb', 1794326781417);
    RAISE NOTICE 'applied 0003_users_and_auth';
  ELSE
    RAISE NOTICE 'already applied: 0003_users_and_auth';
  END IF;
END
$mig$;

-- 0004_referrals_and_community
DO $mig$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1794422360308) THEN
    EXECUTE $stmt$ALTER TABLE "users" ADD COLUMN "display_name" varchar(30);$stmt$;
    EXECUTE $stmt$ALTER TABLE "users" ADD COLUMN "show_on_wall" boolean DEFAULT false NOT NULL;$stmt$;
    EXECUTE $stmt$ALTER TABLE "users" ADD COLUMN "referral_code" text;$stmt$;
    EXECUTE $stmt$ALTER TABLE "users" ADD COLUMN "referred_by_user_id" uuid;$stmt$;
    EXECUTE $stmt$ALTER TABLE "users" ADD COLUMN "is_internal" boolean DEFAULT false NOT NULL;$stmt$;
    EXECUTE $stmt$ALTER TABLE "users" ADD COLUMN "joined_at" timestamp with time zone;$stmt$;
    EXECUTE $stmt$ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_user_id_users_id_fk" FOREIGN KEY ("referred_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;$stmt$;
    EXECUTE $stmt$CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");$stmt$;
    EXECUTE $stmt$CREATE INDEX "users_joined_at_idx" ON "users" USING btree ("joined_at");$stmt$;
    EXECUTE $stmt$CREATE INDEX "users_referred_by_user_id_idx" ON "users" USING btree ("referred_by_user_id");$stmt$;
    EXECUTE $stmt$ALTER TABLE "users" ADD CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code");$stmt$;
    EXECUTE $stmt$-- Backfill for accounts that signed in before this migration: their join date
-- (best available: first visit) and a 7-character invite code drawn from an
-- alphabet without look-alikes (no 0/O/1/I/L). The inner WHERE references the
-- outer row so a fresh code is generated per user.
UPDATE "users" SET "joined_at" = "created_at" WHERE "email" IS NOT NULL AND "joined_at" IS NULL;$stmt$;
    EXECUTE $stmt$UPDATE "users" SET "referral_code" = (
	SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
	FROM generate_series(1, 7)
	WHERE "users"."id" IS NOT NULL
) WHERE "email" IS NOT NULL AND "referral_code" IS NULL;$stmt$;
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('7564b3a07dadf834a9051826455e300a706bc17aca0aa1e08f91cd776e2f7d33', 1794422360308);
    RAISE NOTICE 'applied 0004_referrals_and_community';
  ELSE
    RAISE NOTICE 'already applied: 0004_referrals_and_community';
  END IF;
END
$mig$;

COMMIT;

-- Check: the newest row should have created_at 1794422360308 (migration 0004).
SELECT id, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 3;
