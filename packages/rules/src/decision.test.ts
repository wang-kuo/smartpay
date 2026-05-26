import { describe, expect, it } from "vitest";
import { japanTripScenario } from "@smartpay/mock-data";
import { buildDemoDecisionFlow } from "./index";

describe("SmartPay decision composition", () => {
  it("allows when hard rules pass, fit check passes, and amount is under auto threshold", () => {
    const result = buildDemoDecisionFlow(japanTripScenario, "trace_allow");

    expect(result.decision.decision).toBe("allow");
    expect(result.execution.paymentStatus).toBe("simulated_paid");
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
  });

  it("fails closed to ask when the AI fit check is unavailable", () => {
    const result = buildDemoDecisionFlow(japanTripScenario, "trace_fail_closed", null);

    expect(result.decision.decision).toBe("ask");
    expect(result.decision.reason).toContain("failed closed");
  });
});
