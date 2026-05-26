import {
  demoScenarioSchema,
  type AIFitCheckResult,
  type DemoDecisionFlowVariant,
  type DemoScenario
} from "@smartpay/contracts";
import japanTripScenarioData from "../scenarios/japan-trip.json";

export const japanTripScenario: DemoScenario = demoScenarioSchema.parse(japanTripScenarioData);

export type JapanTripScenarioVariant = {
  scenario: DemoScenario;
  fitCheckOverride?: AIFitCheckResult | null;
};

export function getJapanTripScenarioVariant(
  variant: DemoDecisionFlowVariant
): JapanTripScenarioVariant {
  if (variant === "ask") {
    return {
      scenario: japanTripScenario,
      fitCheckOverride: japanTripScenario.variants?.askFitCheck ?? {
        fitCheck: "caution",
        softRisks: ["The request needs user confirmation."],
        explanation: "The system asks when the fit check returns caution."
      }
    };
  }

  if (variant === "deny") {
    return {
      scenario: {
        ...japanTripScenario,
        consumptionRequest:
          japanTripScenario.variants?.denyRequest ?? japanTripScenario.consumptionRequest
      }
    };
  }

  if (variant === "missing_fit_check") {
    return {
      scenario: japanTripScenario,
      fitCheckOverride: null
    };
  }

  return {
    scenario: japanTripScenario
  };
}
