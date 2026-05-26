import { z } from "zod";

export const appModeSchema = z.enum(["debug", "release"]);
export const decisionSchema = z.enum(["allow", "ask", "deny"]);
export const fitCheckSchema = z.enum(["pass", "caution", "fail"]);
export const demoDecisionFlowVariantSchema = z
  .enum(["allow", "ask", "deny", "missing_fit_check"])
  .default("allow");
export const categorySchema = z.enum([
  "Daily",
  "Travel",
  "Health",
  "Learning",
  "Lifestyle",
  "Financial"
]);

export const traceEnvelopeSchema = z.object({
  traceId: z.string().min(1)
});

export const errorResponseSchema = traceEnvelopeSchema.extend({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.array(z.string()).optional()
  })
});

export const moneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().min(3).max(3)
});

export const userBehaviorProfileSchema = z.object({
  userId: z.string().min(1),
  profileTags: z.array(z.string()),
  avatarState: z.object({
    mood: z.string(),
    message: z.string()
  }),
  dimensions: z.record(z.string(), z.string())
});

export const financialGoalContextSchema = z.object({
  monthlyBudget: z.number().nonnegative(),
  availableTravelBudget: z.number().nonnegative(),
  longTermSavingsGoal: z.object({
    name: z.string(),
    targetAmount: z.number().nonnegative(),
    currentAmount: z.number().nonnegative()
  }),
  goalImpact: z.string()
});

export const consumptionHistoryItemSchema = z.object({
  historyId: z.string().min(1),
  category: categorySchema,
  merchantName: z.string().min(1),
  amount: z.number().nonnegative(),
  currency: z.string().min(3).max(3),
  decision: decisionSchema,
  createdAt: z.string().datetime(),
  signals: z.array(z.string())
});

export const authorizationPolicySchema = z.object({
  authorizationId: z.string().min(1),
  type: z.enum(["standing", "temporary"]),
  category: categorySchema,
  maxSingleAmount: z.number().nonnegative(),
  maxTotalAmount: z.number().nonnegative(),
  autoExecutionMaxAmount: z.number().nonnegative(),
  currency: z.string().min(3).max(3),
  validUntil: z.string().date(),
  executionFrequency: z.object({
    maxCount: z.number().int().positive(),
    usedCount: z.number().int().nonnegative(),
    window: z.string()
  }),
  executionMode: z.enum(["manual_only", "auto_under_threshold", "manual_or_auto_by_amount"])
});

export const ruleCheckSchema = z.object({
  code: z.enum([
    "authorization_exists",
    "authorization_active",
    "category_allowed",
    "currency_allowed",
    "single_amount_limit",
    "total_amount_limit",
    "frequency_limit",
    "valid_time_window",
    "execution_mode_allowed"
  ]),
  passed: z.boolean(),
  message: z.string()
});

export const authorizationEvaluationSchema = z.object({
  passed: z.boolean(),
  reasons: z.array(z.string()),
  checks: z.array(ruleCheckSchema)
});

export const consumptionRequestSchema = z.object({
  requestId: z.string().min(1),
  userId: z.string().min(1),
  agentId: z.string().min(1),
  category: categorySchema,
  purpose: z.string().min(1),
  amount: z.number().nonnegative(),
  currency: z.string().min(3).max(3)
});

export const quoteResultSchema = z.object({
  officialQuote: z.object({
    quoteId: z.string(),
    source: z.literal("mock_merchant_mcp"),
    merchantName: z.string(),
    amount: z.number().nonnegative(),
    currency: z.string().min(3).max(3),
    isExecutable: z.boolean()
  }),
  marketIntelligence: z.object({
    source: z.literal("mock_consumer_agent_network"),
    marketAverage: z.number().nonnegative(),
    priceRange: z.object({
      low: z.number().nonnegative(),
      high: z.number().nonnegative()
    }),
    signal: z.string()
  })
});

export const mockServicePayloadsSchema = z.object({
  merchant: z.object({
    traceId: z.string().min(1),
    quoteId: z.string().min(1),
    merchantName: z.string().min(1),
    amount: z.number().nonnegative(),
    currency: z.string().min(3).max(3),
    isExecutable: z.boolean()
  }),
  consumerAgentNetwork: z.object({
    traceId: z.string().min(1),
    marketAverage: z.number().nonnegative(),
    priceRange: z.object({
      low: z.number().nonnegative(),
      high: z.number().nonnegative()
    }),
    signal: z.string().min(1)
  }),
  wallet: z.object({
    traceId: z.string().min(1),
    simulated: z.literal(true),
    paymentStatus: z.enum(["not_started", "simulated_paid", "blocked"]),
    walletPaymentId: z.string().nullable()
  })
});

export const aiFitCheckResultSchema = z.object({
  fitCheck: fitCheckSchema,
  softRisks: z.array(z.string()),
  explanation: z.string()
});

