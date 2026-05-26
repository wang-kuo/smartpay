import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

export const decisionEnum = pgEnum("decision", ["allow", "ask", "deny"]);
export const fitCheckEnum = pgEnum("fit_check", ["pass", "caution", "fail"]);
export const categoryEnum = pgEnum("consumption_category", [
  "Daily",
  "Travel",
  "Health",
  "Learning",
  "Lifestyle",
  "Financial"
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  profile: jsonb("profile").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const authorizations = pgTable(
  "authorizations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    category: categoryEnum("category").notNull(),
    maxSingleAmount: numeric("max_single_amount").notNull(),
    maxTotalAmount: numeric("max_total_amount").notNull(),
    autoExecutionMaxAmount: numeric("auto_execution_max_amount").notNull(),
    currency: text("currency").notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
    maxExecutionCount: integer("max_execution_count").notNull(),
    usedExecutionCount: integer("used_execution_count").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("authorizations_user_id_idx").on(table.userId),
    index("authorizations_category_idx").on(table.category),
    index("authorizations_valid_until_idx").on(table.validUntil)
  ]
);

export const consumptionRequests = pgTable(
  "consumption_requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    authorizationId: text("authorization_id"),
    traceId: text("trace_id").notNull(),
    category: categoryEnum("category").notNull(),
    purpose: text("purpose").notNull(),
    amount: numeric("amount").notNull(),
    currency: text("currency").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("consumption_requests_user_id_idx").on(table.userId),
    index("consumption_requests_authorization_id_idx").on(table.authorizationId),
    index("consumption_requests_trace_id_idx").on(table.traceId),
    index("consumption_requests_created_at_idx").on(table.createdAt)
  ]
);

export const decisions = pgTable(
  "decisions",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull(),
    userId: text("user_id").notNull(),
    traceId: text("trace_id").notNull(),
    decision: decisionEnum("decision").notNull(),
    fitCheck: fitCheckEnum("fit_check").notNull(),
    requiresUserApproval: boolean("requires_user_approval").notNull(),
    reason: text("reason").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("decisions_request_id_idx").on(table.requestId),
    index("decisions_user_id_idx").on(table.userId),
    index("decisions_trace_id_idx").on(table.traceId),
    index("decisions_created_at_idx").on(table.createdAt)
  ]
);

export const executions = pgTable(
  "executions",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull(),
    userId: text("user_id").notNull(),
    traceId: text("trace_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    orderStatus: text("order_status").notNull(),
    paymentStatus: text("payment_status").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("executions_request_id_idx").on(table.requestId),
    index("executions_user_id_idx").on(table.userId),
    index("executions_trace_id_idx").on(table.traceId),
    uniqueIndex("executions_idempotency_key_idx").on(table.idempotencyKey),
    index("executions_created_at_idx").on(table.createdAt)
  ]
);

export const eventLog = pgTable(
  "event_log",
  {
    id: text("id").primaryKey(),
    traceId: text("trace_id").notNull(),
    userId: text("user_id").notNull(),
    requestId: text("request_id"),
    authorizationId: text("authorization_id"),
    type: text("type").notNull(),
    message: text("message").notNull(),
    payload: jsonb("payload").notNull(),
    redacted: boolean("redacted").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("event_log_trace_id_idx").on(table.traceId),
    index("event_log_user_id_idx").on(table.userId),
    index("event_log_request_id_idx").on(table.requestId),
    index("event_log_authorization_id_idx").on(table.authorizationId),
    index("event_log_created_at_idx").on(table.createdAt)
  ]
);
