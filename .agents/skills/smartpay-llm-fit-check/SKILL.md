---
name: smartpay-llm-fit-check
description: Use when changing profile analysis, OpenAI calls, structured outputs, prompts, or AI fit check fallback behavior.
---

LLM workflow:
1. Use current OpenAI docs when changing model calls or structured output behavior.
2. Return structured JSON only; fit checks must be `pass`, `caution`, or `fail`.
3. Keep prompts free of secrets and minimize PII.
4. Do not expose raw prompts or raw financial details in release mode.
5. Add timeout, schema validation, and fail-closed fallback.
6. Treat LLM output as context for the rule engine, not authorization.
