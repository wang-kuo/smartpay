# SmartPay API

## Demo Auth Endpoint

`POST /api/demo/auth/session`

Request:

```json
{
  "email": "demo@example.com",
  "verificationCode": "123456",
  "username": "Demo User"
}
```

Response:

```json
{
  "traceId": "trace_id",
  "session": {
    "email": "demo@example.com",
    "role": "user"
  }
}
```

Login uses a real emailed verification code. Admin login uses `DEMO_ADMIN_EMAIL` from local secrets
or environment variables. Admin responses include a signed `session.adminToken`; clients send that
token as `X-Demo-Admin-Token` to unlock admin-only debug and analysis fields.

## Main Demo Endpoint

`POST /api/demo/japan-trip/decision-flow`

Request:

```json
{
  "userId": "user_001",
  "scenario": "japan_trip",
  "variant": "allow",
  "request": "Plan and book a Japan trip for 5-7 days within S$2000-2500."
}
```

`variant` can be `allow`, `ask`, `deny`, or `missing_fit_check` for deterministic demo and test
coverage.

Response includes:

- `traceId`
- `profile`
- `goalContext`
- `authorization`
- `request`
- `quotes`
- `fitCheck`
- `decision`
- `execution`
- `feedbackPrompt`
- `events`
- `debug` only in `APP_MODE=debug` and only when `X-Demo-Admin-Token` is a valid admin session token

The final decision is always `allow`, `ask`, or `deny`.
In `APP_MODE=release`, debug data is omitted and event payloads are redacted.
If `REAL_PAYMENTS_ENABLED=true`, the demo endpoint refuses execution with
`real_payments_disabled` because the Japan Trip flow is mock-only.

## Interactive Demo Endpoint

`POST /api/demo/japan-trip/interactive-decision`

Request:

```json
{
  "email": "demo@example.com",
  "message": "I want to book a 6 day Japan trip under S$2500.",
  "scenario": "japan_trip",
  "conversationHistory": []
}
```

Response includes every field from the main decision-flow response plus:

- `interaction.email`
- `interaction.message`
- `interaction.summary`
- `interaction.analysis` only when `X-Demo-Admin-Token` is a valid admin session token
- `interaction.llm` only when `X-Demo-Admin-Token` is a valid admin session token

The server may use `DEEPSEEK_API_KEY` through LangChain for structured fit-check analysis. If the key
is absent, the DeepSeek call times out, or the output fails schema validation, the endpoint uses a
deterministic fallback and still returns a contract-shaped response. The LLM output is only fit-check
context; the rule engine still owns the final `allow`, `ask`, or `deny`.

## Reserved Module APIs

- `GET /api/astra/profile/:userId`
- `POST /api/astra/profile/analyze`
- `GET /api/astra/goals/:userId`
- `POST /api/astra/authorizations`
- `POST /api/astra/quotes`
- `POST /api/astra/fit-check`
- `POST /api/astra/decision`
- `POST /api/astra/execute`
- `POST /api/astra/feedback`

Execution, order, payment, and feedback mutation endpoints must include `Idempotency-Key`.

## Error Shape

All errors should include:

```json
{
  "traceId": "trace_id",
  "error": {
    "code": "invalid_request",
    "message": "Human readable message."
  }
}
```
