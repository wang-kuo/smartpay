import { describe, expect, it } from "vitest";
import {
  demoAuthSessionRequestSchema,
  demoAuthSessionResponseSchema,
  demoEmailCodeRequestSchema,
  demoInviteRequestSchema,
  demoDecisionFlowRequestSchema,
  demoInteractiveDecisionResponseSchema,
  demoInteractiveDecisionRequestSchema,
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

  it("validates an interactive decision request from a demo email session", () => {
    const parsed = demoInteractiveDecisionRequestSchema.parse({
      email: "demo@example.com",
      message: "I want to book a 6 day Japan trip under S$2500."
    });

    expect(parsed.scenario).toBe("japan_trip");
    expect(parsed.conversationHistory).toEqual([]);
  });

  it("validates demo auth sessions and admin-only token shape", () => {
    const inviteRequest = demoInviteRequestSchema.parse({
      email: "user@example.com"
    });
    const codeRequest = demoEmailCodeRequestSchema.parse({
      email: inviteRequest.email,
      inviteCode: "INV-USER-123456"
    });
    const request = demoAuthSessionRequestSchema.parse({
      email: "admin@smartpay.local",
      verificationCode: "123456",
      username: "Admin"
    });
    const response = demoAuthSessionResponseSchema.parse({
      traceId: "trace_auth_contract",
      session: {
        email: request.email,
        username: request.username,
        role: "admin",
        adminToken: "token"
      }
    });

    expect(codeRequest.inviteCode).toBe("INV-USER-123456");
    expect(response.session.role).toBe("admin");
    expect(response.session.adminToken).toBe("token");
  });

  it("allows public interactive responses to omit backend analysis details", () => {
    const parsed = demoInteractiveDecisionResponseSchema.shape.interaction.parse({
      email: "demo@example.com",
      message: "I want to book a 6 day Japan trip.",
      summary: "The trip fits the active travel authorization."
    });

    expect(parsed.analysis).toBeUndefined();
    expect(parsed.llm).toBeUndefined();
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
