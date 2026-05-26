# SmartPay API

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
- `debug` in `APP_MODE=debug`

The final decision is always `allow`, `ask`, or `deny`.
In `APP_MODE=release`, debug data is omitted and event payloads are redacted.
If `REAL_PAYMENTS_ENABLED=true`, the demo endpoint refuses execution with
`real_payments_disabled` because the Japan Trip flow is mock-only.

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
