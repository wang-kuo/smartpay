import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { getJapanTripScenarioVariant } from "@smartpay/mock-data";
import { buildDemoDecisionFlow } from "@smartpay/rules";
import {
  demoAdminLogsResponseSchema,
  demoAdminUsersResponseSchema,
  demoAuthSessionRequestSchema,
  demoAuthSessionResponseSchema,
  demoDecisionFlowRequestSchema,
  demoInteractiveDecisionRequestSchema,
  demoInteractiveDecisionResponseSchema,
  demoEmailCodeRequestSchema,
  demoEmailCodeResponseSchema,
  demoInviteRequestSchema,
  demoInviteResponseSchema,
  errorResponseSchema,
  type AppMode,
  type ErrorResponse
} from "@smartpay/contracts";
import { analyzeInteractionWithOptionalDeepSeek } from "./llm";
import { getJapanTripMockMcpContext } from "./mock-mcp";
import { ADMIN_TOKEN_HEADER, createAdminSessionToken, isAdminRequest } from "./auth";
import { getSecret } from "./secrets";
import { sendInviteEmail, sendVerificationEmail } from "./email-delivery";
import {
  addSystemLog,
  getSystemLogs,
  getUsers,
  issueEmailCode,
  requestInvite,
  verifyEmailSession
} from "./runtime-state";

const app = new Hono();

const localWebOrigins = ["http://localhost:3000", "http://127.0.0.1:3000", "http://192.168.1.9:3000"];

app.use(
  "*",
  cors({
    origin: localWebOrigins,
    allowHeaders: ["Content-Type", "Idempotency-Key", "X-Trace-Id", ADMIN_TOKEN_HEADER],
    allowMethods: ["GET", "POST", "OPTIONS"]
  })
);

function getTraceId(context: Context): string {
  return context.req.header("X-Trace-Id") ?? crypto.randomUUID();
}

function getAppMode(): AppMode {
  return process.env.APP_MODE === "release" ? "release" : "debug";
}

function buildError(traceId: string, code: string, message: string, details?: string[]): ErrorResponse {
  return errorResponseSchema.parse({
    traceId,
    error: {
      code,
      message,
      details
    }
  });
}

async function requireAdmin(context: Context, traceId: string): Promise<Response | undefined> {
  if (isAdminRequest(context)) {
    return undefined;
  }

  await addSystemLog({
    traceId,
    level: "warn",
    source: "admin.auth",
    message: "Admin token missing or invalid.",
    payload: { path: context.req.path },
    redacted: getAppMode() === "release"
  });
  return context.json(buildError(traceId, "admin_required", "Admin token is required."), 403);
}

app.onError(async (error, context) => {
  const traceId = getTraceId(context);
  await addSystemLog({
    traceId,
    level: "error",
    source: "api.runtime",
    message: error.message,
    payload: getAppMode() === "release" ? {} : { stack: error.stack },
    redacted: getAppMode() === "release"
  });
  return context.json(buildError(traceId, "runtime_error", "Unexpected runtime error."), 500);
});

app.get("/api/health", (context) =>
  context.json({
    ok: true,
    service: "smartpay-api",
    appMode: getAppMode(),
    deepSeekConfigured: Boolean(getSecret("DEEPSEEK_API_KEY")?.trim()),
    realPaymentsEnabled: false,
    traceId: getTraceId(context)
  })
);

app.post("/api/demo/invites/request", async (context) => {
  const traceId = getTraceId(context);
  context.header("X-Trace-Id", traceId);
  const body = await context.req.json().catch(() => ({}));
  const parsed = demoInviteRequestSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      buildError(
        traceId,
        "invalid_request",
        "Request body does not match the invite request contract.",
        parsed.error.issues.map((issue) => issue.message)
      ),
      400
    );
  }

  const user = await requestInvite(parsed.data.email);
  const delivery = await sendInviteEmail({
    email: user.email,
    inviteCode: user.inviteCode ?? ""
  });
  if (!delivery.sent) {
    await addSystemLog({
      traceId,
      level: "error",
      source: "auth.invite",
      message: "Invite email delivery is not configured.",
      userEmail: user.email,
      payload: {},
      redacted: getAppMode() === "release"
    });
    return context.json(
      buildError(traceId, delivery.reason, "Email delivery is not configured for invite emails."),
      503
    );
  }
  await addSystemLog({
    traceId,
    level: "info",
    source: "auth.invite",
    message: "Invite requested.",
    userEmail: user.email,
    payload: { status: user.status },
    redacted: getAppMode() === "release"
  });

  return context.json(
    demoInviteResponseSchema.parse({
      traceId,
      user,
      deliveryStatus: "sent"
    })
  );
});

