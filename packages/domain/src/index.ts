export type {
  AIFitCheck,
  AIFitCheckResult,
  AppMode,
  AuthorizationPolicy,
  ConsumptionCategory,
  ConsumptionDecision,
  ConsumptionRequest,
  DecisionResult,
  DemoDecisionFlowResponse,
  DemoScenario,
  EventLogRecord,
  ExecutionResult,
  FeedbackRecord,
  FinancialGoalContext,
  QuoteResult,
  UserBehaviorProfile
} from "@smartpay/contracts";

export const PRODUCT_FLOW = ["authorization", "decision", "execution"] as const;
export const FINAL_DECISIONS = ["allow", "ask", "deny"] as const;
export const FIT_CHECK_RESULTS = ["pass", "caution", "fail"] as const;
export const DEMO_EVENT_TYPES = [
  "profile.generated",
  "goal.loaded",
  "authorization.checked",
  "official_quote.received",
  "market_intelligence.received",
  "ai_fit_check.completed",
  "decision.made",
  "order.created",
  "payment.simulated",
  "feedback.received",
  "context.updated"
] as const;