export const demoUserIntentAnalysisSchema = z.object({
  intent: z.literal("japan_trip"),
  normalizedRequest: z.string().min(1),
  category: categorySchema,
  travelWindow: z.string().nullable(),
  budget: moneySchema.nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  userFacingSummary: z.string().min(1),
  fitCheck: aiFitCheckResultSchema
});

export const interactiveDecisionLlmStatusSchema = z.object({
  provider: z.enum(["deepseek", "deterministic_fallback"]),
  model: z.string(),
  usedDeepSeek: z.boolean(),
  fallbackReason: z.string().optional()
});

export const decisionResultSchema = z.object({
  decision: decisionSchema,
  reason: z.string(),
  requiresUserApproval: z.boolean(),
  nextAction: z.enum(["execute_order", "request_user_approval", "do_not_execute"])
});

export const executionResultSchema = z.object({
  executionId: z.string(),
  orderStatus: z.enum(["not_started", "pending_user_approval", "confirmed", "blocked"]),
  paymentStatus: z.enum(["not_started", "simulated_paid", "blocked"]),
  merchantOrderId: z.string().nullable(),
  walletPaymentId: z.string().nullable()
});

export const feedbackRecordSchema = z.object({
  feedbackId: z.string(),
  executionId: z.string(),
  userFeedback: z.string(),
  contextSignals: z.array(z.string())
});

export const eventLogRecordSchema = z.object({
  eventId: z.string(),
  traceId: z.string(),
  userId: z.string(),
  requestId: z.string().nullable(),
  authorizationId: z.string().nullable(),
  type: z.string(),
  message: z.string(),
  payload: z.record(z.string(), z.unknown()),
  redacted: z.boolean(),
  createdAt: z.string()
});

export const demoDecisionFlowRequestSchema = z.object({
  userId: z.string().default("user_001"),
  scenario: z.literal("japan_trip").default("japan_trip"),
  variant: demoDecisionFlowVariantSchema,
  request: z.string().min(1).default("Plan and book a Japan trip for 5-7 days within S$2000-2500.")
});

export const demoScenarioSchema = z.object({
  now: z.string().datetime(),
  profile: userBehaviorProfileSchema,
  goalContext: financialGoalContextSchema,
  consumptionHistory: z.array(consumptionHistoryItemSchema).default([]),
  authorization: authorizationPolicySchema,
  consumptionRequest: consumptionRequestSchema,
  quotes: quoteResultSchema,
  fitCheck: aiFitCheckResultSchema,
  execution: executionResultSchema,
  feedback: feedbackRecordSchema,
  variants: z
    .object({
      askFitCheck: aiFitCheckResultSchema,
      denyRequest: consumptionRequestSchema
    })
    .optional()
});

export const demoDecisionFlowResponseSchema = traceEnvelopeSchema.extend({
  profile: userBehaviorProfileSchema,
  goalContext: financialGoalContextSchema,
  consumptionHistory: z.array(consumptionHistoryItemSchema).optional(),
  authorization: authorizationPolicySchema,
  request: consumptionRequestSchema,
  quotes: quoteResultSchema,
  fitCheck: aiFitCheckResultSchema,
  decision: decisionResultSchema,
  execution: executionResultSchema,
  feedbackPrompt: feedbackRecordSchema,
  events: z.array(eventLogRecordSchema),
  debug: z
    .object({
      hardRulesPassed: z.boolean(),
      hardRuleReasons: z.array(z.string()),
      mode: appModeSchema,
      ruleEvaluation: authorizationEvaluationSchema,
      mockServices: mockServicePayloadsSchema
    })
    .optional()
});

export const demoInteractiveDecisionRequestSchema = z.object({
  email: z.string().email(),
  message: z.string().min(3).max(1000),
  scenario: z.literal("japan_trip").default("japan_trip"),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(1000)
      })
    )
    .max(12)
    .default([])
});

export const demoAuthSessionRequestSchema = z.object({
  email: z.string().email(),
  verificationCode: z.string().min(6).max(12),
  username: z.string().min(1).max(80).optional()
});

export const demoAuthRoleSchema = z.enum(["user", "admin"]);
export const demoUserStatusSchema = z.enum(["invited", "active"]);

export const demoUserRecordSchema = z.object({
  email: z.string().email(),
  username: z.string().min(1),
  role: demoAuthRoleSchema,
  status: demoUserStatusSchema,
  inviteCode: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().nullable()
});

export const demoAuthSessionResponseSchema = traceEnvelopeSchema.extend({
  session: z.object({
    email: z.string().email(),
    username: z.string().min(1),
    role: demoAuthRoleSchema,
    adminToken: z.string().optional()
  })
});

export const demoInviteRequestSchema = z.object({
  email: z.string().email()
});

export const demoInviteResponseSchema = traceEnvelopeSchema.extend({
  user: demoUserRecordSchema,
  deliveryStatus: z.enum(["sent"])
});

