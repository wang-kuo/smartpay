import type {
  AIFitCheckResult,
  AuthorizationPolicy,
  ConsumptionRequest,
  DecisionResult,
  DemoDecisionFlowResponse,
  DemoScenario,
  EventLogRecord,
  ExecutionResult
} from "@smartpay/contracts";
import type { AppMode } from "@smartpay/contracts";

export type AuthorizationEvaluation = {
  passed: boolean;
  reasons: string[];
};

export function evaluateAuthorization(
  authorization: AuthorizationPolicy,
  request: ConsumptionRequest,
  now: Date
): AuthorizationEvaluation {
  const reasons: string[] = [];

  if (authorization.category !== request.category) {
    reasons.push(`category ${request.category} is outside ${authorization.category} authorization`);
  }

  if (authorization.currency !== request.currency) {
    reasons.push(`currency ${request.currency} does not match authorization currency`);
  }

  if (request.amount > authorization.maxSingleAmount) {
    reasons.push(`amount ${request.amount} exceeds max single amount ${authorization.maxSingleAmount}`);
  }

  if (request.amount > authorization.maxTotalAmount) {
    reasons.push(`amount ${request.amount} exceeds max total amount ${authorization.maxTotalAmount}`);
  }

  if (authorization.executionFrequency.usedCount >= authorization.executionFrequency.maxCount) {
    reasons.push("execution frequency limit has been reached");
  }

  const validUntil = new Date(`${authorization.validUntil}T23:59:59.999Z`);
  if (now.getTime() > validUntil.getTime()) {
    reasons.push(`authorization expired at ${authorization.validUntil}`);
  }

  return {
    passed: reasons.length === 0,
    reasons
  };
}

export function composeDecision(
  evaluation: AuthorizationEvaluation,
  authorization: AuthorizationPolicy,
  request: ConsumptionRequest,
  fitCheck: AIFitCheckResult | null
): DecisionResult {
  if (!evaluation.passed) {
    return {
      decision: "deny",
      reason: `Hard rules failed: ${evaluation.reasons.join("; ")}`,
      requiresUserApproval: false,
      nextAction: "do_not_execute"
    };
  }

  if (!fitCheck) {
    return {
      decision: "ask",
      reason: "AI fit check was unavailable, so the system failed closed to user approval.",
      requiresUserApproval: true,
      nextAction: "request_user_approval"
    };
  }

  if (fitCheck.fitCheck === "fail") {
    return {
      decision: "deny",
      reason: `AI fit check failed after hard rules passed: ${fitCheck.explanation}`,
      requiresUserApproval: false,
      nextAction: "do_not_execute"
    };
  }

  if (fitCheck.fitCheck === "caution") {
    return {
      decision: "ask",
      reason: `AI fit check requires confirmation: ${fitCheck.explanation}`,
      requiresUserApproval: true,
      nextAction: "request_user_approval"
    };
  }

  if (
    request.amount <= authorization.autoExecutionMaxAmount &&
    authorization.executionMode !== "manual_only"
  ) {
    return {
      decision: "allow",
      reason: "Hard rules passed, AI fit check passed, and amount is under auto-execution limit.",
      requiresUserApproval: false,
      nextAction: "execute_order"
    };
  }

  return {
    decision: "ask",
    reason: "Hard rules and AI fit check passed, but amount requires user approval.",
    requiresUserApproval: true,
    nextAction: "request_user_approval"
  };
}

export function buildExecutionResult(
  scenarioExecution: ExecutionResult,
  decision: DecisionResult
): ExecutionResult {
  if (decision.decision === "allow") {
    return scenarioExecution;
  }

  if (decision.decision === "ask") {
    return {
      executionId: scenarioExecution.executionId,
      orderStatus: "pending_user_approval",
      paymentStatus: "not_started",
      merchantOrderId: null,
      walletPaymentId: null
    };
  }

  return {
    executionId: scenarioExecution.executionId,
    orderStatus: "blocked",
    paymentStatus: "blocked",
    merchantOrderId: null,
    walletPaymentId: null
  };
}

export function buildDemoDecisionFlow(
  scenario: DemoScenario,
  traceId: string,
  fitCheck: AIFitCheckResult | null = scenario.fitCheck,
  mode: AppMode = "debug"
): DemoDecisionFlowResponse {
  const now = new Date(scenario.now);
  const evaluation = evaluateAuthorization(scenario.authorization, scenario.consumptionRequest, now);
  const decision = composeDecision(
    evaluation,
    scenario.authorization,
    scenario.consumptionRequest,
    fitCheck
  );
  const execution = buildExecutionResult(scenario.execution, decision);
  const createdAt = now.toISOString();
  const eventTypes = [
    "profile.generated",
    "goal.context.loaded",
    "authorization.checked",
    "official_quote.received",
    "market_intelligence.received",
    "ai_fit_check.completed",
    "decision.made",
    "order.simulated",
    "payment.simulated",
    "feedback.prompted"
  ];
  const events: EventLogRecord[] = eventTypes.map((type, index) => ({
    eventId: `evt_${String(index + 1).padStart(3, "0")}`,
    traceId,
    type,
    message: type.replaceAll(".", " "),
    createdAt
  }));

  return {
    traceId,
    profile: scenario.profile,
    goalContext: scenario.goalContext,
    authorization: scenario.authorization,
    request: scenario.consumptionRequest,
    quotes: scenario.quotes,
    fitCheck:
      fitCheck ??
      ({
        fitCheck: "caution",
        softRisks: ["AI fit check was unavailable."],
        explanation: "The system requires user confirmation when AI context is missing."
      } satisfies AIFitCheckResult),
    decision,
    execution,
    feedbackPrompt: scenario.feedback,
    events,
    debug: {
      hardRulesPassed: evaluation.passed,
      hardRuleReasons: evaluation.reasons,
      mode
    }
  };
}
