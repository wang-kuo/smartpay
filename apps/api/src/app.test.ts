import { describe, expect, it } from "vitest";
import {
  demoAdminLogsResponseSchema,
  demoAdminUsersResponseSchema,
  demoAuthSessionResponseSchema,
  demoDecisionFlowResponseSchema,
  demoEmailCodeResponseSchema,
  demoInviteResponseSchema,
  demoInteractiveDecisionResponseSchema,
  errorResponseSchema,
  type DemoDecisionFlowVariant
} from "@smartpay/contracts";
import { ADMIN_TOKEN_HEADER } from "./auth";
import app from "./app";
import { getInviteCodeForTest, getLatestVerificationCodeForTest } from "./runtime-state";

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

async function postDecisionFlow(
  body: Record<string, unknown>,
  traceId = "trace_api_test",
  headers: Record<string, string> = {}
) {
  return app.request("/api/demo/japan-trip/decision-flow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Trace-Id": traceId,
      ...headers
    },
    body: JSON.stringify(body)
  });
}

async function withDemoAdminEnv<T>(run: () => Promise<T>): Promise<T> {
  const originalEmail = process.env.DEMO_ADMIN_EMAIL;
  const originalSessionSecret = process.env.AUTH_SESSION_SECRET;
  const originalSmtpHost = process.env.SMTP_HOST;
  const originalSmtpFrom = process.env.SMTP_FROM;
  const originalEmailMode = process.env.EMAIL_DELIVERY_MODE;
  process.env.DEMO_ADMIN_EMAIL = "admin@example.com";
  process.env.AUTH_SESSION_SECRET = "test-session-secret";
  process.env.EMAIL_DELIVERY_MODE = "json";
  process.env.SMTP_FROM = "no-reply@smartpay.local";

  try {
    return await run();
  } finally {
    restoreEnv("DEMO_ADMIN_EMAIL", originalEmail);
    restoreEnv("AUTH_SESSION_SECRET", originalSessionSecret);
    restoreEnv("SMTP_HOST", originalSmtpHost);
    restoreEnv("SMTP_FROM", originalSmtpFrom);
    restoreEnv("EMAIL_DELIVERY_MODE", originalEmailMode);
  }
}

async function requestEmailCode(email: string, inviteCode?: string, traceId = "trace_code") {
  const response = await app.request("/api/demo/auth/email-code/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Trace-Id": traceId
    },
    body: JSON.stringify({
      email,
      inviteCode
    })
  });
  const body = demoEmailCodeResponseSchema.parse(await response.json());
  return { response, body };
}

