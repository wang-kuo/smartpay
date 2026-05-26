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
- Web UI exposes a public demo email session, a user chat interaction, final `allow` / `ask` /
  `deny`, mock quote, and mock execution.
- Admin UI at `/admin` requires the local demo admin account and is the only UI surface for
  structured fit-check analysis, LLM status, event trace, debug rules, and deterministic fixture
  controls.
- Mobile and WeChat projects are configured as client shells only.

## Contracts

- Shared schemas live in `packages/contracts`.
- Main endpoint: `POST /api/demo/japan-trip/decision-flow`.
- Auth endpoint: `POST /api/demo/auth/session`.
- Interactive endpoint: `POST /api/demo/japan-trip/interactive-decision`.
- The interactive endpoint accepts a demo email and user message, optionally calls DeepSeek through
  LangChain JSON output, and returns the same decision-flow response plus `interaction.summary`.
  Full `interaction.analysis`, LLM status, and debug payloads require a matching
  `X-Demo-Admin-Token`.
- Future module APIs remain reserved for profile, goals, authorizations, quotes, fit-check,
  decision, execute, and feedback.
- Execution-like APIs must require `Idempotency-Key` when implemented beyond the demo endpoint.

## Data And Events

- Mock fixture: `packages/mock-data/scenarios/japan-trip.json`.
- Mock consumption history lives in the same fixture and is used as RAG-like context for the demo
  fit check. It is not real card, bank, or wallet data.
- Drizzle schema includes users, authorizations, consumption requests, decisions, executions, and
  event_log.
- Event log carries traceId, userId, requestId, authorizationId, event type, payload, redaction flag,
  and createdAt.

## LLM, Mock MCP, And Secrets

- The server reads `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, and `DEEPSEEK_BASE_URL`; the browser never
  receives the key.
- Default model is `deepseek-v4-flash` when `DEEPSEEK_MODEL` is empty.
- DeepSeek output is schema-validated as a fit check only. It may return `pass`, `caution`, or `fail`
  and cannot authorize spending or place orders.
- Missing key, timeout, request failure, malformed JSON, or schema failure falls back to a
  deterministic `caution`/confirmation path unless hard rules deny.
- Mock MCP-style merchant, market intelligence, and wallet outputs are deterministic fixtures. The
  LLM can analyze them as context but cannot create executable quote or payment data.
- Local secrets may live under `secrets/`, which is ignored by git.
- Demo admin secrets live in `secrets/admin.env` or equivalent environment variables and must never
  be committed.

## Tests

- Rule tests cover default `allow`, caution `ask`, hard-rule `deny`, and missing AI fail-closed.
- API tests cover deterministic decision variants, demo auth, admin-only debug, and interactive
  fallback when DeepSeek is not configured.
- Playwright covers public email session and chat, plus admin-only analysis/debug panels and
  deterministic fixture variants.
- CI order is lint, typecheck, unit/integration tests, build, then e2e.

## Out Of Scope

- Real banks, real card history, real Merchant MCP, real Wallet MCP, real payments, and real agent
  discovery.
