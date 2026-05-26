import type {
  AIFitCheckResult,
  AuthorizationEvaluation,
  AuthorizationPolicy,
  ConsumptionRequest,
  DecisionResult,
  DemoDecisionFlowResponse,
  DemoScenario,
  EventLogRecord,
  ExecutionResult,
  MockServicePayloads,
  RuleCheck
} from "@smartpay/contracts";
import { demoDecisionFlowResponseSchema, type AppMode } from "@smartpay/contracts";
import { DEMO_EVENT_TYPES } from "@smartpay/domain";

function buildCheck(code: RuleCheck["code"], passed: boolean, message: string): RuleCheck {
  return {
    code,
    passed,
    message
  };
}

export function evaluateAuthorization(
  authorization: AuthorizationPolicy | null,
  request: ConsumptionRequest,
  now: Date
): AuthorizationEvaluation {
  const checks: RuleCheck[] = [];

  checks.push(
    buildCheck(
      "authorization_exists",
      authorization !== null,
      authorization ? "Authorization is present." : "No authorization was found for this request."
    )
  );

  if (!authorization) {
    return {
      passed: false,
      reasons: checks.filter((check) => !check.passed).map((check) => check.message),
      checks
    };
  }

  checks.push(buildCheck("authorization_active", true, "Authorization is active for the demo."));

  checks.push(
    buildCheck(
      "category_allowed",
      authorization.category === request.category,
      authorization.category === request.category
        ? `Category ${request.category} is authorized.`
        : `Category ${request.category} is outside ${authorization.category} authorization.`
    )
  );

  checks.push(
    buildCheck(
      "currency_allowed",
      authorization.currency === request.currency,
      authorization.currency === request.currency
        ? `Currency ${request.currency} matches authorization.`
        : `Currency ${request.currency} does not match authorization currency ${authorization.currency}.`
    )
  );

  checks.push(
    buildCheck(
      "single_amount_limit",
      request.amount <= authorization.maxSingleAmount,
      request.amount <= authorization.maxSingleAmount
        ? `Amount ${request.amount} is within the single transaction limit.`
        : `Amount ${request.amount} exceeds max single amount ${authorization.maxSingleAmount}.`
    )
  );

  checks.push(
    buildCheck(
      "total_amount_limit",
      request.amount <= authorization.maxTotalAmount,
      request.amount <= authorization.maxTotalAmount
        ? `Amount ${request.amount} is within the total authorization limit.`
        : `Amount ${request.amount} exceeds max total amount ${authorization.maxTotalAmount}.`
    )
  );

  checks.push(
    buildCheck(
      "frequency_limit",
      authorization.executionFrequency.usedCount < authorization.executionFrequency.maxCount,
      authorization.executionFrequency.usedCount < authorization.executionFrequency.maxCount
        ? "Execution frequency remains available."
        : "Execution frequency limit has been reached."
    )
  );

  const validUntil = new Date(`${authorization.validUntil}T23:59:59.999Z`);
  checks.push(
    buildCheck(
      "valid_time_window",
      now.getTime() <= validUntil.getTime(),
      now.getTime() <= validUntil.getTime()
        ? `Authorization is valid until ${authorization.validUntil}.`
        : `Authorization expired at ${authorization.validUntil}.`
    )
  );

  checks.push(
    buildCheck(
      "execution_mode_allowed",
      true,
      authorization.executionMode === "manual_only"
        ? "Manual-only authorization requires user approval before execution."
        : "Execution mode permits automatic execution when the amount policy also allows it."
    )
  );

  const reasons = checks.filter((check) => !check.passed).map((check) => check.message);

  return {
    passed: reasons.length === 0,
    reasons,
    checks
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
      decision: "ask",
      reason: `AI fit check failed after hard rules passed, so the system failed closed to user approval: ${fitCheck.explanation}`,
      requiresUserApproval: true,
      nextAction: "request_user_approval"
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

export function buildMockServicePayloads(
  scenario: DemoScenario,
  traceId: string,
  execution: ExecutionResult
): MockServicePayloads {
  return {
    merchant: {
      traceId,
      quoteId: scenario.quotes.officialQuote.quoteId,
      merchantName: scenario.quotes.officialQuote.merchantName,
      amount: scenario.quotes.officialQuote.amount,
      currency: scenario.quotes.officialQuote.currency,
      isExecutable: scenario.quotes.officialQuote.isExecutable
    },
    consumerAgentNetwork: {
      traceId,
      marketAverage: scenario.quotes.marketIntelligence.marketAverage,
      priceRange: scenario.quotes.marketIntelligence.priceRange,
      signal: scenario.quotes.marketIntelligence.signal
    },
    wallet: {
      traceId,
      simulated: true,
      paymentStatus: execution.paymentStatus,
      walletPaymentId: execution.walletPaymentId
    }
  };
}

function buildEventPayload(
  type: (typeof DEMO_EVENT_TYPES)[number],
  scenario: DemoScenario,
  evaluation: AuthorizationEvaluation,
  fitCheck: AIFitCheckResult,
  decision: DecisionResult,
  execution: ExecutionResult,
  mode: AppMode
): Record<string, unknown> {
  if (mode === "release") {
    if (type === "decision.made") {
      return {
        decision: decision.decision,
        nextAction: decision.nextAction
      };
    }

    if (type === "order.created" || type === "payment.simulated") {
      return {
        orderStatus: execution.orderStatus,
        paymentStatus: execution.paymentStatus
      };
    }

    return {};
  }

  switch (type) {
    case "profile.generated":
      return {
        userId: scenario.profile.userId,
        profileTags: scenario.profile.profileTags,
        avatarState: scenario.profile.avatarState
      };
    case "goal.loaded":
      return {
        availableTravelBudget: scenario.goalContext.availableTravelBudget,
        goalImpact: scenario.goalContext.goalImpact
      };
    case "authorization.checked":
      return {
        authorizationId: scenario.authorization.authorizationId,
        passed: evaluation.passed,
        checks: evaluation.checks
      };
    case "official_quote.received":
      return scenario.quotes.officialQuote;
    case "market_intelligence.received":
      return scenario.quotes.marketIntelligence;
    case "ai_fit_check.completed":
      return fitCheck;
    case "decision.made":
      return decision;
    case "order.created":
      return {
        executionId: execution.executionId,
        orderStatus: execution.orderStatus,
        merchantOrderId: execution.merchantOrderId
      };
    case "payment.simulated":
      return {
        executionId: execution.executionId,
        paymentStatus: execution.paymentStatus,
        walletPaymentId: execution.walletPaymentId
      };
    case "feedback.received":
      return scenario.feedback;
    case "context.updated":
      return {
        contextSignals: scenario.feedback.contextSignals
      };
  }
}

export function buildEventLog(
  scenario: DemoScenario,
  traceId: string,
  evaluation: AuthorizationEvaluation,
  fitCheck: AIFitCheckResult,
  decision: DecisionResult,
  execution: ExecutionResult,
  mode: AppMode
): EventLogRecord[] {
  const createdAt = new Date(scenario.now).toISOString();

  return DEMO_EVENT_TYPES.map((type, index) => ({
    eventId: `evt_${String(index + 1).padStart(3, "0")}`,
    traceId,
    userId: scenario.profile.userId,
    requestId: scenario.consumptionRequest.requestId,
    authorizationId: scenario.authorization.authorizationId,
    type,
    message: type.replaceAll(".", " "),
    payload: buildEventPayload(type, scenario, evaluation, fitCheck, decision, execution, mode),
    redacted: mode === "release",
    createdAt
  }));
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
  const fallbackFitCheck =
    fitCheck ??
    ({
      fitCheck: "caution",
      softRisks: ["AI fit check was unavailable."],
      explanation: "The system requires user confirmation when AI context is missing."
    } satisfies AIFitCheckResult);
  const events = buildEventLog(scenario, traceId, evaluation, fallbackFitCheck, decision, execution, mode);
  const mockServices = buildMockServicePayloads(scenario, traceId, execution);

  const response: DemoDecisionFlowResponse = {
    traceId,
    profile: scenario.profile,
    goalContext: scenario.goalContext,
    authorization: scenario.authorization,
    request: scenario.consumptionRequest,
    quotes: scenario.quotes,
    fitCheck: fallbackFitCheck,
    decision,
    execution,
    feedbackPrompt: scenario.feedback,
    events,
    debug:
      mode === "debug"
        ? {
            hardRulesPassed: evaluation.passed,
            hardRuleReasons: evaluation.reasons,
            mode,
            ruleEvaluation: evaluation,
            mockServices
          }
        : undefined
  };

  return demoDecisionFlowResponseSchema.parse(response);
}
