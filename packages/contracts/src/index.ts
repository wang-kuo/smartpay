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

export type AppMode = z.infer<typeof appModeSchema>;
export type ConsumptionDecision = z.infer<typeof decisionSchema>;
export type AIFitCheck = z.infer<typeof fitCheckSchema>;
export type DemoDecisionFlowVariant = z.infer<typeof demoDecisionFlowVariantSchema>;
export type ConsumptionCategory = z.infer<typeof categorySchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type UserBehaviorProfile = z.infer<typeof userBehaviorProfileSchema>;
export type FinancialGoalContext = z.infer<typeof financialGoalContextSchema>;
export type AuthorizationPolicy = z.infer<typeof authorizationPolicySchema>;
export type RuleCheck = z.infer<typeof ruleCheckSchema>;
export type AuthorizationEvaluation = z.infer<typeof authorizationEvaluationSchema>;
export type ConsumptionRequest = z.infer<typeof consumptionRequestSchema>;
export type QuoteResult = z.infer<typeof quoteResultSchema>;
export type MockServicePayloads = z.infer<typeof mockServicePayloadsSchema>;
export type AIFitCheckResult = z.infer<typeof aiFitCheckResultSchema>;
export type DecisionResult = z.infer<typeof decisionResultSchema>;
export type ExecutionResult = z.infer<typeof executionResultSchema>;
export type FeedbackRecord = z.infer<typeof feedbackRecordSchema>;
export type EventLogRecord = z.infer<typeof eventLogRecordSchema>;
export type DemoScenario = z.infer<typeof demoScenarioSchema>;
export type DemoDecisionFlowRequest = z.infer<typeof demoDecisionFlowRequestSchema>;
export type DemoDecisionFlowResponse = z.infer<typeof demoDecisionFlowResponseSchema>;
export type DemoDecisionFlowErrorResponse = z.infer<typeof errorResponseSchema>;
