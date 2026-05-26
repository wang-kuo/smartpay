import { describe, expect, it } from "vitest";
import {
  demoDecisionFlowRequestSchema,
  eventLogRecordSchema,
  errorResponseSchema
} from "./index";

describe("SmartPay shared contracts", () => {
  it("defaults the Japan Trip demo request to the allow variant", () => {
    const parsed = demoDecisionFlowRequestSchema.parse({});

    expect(parsed).toMatchObject({
      userId: "user_001",
      scenario: "japan_trip",
      variant: "allow"
    });
  });

  it("requires every error response to carry a traceId", () => {
    const parsed = errorResponseSchema.parse({
      traceId: "trace_contract_error",
      error: {
        code: "invalid_request",
        message: "Request body does not match the contract."
      }
    });

    expect(parsed.traceId).toBe("trace_contract_error");
  });

  it("captures audit event context and redaction state", () => {
    const parsed = eventLogRecordSchema.parse({
      eventId: "evt_contract_001",
      traceId: "trace_contract_event",
      userId: "user_001",
      requestId: "req_001",
      authorizationId: "auth_001",
      type: "decision.made",
      message: "decision made",
      payload: {
        decision: "allow"
      },
      redacted: false,
      createdAt: "2026-05-26T00:00:00.000Z"
    });

    expect(parsed.payload).toEqual({ decision: "allow" });
  });
});
