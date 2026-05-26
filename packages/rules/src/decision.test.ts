import { describe, expect, it } from "vitest";
import { japanTripScenario } from "@smartpay/mock-data";
import { buildDemoDecisionFlow, evaluateAuthorization } from "./index";

describe("SmartPay decision composition", () => {
  it("allows when hard rules pass, fit check passes, and amount is under auto threshold", () => {
    const result = buildDemoDecisionFlow(japanTripScenario, "trace_allow");

    expect(result.decision.decision).toBe("allow");
    expect(result.execution.paymentStatus).toBe("simulated_paid");
    expect(result.events).toHaveLength(11);
    expect(result.debug?.ruleEvaluation.checks.every((check) => check.passed)).toBe(true);
  });

  it("asks when fit check is caution", () => {
    const result = buildDemoDecisionFlow(japanTripScenario, "trace_ask", {
      fitCheck: "caution",
      softRisks: ["Hotel price is near the high end of the range."],
      explanation: "The request is plausible but should be confirmed."
    });

    expect(result.decision.decision).toBe("ask");
    expect(result.decision.requiresUserApproval).toBe(true);
    expect(result.execution.orderStatus).toBe("pending_user_approval");
  });

  it("denies when hard rules fail", () => {
    const result = buildDemoDecisionFlow(
      {
        ...japanTripScenario,
        consumptionRequest: {
          ...japanTripScenario.consumptionRequest,
          amount: 3000
        }
      },
      "trace_deny"
    );

    expect(result.decision.decision).toBe("deny");
    expect(result.execution.paymentStatus).toBe("blocked");
    expect(result.debug?.hardRuleReasons[0]).toContain("exceeds max single amount");
  });

  it("fails closed to ask when the AI fit check is unavailable", () => {
    const result = buildDemoDecisionFlow(japanTripScenario, "trace_fail_closed", null);

    expect(result.decision.decision).toBe("ask");
    expect(result.decision.reason).toContain("failed closed");
  });

  it("fails closed to ask when the AI fit check fails after hard rules pass", () => {
    const result = buildDemoDecisionFlow(japanTripScenario, "trace_fit_fail", {
      fitCheck: "fail",
      softRisks: ["Trip would materially harm the savings goal."],
      explanation: "The request conflicts with the user's stated budget posture."
    });

    expect(result.decision.decision).toBe("ask");
    expect(result.execution.orderStatus).toBe("pending_user_approval");
  });

  it("denies category, currency, frequency, and expired authorization failures", () => {
    const expiredScenario = {
      ...japanTripScenario,
      now: "2026-07-01T00:00:00.000Z",
      authorization: {
        ...japanTripScenario.authorization,
        category: "Learning" as const,
        currency: "USD",
        executionFrequency: {
          ...japanTripScenario.authorization.executionFrequency,
          usedCount: japanTripScenario.authorization.executionFrequency.maxCount
        }
      },
      consumptionRequest: {
        ...japanTripScenario.consumptionRequest,
        category: "Travel" as const,
        currency: "SGD"
      }
    };

    const result = buildDemoDecisionFlow(expiredScenario, "trace_multi_deny");

    expect(result.decision.decision).toBe("deny");
    expect(result.debug?.hardRuleReasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining("outside Learning authorization"),
        expect.stringContaining("does not match authorization currency USD"),
        expect.stringContaining("frequency limit"),
        expect.stringContaining("expired")
      ])
    );
  });

  it("asks when hard rules pass but authorization is manual only", () => {
    const result = buildDemoDecisionFlow(
      {
        ...japanTripScenario,
        authorization: {
          ...japanTripScenario.authorization,
          executionMode: "manual_only"
        }
      },
      "trace_manual_only"
    );

    expect(result.decision.decision).toBe("ask");
    expect(result.decision.reason).toContain("requires user approval");
  });

  it("denies when authorization is missing", () => {
    const evaluation = evaluateAuthorization(
      null,
      japanTripScenario.consumptionRequest,
      new Date(japanTripScenario.now)
    );

    expect(evaluation.passed).toBe(false);
    expect(evaluation.reasons[0]).toContain("No authorization");
  });

  it("redacts event payloads and removes debug data in release mode", () => {
    const result = buildDemoDecisionFlow(japanTripScenario, "trace_release", undefined, "release");

    expect(result.debug).toBeUndefined();
    expect(result.events.every((event) => event.redacted)).toBe(true);
    expect(result.events.find((event) => event.type === "authorization.checked")?.payload).toEqual({});
    expect(result.events.find((event) => event.type === "decision.made")?.payload).toEqual({
      decision: "allow",
      nextAction: "execute_order"
    });
  });
});
