import { demoScenarioSchema, type DemoScenario } from "@smartpay/contracts";
import japanTripScenarioData from "../scenarios/japan-trip.json";

export const japanTripScenario: DemoScenario = demoScenarioSchema.parse(japanTripScenarioData);
