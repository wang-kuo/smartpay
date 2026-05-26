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
