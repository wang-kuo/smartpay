# SmartPay API

## Main Demo Endpoint

`POST /api/demo/japan-trip/decision-flow`

Request:

```json
{
  "userId": "user_001",
  "scenario": "japan_trip",
  "request": "Plan and book a Japan trip for 5-7 days within S$2000-2500."
}
```

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
- `debug`

The final decision is always `allow`, `ask`, or `deny`.

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
