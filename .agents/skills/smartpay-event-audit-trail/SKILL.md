---
name: smartpay-event-audit-trail
description: Use when changing event logs, trace UI, feedback records, context signals, or audit trail behavior.
---

Audit workflow:
1. Preserve traceId across API, rules, LLM, mock services, DB records, and UI trace.
2. Record key events: profile generated, goal loaded, authorization checked, quotes received, fit check completed, decision made, order created, payment simulated, feedback received, context updated.
3. Design event_log as a future outbox boundary.
4. Add indexes for traceId, userId, requestId, authorizationId, and createdAt.
5. Redact sensitive payload details in release mode.
