-- ThesisBreaker: bring a production database up to migration 0004 without a terminal.
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

-- Check: should list 0004 as the newest migration.
SELECT id, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 3;