async function loginAdmin(traceId = "trace_admin_login"): Promise<string> {
  const codeResponse = await requestEmailCode("admin@example.com", undefined, `${traceId}_code`);
  expect(codeResponse.response.status).toBe(200);
  const verificationCode = getLatestVerificationCodeForTest("admin@example.com");
  expect(verificationCode).toEqual(expect.any(String));

  const response = await app.request("/api/demo/auth/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Trace-Id": traceId
    },
    body: JSON.stringify({
      email: "admin@example.com",
      verificationCode
    })
  });
  const body = demoAuthSessionResponseSchema.parse(await response.json());
  expect(response.status).toBe(200);
  expect(body.session.adminToken).toEqual(expect.any(String));
  return body.session.adminToken!;
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
      deepSeekConfigured: boolean;
      realPaymentsEnabled: boolean;
      traceId: string;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      appMode: "debug",
      deepSeekConfigured: expect.any(Boolean),
      realPaymentsEnabled: false,
      traceId: "trace_health"
    });
  });

  it("creates invited user sessions and admin sessions with mock email codes", async () => {
    await withDemoAdminEnv(async () => {
      const inviteResponse = await app.request("/api/demo/invites/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Trace-Id": "trace_invite"
        },
        body: JSON.stringify({
          email: "demo-user@example.com"
        })
      });
      const inviteBody = demoInviteResponseSchema.parse(await inviteResponse.json());
      expect(inviteResponse.status).toBe(200);
      expect(inviteBody.user).toMatchObject({
        email: "demo-user@example.com",
        status: "invited"
      });
      expect(inviteBody.deliveryStatus).toBe("sent");
      const inviteCode = getInviteCodeForTest("demo-user@example.com");
      expect(inviteCode).toEqual(expect.any(String));

      const code = await requestEmailCode(
        "demo-user@example.com",
        inviteCode,
        "trace_user_code"
      );
      expect(code.response.status).toBe(200);
      expect(code.body.deliveryStatus).toBe("sent");
      const userVerificationCode = getLatestVerificationCodeForTest("demo-user@example.com");
      expect(userVerificationCode).toEqual(expect.any(String));

      const userResponse = await app.request("/api/demo/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Trace-Id": "trace_user_login"
        },
        body: JSON.stringify({
          email: "demo-user@example.com",
          verificationCode: userVerificationCode,
          username: "Demo User"
        })
      });
      const userBody = demoAuthSessionResponseSchema.parse(await userResponse.json());

      expect(userResponse.status).toBe(200);
      expect(userBody.session).toMatchObject({
        email: "demo-user@example.com",
        username: "Demo User",
        role: "user"
      });
      expect(userBody.session.adminToken).toBeUndefined();

      const adminCode = await requestEmailCode("admin@example.com", undefined, "trace_admin_code");
      expect(adminCode.response.status).toBe(200);
      const adminVerificationCode = getLatestVerificationCodeForTest("admin@example.com");
      expect(adminVerificationCode).toEqual(expect.any(String));

      const adminResponse = await app.request("/api/demo/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Trace-Id": "trace_admin_login"
        },
        body: JSON.stringify({
          email: "admin@example.com",
          verificationCode: adminVerificationCode
        })
      });
      const adminBody = demoAuthSessionResponseSchema.parse(await adminResponse.json());

      expect(adminResponse.status).toBe(200);
      expect(adminBody.session).toMatchObject({
        email: "admin@example.com",
        username: expect.any(String),
        role: "admin",
        adminToken: expect.any(String)
      });
    });
  });

  it("rejects invalid email verification codes", async () => {
    await withDemoAdminEnv(async () => {
      const response = await app.request("/api/demo/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Trace-Id": "trace_admin_invalid"
        },
        body: JSON.stringify({
          email: "admin@example.com",
          verificationCode: "000000"
        })
      });
      const body = errorResponseSchema.parse(await response.json());

      expect(response.status).toBe(401);
      expect(body.error.code).toBe("invalid_verification_code");
    });
  });

  it("lets admins inspect users and runtime logs", async () => {
    await withDemoAdminEnv(async () => {
      const adminToken = await loginAdmin("trace_admin_list_login");

      const usersResponse = await app.request("/api/demo/admin/users", {
        headers: {
          "X-Trace-Id": "trace_admin_users",
          [ADMIN_TOKEN_HEADER]: adminToken
        }
      });
      const usersBody = demoAdminUsersResponseSchema.parse(await usersResponse.json());
      expect(usersResponse.status).toBe(200);
      expect(usersBody.users.some((user) => user.email === "admin@example.com")).toBe(true);

      const logsResponse = await app.request("/api/demo/admin/logs", {
        headers: {
          "X-Trace-Id": "trace_admin_logs",
          [ADMIN_TOKEN_HEADER]: adminToken
        }
      });
      const logsBody = demoAdminLogsResponseSchema.parse(await logsResponse.json());
      expect(logsResponse.status).toBe(200);
      expect(logsBody.logs.some((log) => log.source === "auth.session")).toBe(true);
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

  it("only returns debug data to admin session requests", async () => {
    await withDemoAdminEnv(async () => {
      const adminToken = await loginAdmin("trace_admin_debug_login");
      const publicResponse = await postDecisionFlow({}, "trace_public_debug");
      const publicBody = demoDecisionFlowResponseSchema.parse(await publicResponse.json());
      const adminResponse = await postDecisionFlow({}, "trace_admin_debug", {
        [ADMIN_TOKEN_HEADER]: adminToken
      });
      const adminBody = demoDecisionFlowResponseSchema.parse(await adminResponse.json());

      expect(publicResponse.status).toBe(200);
      expect(publicBody.debug).toBeUndefined();
      expect(adminResponse.status).toBe(200);
      expect(adminBody.debug?.mode).toBe("debug");
      expect(adminBody.debug?.ruleEvaluation.checks.length).toBeGreaterThan(0);
    });
  });

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
      restoreEnv("APP_MODE", originalMode);
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
      restoreEnv("REAL_PAYMENTS_ENABLED", originalFlag);
    }
  });

  it("accepts an email chat request and falls back safely when DeepSeek is not configured", async () => {
    const originalKey = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = "";

    try {
      const response = await app.request("/api/demo/japan-trip/interactive-decision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Trace-Id": "trace_interactive"
        },
        body: JSON.stringify({
          email: "demo@example.com",
          message: "I want to book a 6 day Japan trip under S$2500."
        })
      });
      const body = await response.json();
      const parsed = demoInteractiveDecisionResponseSchema.parse(body);

      expect(response.status).toBe(200);
      expect(parsed).toMatchObject({
        traceId: "trace_interactive",
        decision: {
          decision: "allow"
        },
        interaction: {
          email: "demo@example.com",
          summary: expect.any(String)
        }
      });
      expect(parsed.interaction.analysis).toBeUndefined();
      expect(parsed.interaction.llm).toBeUndefined();
    } finally {
      restoreEnv("DEEPSEEK_API_KEY", originalKey);
    }
  });

  it("returns interactive backend analysis only to admin session requests", async () => {
    const originalKey = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = "";

    try {
      await withDemoAdminEnv(async () => {
        const adminToken = await loginAdmin("trace_interactive_admin_login");
        const response = await app.request("/api/demo/japan-trip/interactive-decision", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Trace-Id": "trace_interactive_admin",
            [ADMIN_TOKEN_HEADER]: adminToken
          },
          body: JSON.stringify({
            email: "admin@example.com",
            message: "I want to book a 6 day Japan trip under S$2500."
          })
        });
        const body = demoInteractiveDecisionResponseSchema.parse(await response.json());

        expect(response.status).toBe(200);
        expect(body.interaction.analysis?.fitCheck.fitCheck).toBe("pass");
        expect(body.interaction.llm).toMatchObject({
          provider: "deterministic_fallback",
          usedDeepSeek: false
        });
        expect(body.debug?.mode).toBe("debug");
      });
    } finally {
      restoreEnv("DEEPSEEK_API_KEY", originalKey);
    }
  });

  it("returns contract-shaped errors for invalid interactive requests", async () => {
    const response = await app.request("/api/demo/japan-trip/interactive-decision", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Trace-Id": "trace_interactive_invalid"
      },
      body: JSON.stringify({
        email: "not-an-email",
        message: "hi"
      })
    });
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(body.traceId).toBe("trace_interactive_invalid");
    expect(body.error.code).toBe("invalid_request");
  });
});