app.post("/api/demo/auth/email-code/request", async (context) => {
  const traceId = getTraceId(context);
  context.header("X-Trace-Id", traceId);
  const body = await context.req.json().catch(() => ({}));
  const parsed = demoEmailCodeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      buildError(
        traceId,
        "invalid_request",
        "Request body does not match the email-code request contract.",
        parsed.error.issues.map((issue) => issue.message)
      ),
      400
    );
  }

  const issued = await issueEmailCode(parsed.data.email, parsed.data.inviteCode);
  if (!issued) {
    await addSystemLog({
      traceId,
      level: "warn",
      source: "auth.email_code",
      message: "Email code request rejected.",
      userEmail: parsed.data.email,
      payload: { inviteCodeProvided: Boolean(parsed.data.inviteCode) },
      redacted: getAppMode() === "release"
    });
    return context.json(
      buildError(traceId, "invite_required", "A valid invite code is required before login."),
      403
    );
  }

  const delivery = await sendVerificationEmail({
    email: parsed.data.email.trim().toLowerCase(),
    verificationCode: issued.code,
    expiresAt: issued.expiresAt
  });
  if (!delivery.sent) {
    await addSystemLog({
      traceId,
      level: "error",
      source: "auth.email_code",
      message: "Verification email delivery is not configured.",
      userEmail: parsed.data.email,
      payload: {},
      redacted: getAppMode() === "release"
    });
    return context.json(
      buildError(traceId, delivery.reason, "Email delivery is not configured for verification codes."),
      503
    );
  }

  await addSystemLog({
    traceId,
    level: "info",
    source: "auth.email_code",
    message: "Email verification code issued.",
    userEmail: parsed.data.email,
    payload: { expiresAt: issued.expiresAt },
    redacted: getAppMode() === "release"
  });

  return context.json(
    demoEmailCodeResponseSchema.parse({
      traceId,
      email: parsed.data.email.trim().toLowerCase(),
      expiresAt: issued.expiresAt,
      deliveryStatus: "sent"
    })
  );
});

app.post("/api/demo/auth/session", async (context) => {
  const traceId = getTraceId(context);
  context.header("X-Trace-Id", traceId);
  const body = await context.req.json().catch(() => ({}));
  const parsed = demoAuthSessionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      buildError(
        traceId,
        "invalid_request",
        "Request body does not match the demo auth contract.",
        parsed.error.issues.map((issue) => issue.message)
      ),
      400
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await verifyEmailSession(email, parsed.data.verificationCode, parsed.data.username);
  if (!user) {
    await addSystemLog({
      traceId,
      level: "warn",
      source: "auth.session",
      message: "Email verification failed.",
      userEmail: email,
      payload: {},
      redacted: getAppMode() === "release"
    });
    return context.json(
      buildError(traceId, "invalid_verification_code", "Email verification code is invalid or expired."),
      401
    );
  }

  await addSystemLog({
    traceId,
    level: "info",
    source: "auth.session",
    message: "User logged in.",
    userEmail: user.email,
    payload: { role: user.role },
    redacted: getAppMode() === "release"
  });

  return context.json(
    demoAuthSessionResponseSchema.parse({
      traceId,
      session: {
        email,
        username: user.username,
        role: user.role,
        ...(user.role === "admin" ? { adminToken: createAdminSessionToken(user.email) } : {})
      }
    })
  );
});

app.get("/api/demo/admin/users", async (context) => {
  const traceId = getTraceId(context);
  context.header("X-Trace-Id", traceId);
  const adminError = await requireAdmin(context, traceId);
  if (adminError) {
    return adminError;
  }

  await addSystemLog({
    traceId,
    level: "info",
    source: "admin.users",
    message: "Admin listed users.",
    payload: {},
    redacted: getAppMode() === "release"
  });
  return context.json(demoAdminUsersResponseSchema.parse({ traceId, users: await getUsers() }));
});

