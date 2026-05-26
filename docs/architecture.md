# SmartPay Architecture

## Shape

SmartPay uses an API-first TypeScript monorepo:

- `apps/api`: Hono API deployable to Vercel.
- `apps/web`: Next.js demo client.
- `apps/mobile`: Expo shell for iOS and Android.
- `apps/wechat-miniapp`: Taro shell for WeChat miniapp.
- `packages/contracts`: Zod and OpenAPI contracts shared by every client.
- `packages/domain`: domain-level constants and shared types.
- `packages/rules`: deterministic authorization and decision composition.
- `packages/db`: Drizzle schema and future repository layer.
- `packages/mock-data`: deterministic demo fixtures.

## Product Boundary

The product is not a recommendation engine. It decides whether a consumption request should be
executed, confirmed by the user, or blocked:

1. Authorization hard rules.
2. AI fit check as structured context.
3. Decision engine composition.
4. Mock order and payment execution.

LLM output is never direct authorization. Hard rule failures always produce `deny`; LLM failure or
uncertainty fails closed to `ask` or `deny`.

## Interaction Layer

The web demo starts with a local-only email session and then presents a chat surface asking what the
user wants to do today. The chat layer is an input collection and fit-check analysis layer, not a
recommendation engine:

- Email login is demo state stored in the browser; there is no real identity provider yet.
- The user page only shows the public consumption decision flow.
- The `/admin` page requires the local demo admin account and is the only UI surface for structured
  analysis, LLM status, event traces, fixture controls, and debug rules.
- User messages are sent to `POST /api/demo/japan-trip/interactive-decision`.
- The API may use DeepSeek through a LangChain pipeline to analyze the request against the mock
  profile, goal, consumption history, and official mock quote.
- The API may return a fit check, soft risks, and user-facing rationale.
- The deterministic rule engine still produces the final `allow`, `ask`, or `deny`.
- Mock market intelligence can explain context but cannot become executable quote data.
- Mock MCP-style service outputs are deterministic fixtures until real MCP servers exist; DeepSeek
  can reason over those outputs, but it must not invent executable quote or payment data.

## Scalability

- API services stay stateless and horizontally scalable.
- Every request carries `traceId`.
- Execution APIs require idempotency keys.
- Redis is reserved for rate limits, caches, queues, and locks.
- Postgres indexes cover userId, requestId, authorizationId, traceId, and createdAt.
- `event_log` is the audit trail now and the future outbox boundary for Kafka, Redpanda, or SQS.

## Modes

- Debug mode may expose rule evaluation, mock service payloads, and internal trace.
- Debug and structured backend analysis require a matching local admin token even in debug mode.
- Release mode must redact prompts, PII, raw financial details, and internal rule details.
- `REAL_PAYMENTS_ENABLED=false` is mandatory for the demo.
