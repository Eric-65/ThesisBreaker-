CREATE TABLE "assumptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thesis_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"text" text NOT NULL,
	"category" text NOT NULL,
	"evidence_for" jsonb NOT NULL,
	"evidence_against" jsonb NOT NULL,
	"status" text NOT NULL,
	"fragility" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qwen_calls" (
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
);
--> statement-breakpoint
ALTER TABLE "theses" ADD COLUMN "verdict" text;--> statement-breakpoint
ALTER TABLE "theses" ADD COLUMN "fragility" integer;--> statement-breakpoint
ALTER TABLE "theses" ADD COLUMN "weakest_assumption" text;--> statement-breakpoint
ALTER TABLE "theses" ADD COLUMN "what_must_be_true" jsonb;--> statement-breakpoint
ALTER TABLE "theses" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "theses" ADD COLUMN "market_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "theses" ADD COLUMN "engine" text;--> statement-breakpoint
ALTER TABLE "theses" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "theses" ADD COLUMN "input_hash" text;--> statement-breakpoint
ALTER TABLE "assumptions" ADD CONSTRAINT "assumptions_thesis_id_theses_id_fk" FOREIGN KEY ("thesis_id") REFERENCES "public"."theses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qwen_calls" ADD CONSTRAINT "qwen_calls_thesis_id_theses_id_fk" FOREIGN KEY ("thesis_id") REFERENCES "public"."theses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assumptions_thesis_id_idx" ON "assumptions" USING btree ("thesis_id");--> statement-breakpoint
CREATE INDEX "qwen_calls_created_at_idx" ON "qwen_calls" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "theses_input_hash_idx" ON "theses" USING btree ("input_hash");--> statement-breakpoint
CREATE INDEX "theses_created_at_idx" ON "theses" USING btree ("created_at");