export const demoEmailCodeRequestSchema = z.object({
  email: z.string().email(),
  inviteCode: z.string().min(4).max(32).optional()
});

export const demoEmailCodeResponseSchema = traceEnvelopeSchema.extend({
  email: z.string().email(),
  expiresAt: z.string().datetime(),
  deliveryStatus: z.enum(["sent"])
});

export const demoAdminUsersResponseSchema = traceEnvelopeSchema.extend({
  users: z.array(demoUserRecordSchema)
});

export const demoSystemLogLevelSchema = z.enum(["info", "warn", "error"]);
export const demoSystemLogRecordSchema = z.object({
  logId: z.string().min(1),
  traceId: z.string().min(1),
  level: demoSystemLogLevelSchema,
  source: z.string().min(1),
  message: z.string().min(1),
  userEmail: z.string().email().nullable(),
  payload: z.record(z.string(), z.unknown()),
  redacted: z.boolean(),
  createdAt: z.string().datetime()
});

export const demoAdminLogsResponseSchema = traceEnvelopeSchema.extend({
  logs: z.array(demoSystemLogRecordSchema)
});

export const demoInteractiveDecisionResponseSchema = demoDecisionFlowResponseSchema.extend({
  interaction: z.object({
    email: z.string().email(),
    message: z.string(),
    summary: z.string().min(1),
    analysis: demoUserIntentAnalysisSchema.optional(),
    llm: interactiveDecisionLlmStatusSchema.optional()
  })
});

export type AppMode = z.infer<typeof appModeSchema>;
export type ConsumptionDecision = z.infer<typeof decisionSchema>;
export type AIFitCheck = z.infer<typeof fitCheckSchema>;
export type DemoDecisionFlowVariant = z.infer<typeof demoDecisionFlowVariantSchema>;
export type ConsumptionCategory = z.infer<typeof categorySchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type UserBehaviorProfile = z.infer<typeof userBehaviorProfileSchema>;
export type FinancialGoalContext = z.infer<typeof financialGoalContextSchema>;
export type ConsumptionHistoryItem = z.infer<typeof consumptionHistoryItemSchema>;
export type AuthorizationPolicy = z.infer<typeof authorizationPolicySchema>;
export type RuleCheck = z.infer<typeof ruleCheckSchema>;
export type AuthorizationEvaluation = z.infer<typeof authorizationEvaluationSchema>;
export type ConsumptionRequest = z.infer<typeof consumptionRequestSchema>;
export type QuoteResult = z.infer<typeof quoteResultSchema>;
export type MockServicePayloads = z.infer<typeof mockServicePayloadsSchema>;
export type AIFitCheckResult = z.infer<typeof aiFitCheckResultSchema>;
export type DemoUserIntentAnalysis = z.infer<typeof demoUserIntentAnalysisSchema>;
export type InteractiveDecisionLlmStatus = z.infer<typeof interactiveDecisionLlmStatusSchema>;
export type DecisionResult = z.infer<typeof decisionResultSchema>;
export type ExecutionResult = z.infer<typeof executionResultSchema>;
export type FeedbackRecord = z.infer<typeof feedbackRecordSchema>;
export type EventLogRecord = z.infer<typeof eventLogRecordSchema>;
export type DemoScenario = z.infer<typeof demoScenarioSchema>;
export type DemoDecisionFlowRequest = z.infer<typeof demoDecisionFlowRequestSchema>;
export type DemoDecisionFlowResponse = z.infer<typeof demoDecisionFlowResponseSchema>;
export type DemoAuthRole = z.infer<typeof demoAuthRoleSchema>;
export type DemoAuthSessionRequest = z.infer<typeof demoAuthSessionRequestSchema>;
export type DemoAuthSessionResponse = z.infer<typeof demoAuthSessionResponseSchema>;
export type DemoUserRecord = z.infer<typeof demoUserRecordSchema>;
export type DemoInviteRequest = z.infer<typeof demoInviteRequestSchema>;
export type DemoInviteResponse = z.infer<typeof demoInviteResponseSchema>;
export type DemoEmailCodeRequest = z.infer<typeof demoEmailCodeRequestSchema>;
export type DemoEmailCodeResponse = z.infer<typeof demoEmailCodeResponseSchema>;
export type DemoAdminUsersResponse = z.infer<typeof demoAdminUsersResponseSchema>;
export type DemoSystemLogRecord = z.infer<typeof demoSystemLogRecordSchema>;
export type DemoAdminLogsResponse = z.infer<typeof demoAdminLogsResponseSchema>;
export type DemoInteractiveDecisionRequest = z.infer<typeof demoInteractiveDecisionRequestSchema>;
export type DemoInteractiveDecisionResponse = z.infer<typeof demoInteractiveDecisionResponseSchema>;
export type DemoDecisionFlowErrorResponse = z.infer<typeof errorResponseSchema>;
