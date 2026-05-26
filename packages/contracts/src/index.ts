import { z } from "zod";

export const appModeSchema = z.enum(["debug", "release"]);
export const decisionSchema = z.enum(["allow", "ask", "deny"]);
export const fitCheckSchema = z.enum(["pass", "caution", "fail"]);
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
  type: z.string(),
  message: z.string(),
  createdAt: z.string()
});

export const demoDecisionFlowRequestSchema = z.object({
  userId: z.string().default("user_001"),
  scenario: z.literal("japan_trip").default("japan_trip"),
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
  feedback: feedbackRecordSchema
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
      mode: appModeSchema
    })
    .optional()
});

export type AppMode = z.infer<typeof appModeSchema>;
export type ConsumptionDecision = z.infer<typeof decisionSchema>;
export type AIFitCheck = z.infer<typeof fitCheckSchema>;
export type ConsumptionCategory = z.infer<typeof categorySchema>;
export type UserBehaviorProfile = z.infer<typeof userBehaviorProfileSchema>;
export type FinancialGoalContext = z.infer<typeof financialGoalContextSchema>;
export type AuthorizationPolicy = z.infer<typeof authorizationPolicySchema>;
export type ConsumptionRequest = z.infer<typeof consumptionRequestSchema>;
export type QuoteResult = z.infer<typeof quoteResultSchema>;
export type AIFitCheckResult = z.infer<typeof aiFitCheckResultSchema>;
export type DecisionResult = z.infer<typeof decisionResultSchema>;
export type ExecutionResult = z.infer<typeof executionResultSchema>;
export type FeedbackRecord = z.infer<typeof feedbackRecordSchema>;
export type EventLogRecord = z.infer<typeof eventLogRecordSchema>;
export type DemoScenario = z.infer<typeof demoScenarioSchema>;
export type DemoDecisionFlowResponse = z.infer<typeof demoDecisionFlowResponseSchema>;
