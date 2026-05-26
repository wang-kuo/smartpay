# Japan Trip Decision Flow Plan

## Goal

Build the first runnable SmartPay vertical slice for a 5-7 day Japan trip with a
S$2000-2500 budget. The flow must demonstrate authorization, decision, and mock execution.

## Success Criteria

- `POST /api/demo/japan-trip/decision-flow` returns profile, goal, authorization, quotes, AI fit
  check, final decision, execution result, feedback prompt, event log, and `traceId`.
- The default mock fixture produces `allow`.
- A caution fit check produces `ask`.
- A hard rule failure produces `deny`.
- Web UI exposes the flow shell and points to the API base URL.
- Mobile and WeChat projects are configured as client shells only.

## Contracts

- Shared schemas live in `packages/contracts`.
- Main endpoint: `POST /api/demo/japan-trip/decision-flow`.
- Future module APIs remain reserved for profile, goals, authorizations, quotes, fit-check,
  decision, execute, and feedback.
- Execution-like APIs must require `Idempotency-Key` when implemented beyond the demo endpoint.

## Data And Events

- Mock fixture: `packages/mock-data/scenarios/japan-trip.json`.
- Drizzle schema includes users, authorizations, consumption requests, decisions, executions, and
  event_log.
- Event log carries traceId, userId, requestId, authorizationId, event type, payload, redaction flag,
  and createdAt.

## Tests

- Rule tests cover default `allow`, caution `ask`, hard-rule `deny`, and missing AI fail-closed.
- Playwright covers the web demo shell.
- CI order is lint, typecheck, unit/integration tests, build, then e2e.

## Out Of Scope

- Real banks, real card history, real Merchant MCP, real Wallet MCP, real payments, and real agent
  discovery.
