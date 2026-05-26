CREATE TYPE "public"."consumption_category" AS ENUM('Daily', 'Travel', 'Health', 'Learning', 'Lifestyle', 'Financial');--> statement-breakpoint
CREATE TYPE "public"."decision" AS ENUM('allow', 'ask', 'deny');--> statement-breakpoint
CREATE TYPE "public"."fit_check" AS ENUM('pass', 'caution', 'fail');--> statement-breakpoint
CREATE TABLE "authorizations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"category" "consumption_category" NOT NULL,
	"max_single_amount" numeric NOT NULL,
	"max_total_amount" numeric NOT NULL,
	"auto_execution_max_amount" numeric NOT NULL,
	"currency" text NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"max_execution_count" integer NOT NULL,
	"used_execution_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consumption_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"authorization_id" text,
	"trace_id" text NOT NULL,
	"category" "consumption_category" NOT NULL,
	"purpose" text NOT NULL,
	"amount" numeric NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"user_id" text NOT NULL,
	"trace_id" text NOT NULL,
	"decision" "decision" NOT NULL,
	"fit_check" "fit_check" NOT NULL,
	"requires_user_approval" boolean NOT NULL,
	"reason" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_log" (
	"id" text PRIMARY KEY NOT NULL,
	"trace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"request_id" text,
	"authorization_id" text,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"payload" jsonb NOT NULL,
	"redacted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executions" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"user_id" text NOT NULL,
	"trace_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"order_status" text NOT NULL,
	"payment_status" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"profile" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "authorizations_user_id_idx" ON "authorizations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "authorizations_category_idx" ON "authorizations" USING btree ("category");--> statement-breakpoint
CREATE INDEX "authorizations_valid_until_idx" ON "authorizations" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX "consumption_requests_user_id_idx" ON "consumption_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "consumption_requests_authorization_id_idx" ON "consumption_requests" USING btree ("authorization_id");--> statement-breakpoint
CREATE INDEX "consumption_requests_trace_id_idx" ON "consumption_requests" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "consumption_requests_created_at_idx" ON "consumption_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "decisions_request_id_idx" ON "decisions" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "decisions_user_id_idx" ON "decisions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "decisions_trace_id_idx" ON "decisions" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "decisions_created_at_idx" ON "decisions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "event_log_trace_id_idx" ON "event_log" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "event_log_user_id_idx" ON "event_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_log_request_id_idx" ON "event_log" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "event_log_authorization_id_idx" ON "event_log" USING btree ("authorization_id");--> statement-breakpoint
CREATE INDEX "event_log_created_at_idx" ON "event_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "executions_request_id_idx" ON "executions" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "executions_user_id_idx" ON "executions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "executions_trace_id_idx" ON "executions" USING btree ("trace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "executions_idempotency_key_idx" ON "executions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "executions_created_at_idx" ON "executions" USING btree ("created_at");