---
name: smartpay-debug-release-guard
description: Use when changing environment config, logging, debug trace, release redaction, secrets, or payment safety flags.
---

Mode guard workflow:
1. Debug mode may show rule evaluation, mock payloads, and event trace.
2. Release mode must hide raw prompts, PII, raw financial details, and internal rule internals.
3. `REAL_PAYMENTS_ENABLED` must remain `false` in demo.
4. `ALLOW_SEED_RESET` must be false outside debug mode.
5. Strict rate limiting must be enabled in release mode.
6. Never commit `.env` files or real credentials.
