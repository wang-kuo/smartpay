ALTER TABLE "users" DROP CONSTRAINT "users_pkey";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text;--> statement-breakpoint
UPDATE "users" SET "email" = 'unknown@example.com' WHERE "email" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("email");--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" text DEFAULT 'demo-user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" text DEFAULT 'invited' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "profile" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE "system_log" (
	"id" text PRIMARY KEY NOT NULL,
	"trace_id" text NOT NULL,
	"level" text NOT NULL,
	"source" text NOT NULL,
	"message" text NOT NULL,
	"user_email" text,
	"payload" jsonb NOT NULL,
	"redacted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "system_log_trace_id_idx" ON "system_log" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "system_log_level_idx" ON "system_log" USING btree ("level");--> statement-breakpoint
CREATE INDEX "system_log_source_idx" ON "system_log" USING btree ("source");--> statement-breakpoint
CREATE INDEX "system_log_user_email_idx" ON "system_log" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "system_log_created_at_idx" ON "system_log" USING btree ("created_at");
