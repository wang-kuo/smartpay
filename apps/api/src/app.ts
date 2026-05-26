import { Hono } from "hono";
import { cors } from "hono/cors";
import { japanTripScenario } from "@smartpay/mock-data";
import { buildDemoDecisionFlow } from "@smartpay/rules";
import { demoDecisionFlowRequestSchema, type AppMode } from "@smartpay/contracts";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: ["http://localhost:3000"],
    allowHeaders: ["Content-Type", "Idempotency-Key", "X-Trace-Id"],
    allowMethods: ["GET", "POST", "OPTIONS"]
  })
);

app.get("/api/health", (context) =>
  context.json({
    ok: true,
    service: "smartpay-api",
    traceId: context.req.header("X-Trace-Id") ?? crypto.randomUUID()
  })
);

app.post("/api/demo/japan-trip/decision-flow", async (context) => {
  const traceId = context.req.header("X-Trace-Id") ?? crypto.randomUUID();
  const body = await context.req.json().catch(() => ({}));
  const parsed = demoDecisionFlowRequestSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        traceId,
        error: {
          code: "invalid_request",
          message: "Request body does not match the demo decision-flow contract."
        }
      },
      400
    );
  }

  const mode: AppMode = process.env.APP_MODE === "release" ? "release" : "debug";

  return context.json(buildDemoDecisionFlow(japanTripScenario, traceId, undefined, mode));
});

export default app;
