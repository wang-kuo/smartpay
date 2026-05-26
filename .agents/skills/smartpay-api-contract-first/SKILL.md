---
name: smartpay-api-contract-first
description: Use when adding or changing SmartPay APIs, request/response schemas, OpenAPI docs, or typed clients.
---

Contract-first workflow:
1. Read the feature plan in `docs/plans`.
2. Define or update Zod schemas in `packages/contracts`.
3. Ensure every success and error response carries `traceId`.
4. Require `Idempotency-Key` for execution, order, payment, or feedback mutation APIs.
5. Update OpenAPI generation config and typed client exports.
6. Add route integration tests before frontend wiring.
7. Keep route handlers thin; call domain/rules services for decisions.
