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

## Scalability

- API services stay stateless and horizontally scalable.
- Every request carries `traceId`.
- Execution APIs require idempotency keys.
- Redis is reserved for rate limits, caches, queues, and locks.
- Postgres indexes cover userId, requestId, authorizationId, traceId, and createdAt.
- `event_log` is the audit trail now and the future outbox boundary for Kafka, Redpanda, or SQS.

## Modes

- Debug mode may expose rule evaluation, mock service payloads, and internal trace.
- Release mode must redact prompts, PII, raw financial details, and internal rule details.
- `REAL_PAYMENTS_ENABLED=false` is mandatory for the demo.
