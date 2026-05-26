# Feature Workflow

## Plan

1. Create or update `docs/plans/<feature>.md`.
2. State the user outcome, API contracts, data changes, event log entries, tests, and out-of-scope
   items.
3. Run the `smartpay-product-guardian` skill before changing product behavior.

## Generate

1. Update `packages/contracts` first.
2. Implement domain and rule logic in `packages/domain` and `packages/rules`.
3. Add storage in `packages/db` only when persistence is required.
4. Wire `apps/api` after contracts and rules exist.
5. Wire clients only through shared contracts.
6. When using multiple terminals, follow `docs/multiple-terminal-rules.md`: one terminal per
   isolated server, validation command, or module worktree.

## Review/Test

1. Run `pnpm lint`.
2. Run `pnpm typecheck`.
3. Run `pnpm test`.
4. Run `pnpm test:e2e` when UI or end-to-end behavior changes.
5. Review debug/release mode behavior before merging.
6. If parallel worktrees or multiple terminals were used, record generation, merge, retry, and test
   results in `docs/generation-log.md`.

## Adding A New Feature

Use this sequence:

```text
define-goal -> smartpay-product-guardian -> smartpay-api-contract-first
  -> domain/rules implementation -> app wiring -> tests -> QA/security review
```

Keep new work behind one narrow vertical slice. Do not add real payment or bank integrations inside
ordinary feature work.
