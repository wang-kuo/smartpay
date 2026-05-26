# SmartPay Module Worktree Merge Rules

## Worktrees

- `feat/contracts-data` owns shared contracts, mock fixtures, and data/audit schemas.
- `feat/decision-engine` owns deterministic domain and rule composition.
- `feat/api-services` owns Hono routes, request validation, release/debug handling, and API tests.
- `feat/clients-docs` owns web/mobile/WeChat shells, docs, Playwright coverage, and generation logs.

## Merge Gate

1. Keep the product flow as authorization -> decision -> execution.
2. Keep every consumption decision as exactly one of `allow`, `ask`, or `deny`.
3. Never let an LLM or mock market-intelligence payload authorize spending.
4. Keep official executable quotes separate from market intelligence.
5. Keep Japan Trip demo data mock-only; `REAL_PAYMENTS_ENABLED` stays false.
6. Require a clean module worktree before merging, except generated logs intentionally committed by that module.
7. Merge each module into `main` with `--no-ff` so module boundaries remain auditable.
8. Stacked modules must first merge latest `main` into their worktree before implementation or final commit.
9. Resolve conflicts in favor of `packages/contracts` as the wire-shape source of truth.
10. Run validation in this order after the final merge: lint, typecheck, unit/integration tests, build, e2e.

## Module Order

1. `feat/contracts-data`
2. `feat/decision-engine`
3. `feat/api-services`
4. `feat/clients-docs`

This order keeps contracts stable before rule, API, and client generation.
