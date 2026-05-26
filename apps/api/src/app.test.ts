import { describe, expect, it } from "vitest";
import {
  demoDecisionFlowResponseSchema,
  errorResponseSchema,
  type DemoDecisionFlowVariant
} from "@smartpay/contracts";
import app from "./app";

async function postDecisionFlow(body: Record<string, unknown>, traceId = "trace_api_test") {
  return app.request("/api/demo/japan-trip/decision-flow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Trace-Id": traceId
    },
    body: JSON.stringify(body)
  });
}

describe("Japan Trip decision-flow API", () => {
  it("returns health with trace and mock-only payment state", async () => {
    const response = await app.request("/api/health", {
      headers: {
        "X-Trace-Id": "trace_health"
      }
    });
    const body = (await response.json()) as {
      ok: boolean;
      appMode: string;
      realPaymentsEnabled: boolean;
      traceId: string;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      appMode: "debug",
      realPaymentsEnabled: false,
      traceId: "trace_health"
    });
  });

  it.each([
    ["allow", "allow"],
    ["ask", "ask"],
    ["deny", "deny"],
    ["missing_fit_check", "ask"]
  ] satisfies Array<[DemoDecisionFlowVariant, string]>)(
    "returns %s demo variant as %s",
    async (variant, decision) => {
      const response = await postDecisionFlow({ variant }, `trace_${variant}`);
      const body = demoDecisionFlowResponseSchema.parse(await response.json());

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Trace-Id")).toBe(`trace_${variant}`);
      expect(body.traceId).toBe(`trace_${variant}`);
      expect(body.decision.decision).toBe(decision);
      expect(body.events.every((event) => event.traceId === `trace_${variant}`)).toBe(true);
    }
  );

  it("returns contract-shaped errors for invalid requests", async () => {
    const response = await postDecisionFlow({ scenario: "invalid" }, "trace_invalid");
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(body.traceId).toBe("trace_invalid");
    expect(body.error.code).toBe("invalid_request");
  });

  it("redacts debug data in release mode", async () => {
    const originalMode = process.env.APP_MODE;
    process.env.APP_MODE = "release";

    try {
      const response = await postDecisionFlow({}, "trace_release_api");
      const body = demoDecisionFlowResponseSchema.parse(await response.json());

      expect(response.status).toBe(200);
      expect(body.debug).toBeUndefined();
      expect(body.events.every((event) => event.redacted)).toBe(true);
    } finally {
      process.env.APP_MODE = originalMode;
    }
  });

  it("refuses real payment mode for the mock demo", async () => {
    const originalFlag = process.env.REAL_PAYMENTS_ENABLED;
    process.env.REAL_PAYMENTS_ENABLED = "true";

    try {
      const response = await postDecisionFlow({}, "trace_real_payment_guard");
      const body = errorResponseSchema.parse(await response.json());

      expect(response.status).toBe(503);
      expect(body.error.code).toBe("real_payments_disabled");
    } finally {
      process.env.REAL_PAYMENTS_ENABLED = originalFlag;
    }
  });
});
