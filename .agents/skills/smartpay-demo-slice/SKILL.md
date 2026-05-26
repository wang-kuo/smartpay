---
name: smartpay-demo-slice
description: Use for every hackathon vertical slice, especially the Japan Trip demo flow from profile to feedback.
---

Demo slice workflow:
1. Start from `docs/plans/<feature>.md`.
2. Keep the first screen a usable workflow, not a landing page.
3. Implement profile, goal, authorization, official quote, market intelligence, AI fit check, final decision, mock execution, and feedback trace in one narrow path.
4. Use mock fixtures from `packages/mock-data`.
5. Verify `allow`, `ask`, and `deny` outcomes.
6. Run unit/integration tests and Playwright for UI changes.
