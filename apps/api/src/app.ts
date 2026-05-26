import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { getJapanTripScenarioVariant } from "@smartpay/mock-data";
import { buildDemoDecisionFlow } from "@smartpay/rules";
import {
  demoAuthSessionRequestSchema,
  demoAuthSessionResponseSchema,
  demoDecisionFlowRequestSchema,
  demoInteractiveDecisionRequestSchema,
  demoInteractiveDecisionResponseSchema,
  errorResponseSchema,
  type AppMode,
  type ErrorResponse
} from "@smartpay/contracts";
import { analyzeInteractionWithOptionalDeepSeek } from "./llm";
import { getJapanTripMockMcpContext } from "./mock-mcp";
import { ADMIN_TOKEN_HEADER, getDemoAdminToken, isAdminCredentials, isAdminRequest } from "./auth";
import { getSecret } from "./secrets";

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
  if (isAdminCredentials(email, parsed.data.password)) {
    const adminToken = getDemoAdminToken();
    if (!adminToken) {
      return context.json(
        buildError(traceId, "admin_not_configured", "Demo admin credentials are not configured."),
        503
      );
    }

    return context.json(
      demoAuthSessionResponseSchema.parse({
        traceId,
        session: {
          email,
          role: "admin",
          adminToken
        }
      })
    );
  }

  if (parsed.data.password) {
    return context.json(
      buildError(traceId, "invalid_credentials", "Admin email or password is incorrect."),
      401
    );
  }

  return context.json(
    demoAuthSessionResponseSchema.parse({
      traceId,
      session: {
        email,
        role: "user"
      }
    })
  );
});

app.post("/api/demo/japan-trip/decision-flow", async (context) => {
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