app.get("/api/demo/admin/logs", async (context) => {
  const traceId = getTraceId(context);
  context.header("X-Trace-Id", traceId);
  const adminError = await requireAdmin(context, traceId);
  if (adminError) {
    return adminError;
  }

  return context.json(demoAdminLogsResponseSchema.parse({ traceId, logs: await getSystemLogs() }));
});

app.post("/api/demo/japan-trip/decision-flow", async (context) => {
  const traceId = getTraceId(context);
  context.header("X-Trace-Id", traceId);

  if (process.env.REAL_PAYMENTS_ENABLED === "true") {
    await addSystemLog({
      traceId,
      level: "error",
      source: "payment.guard",
      message: "Real payment mode refused.",
      payload: {},
      redacted: getAppMode() === "release"
    });
    return context.json(
      buildError(
        traceId,
        "real_payments_disabled",
        "The Japan Trip demo is mock-only and refuses real payment mode."
      ),
      503
    );
  }

  const body = await context.req.json().catch(() => ({}));
  const parsed = demoDecisionFlowRequestSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      buildError(
        traceId,
        "invalid_request",
        "Request body does not match the demo decision-flow contract.",
        parsed.error.issues.map((issue) => issue.message)
      ),
      400
    );
  }

  const mode = getAppMode();
  const variant = getJapanTripScenarioVariant(parsed.data.variant);
  const response = buildDemoDecisionFlow(
    variant.scenario,
    traceId,
    variant.fitCheckOverride,
    mode
  );

  if (!isAdminRequest(context)) {
    response.debug = undefined;
  }

  await addSystemLog({
    traceId,
    level: "info",
    source: "decision.flow",
    message: "Decision flow completed.",
    userEmail: null,
    payload: { decision: response.decision.decision, variant: parsed.data.variant },
    redacted: mode === "release"
  });
  return context.json(response);
});

app.post("/api/demo/japan-trip/interactive-decision", async (context) => {
  const traceId = getTraceId(context);
  context.header("X-Trace-Id", traceId);

  if (process.env.REAL_PAYMENTS_ENABLED === "true") {
    return context.json(
      buildError(
        traceId,
        "real_payments_disabled",
        "The Japan Trip demo is mock-only and refuses real payment mode."
      ),
      503
    );
  }

  const body = await context.req.json().catch(() => ({}));
  const parsed = demoInteractiveDecisionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      buildError(
        traceId,
        "invalid_request",
        "Request body does not match the interactive decision contract.",
        parsed.error.issues.map((issue) => issue.message)
      ),
      400
    );
  }

  const mode = getAppMode();
  const variant = getJapanTripScenarioVariant("allow");
  const mockMcp = getJapanTripMockMcpContext(variant.scenario, traceId);
  const interaction = await analyzeInteractionWithOptionalDeepSeek({
    message: parsed.data.message,
    scenario: variant.scenario,
    mockMcp,
    mode
  });
  const flow = buildDemoDecisionFlow(
    variant.scenario,
    traceId,
    interaction.analysis.fitCheck,
    mode
  );

  const isAdmin = isAdminRequest(context);
  if (!isAdmin) {
    flow.debug = undefined;
  }

  await addSystemLog({
    traceId,
    level: "info",
    source: "decision.interactive",
    message: "Interactive decision completed.",
    userEmail: parsed.data.email,
    payload: {
      decision: flow.decision.decision,
      fitCheck: flow.fitCheck.fitCheck,
      llmProvider: interaction.llm.provider
    },
    redacted: mode === "release"
  });

  return context.json(
    demoInteractiveDecisionResponseSchema.parse({
      ...flow,
      interaction: {
        email: parsed.data.email,
        message: parsed.data.message,
        summary: interaction.analysis.userFacingSummary,
        ...(isAdmin
          ? {
              analysis: interaction.analysis,
              llm: interaction.llm
            }
          : {})
      }
    })
  );
});

export default app;
