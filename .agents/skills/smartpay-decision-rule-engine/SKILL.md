---
name: smartpay-decision-rule-engine
description: Use when changing authorization hard rules, AI fit check composition, or final allow/ask/deny behavior.
---

Decision workflow:
1. Keep deterministic authorization checks in `packages/rules`.
2. Cover authorization existence, expiry, category, single amount, total amount, frequency, and execution mode.
3. Hard rule failure always returns `deny`.
4. AI fit check `pass` may contribute to `allow` only when hard rules pass and amount policy allows auto execution.
5. AI fit check `caution` returns `ask`.
6. AI fit check `fail`, malformed output, timeout, or missing data returns `ask` or `deny`; never `allow`.
7. Add tests for all three final decisions.
