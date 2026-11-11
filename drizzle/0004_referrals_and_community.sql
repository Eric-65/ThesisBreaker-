ALTER TABLE "users" ADD COLUMN "display_name" varchar(30);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "show_on_wall" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referral_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referred_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_internal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "joined_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_user_id_users_id_fk" FOREIGN KEY ("referred_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_joined_at_idx" ON "users" USING btree ("joined_at");--> statement-breakpoint
CREATE INDEX "users_referred_by_user_id_idx" ON "users" USING btree ("referred_by_user_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code");--> statement-breakpoint
-- Backfill for accounts that signed in before this migration: their join date
-- (best available: first visit) and a 7-character invite code drawn from an
-- alphabet without look-alikes (no 0/O/1/I/L). The inner WHERE references the
-- outer row so a fresh code is generated per user.
UPDATE "users" SET "joined_at" = "created_at" WHERE "email" IS NOT NULL AND "joined_at" IS NULL;--> statement-breakpoint
UPDATE "users" SET "referral_code" = (
	SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
	FROM generate_series(1, 7)
	WHERE "users"."id" IS NOT NULL
) WHERE "email" IS NOT NULL AND "referral_code" IS NULL;
