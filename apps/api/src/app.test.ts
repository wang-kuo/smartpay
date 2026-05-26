import { describe, expect, it } from "vitest";
import {
  demoAuthSessionResponseSchema,
  demoDecisionFlowResponseSchema,
  demoInteractiveDecisionResponseSchema,
  errorResponseSchema,
  type DemoDecisionFlowVariant
} from "@smartpay/contracts";
import { ADMIN_TOKEN_HEADER } from "./auth";
import app from "./app";

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
  const originalPassword = process.env.DEMO_ADMIN_PASSWORD;
  const originalToken = process.env.DEMO_ADMIN_TOKEN;
  process.env.DEMO_ADMIN_EMAIL = "admin@example.com";
  process.env.DEMO_ADMIN_PASSWORD = "correct-password";
  process.env.DEMO_ADMIN_TOKEN = "admin-token";

  try {
    return await run();
  } finally {
    restoreEnv("DEMO_ADMIN_EMAIL", originalEmail);
    restoreEnv("DEMO_ADMIN_PASSWORD", originalPassword);
    restoreEnv("DEMO_ADMIN_TOKEN", originalToken);
  }
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

  it("creates demo user sessions and admin sessions with a local token", async () => {
    await withDemoAdminEnv(async () => {
      const userResponse = await app.request("/api/demo/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Trace-Id": "trace_user_login"
        },
        body: JSON.stringify({
          email: "demo@example.com"
        })
      });
      const userBody = demoAuthSessionResponseSchema.parse(await userResponse.json());

      expect(userResponse.status).toBe(200);
      expect(userBody.session).toMatchObject({
        email: "demo@example.com",
        role: "user"
      });
      expect(userBody.session.adminToken).toBeUndefined();

      const adminResponse = await app.request("/api/demo/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Trace-Id": "trace_admin_login"
        },
        body: JSON.stringify({
          email: "admin@example.com",
          password: "correct-password"
        })
      });
      const adminBody = demoAuthSessionResponseSchema.parse(await adminResponse.json());

      expect(adminResponse.status).toBe(200);
      expect(adminBody.session).toMatchObject({
        email: "admin@example.com",
        role: "admin",
        adminToken: "admin-token"
      });
    });
  });

  it("rejects invalid admin credentials", async () => {
    await withDemoAdminEnv(async () => {
      const response = await app.request("/api/demo/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Trace-Id": "trace_admin_invalid"
        },
        body: JSON.stringify({
          email: "admin@example.com",
          password: "wrong-password"
        })
      });
      const body = errorResponseSchema.parse(await response.json());

      expect(response.status).toBe(401);
      expect(body.error.code).toBe("invalid_credentials");
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

  it("only returns debug data to admin-token requests", async () => {
    await withDemoAdminEnv(async () => {
      const publicResponse = await postDecisionFlow({}, "trace_public_debug");
      const publicBody = demoDecisionFlowResponseSchema.parse(await publicResponse.json());
      const adminResponse = await postDecisionFlow({}, "trace_admin_debug", {
        [ADMIN_TOKEN_HEADER]: "admin-token"
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

  it("returns interactive backend analysis only to admin-token requests", async () => {
    const originalKey = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = "";

    try {
      await withDemoAdminEnv(async () => {
        const response = await app.request("/api/demo/japan-trip/interactive-decision", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Trace-Id": "trace_interactive_admin",
            [ADMIN_TOKEN_HEADER]: "admin-token"
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
