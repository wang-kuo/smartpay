# Admin Logs And Email Auth

## Goal

Add a mock-only admin/debug surface for system logs, runtime errors, invite requests, and email-code login.

## Contracts

- `POST /api/demo/invites/request`
- `POST /api/demo/auth/email-code/request`
- `POST /api/demo/auth/session`
- `GET /api/demo/admin/users`
- `GET /api/demo/admin/logs`

All responses carry `traceId`. Admin-only endpoints require `X-Demo-Admin-Token`.

## Acceptance Criteria

- Users are keyed by email and can update their display username after first login.
- `wangkuo0606@gmail.com` exists as an admin-capable seeded user.
- Every login uses an email verification code in the demo API.
- Invite request creates a pending user row and returns a mock invite code in debug mode only.
- Admin can inspect users and runtime/system logs.
- Runtime errors and important API events are captured in a log list with trace IDs.

## Tests

- Contract and API tests for invite, email-code login, admin users, and admin logs.
- Existing Japan Trip decision-flow tests continue to pass.
- Web typecheck and e2e smoke remain valid for public/admin flows.

## Out Of Scope

- Real email delivery.
- Real identity provider integration.
- Real payments or wallet/merchant credentials.
