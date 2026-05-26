import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { getJapanTripScenarioVariant } from "@smartpay/mock-data";
import { buildDemoDecisionFlow } from "@smartpay/rules";
import {
  demoDecisionFlowRequestSchema,
  errorResponseSchema,
  type AppMode,
  type ErrorResponse
} from "@smartpay/contracts";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: ["http://localhost:3000"],
    allowHeaders: ["Content-Type", "Idempotency-Key", "X-Trace-Id"],
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
    realPaymentsEnabled: false,
    traceId: getTraceId(context)
  })
);

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

  return context.json(
    buildDemoDecisionFlow(variant.scenario, traceId, variant.fitCheckOverride, mode)
  );
});

export default app;
