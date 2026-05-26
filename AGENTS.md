# SmartPay Agent Instructions

## Product Invariants

- This product is a consumption decision agent, not a recommendation engine.
- The core product flow is authorization, decision, then order/payment execution.
- Every consumption decision must end as exactly one of `allow`, `ask`, or `deny`.
- The Japan Trip demo uses mock data only and must not integrate real banks, real wallets, real merchants, or real payments.

## Decision Boundary

LLM components may:
- Analyze behavior profile data.
- Generate profile tags and avatar state.
- Produce structured AI fit checks with `pass`, `caution`, or `fail`.
- Explain soft risks and user-facing rationale.

LLM components must not:
- Authorize spending.
- Override hard rule failures.
- Place orders or payments.
- Default uncertain cases to `allow`.

The rule engine owns:
- Authorization existence and validity.
- Amount, category, frequency, and time-window checks.
- Final `allow`, `ask`, or `deny` composition.

## Demo Scope

The first vertical slice is the Japan Trip flow:
- Trip length: 5-7 days.
- Budget: S$2000-2500.
- Data: mock profile, mock goal, mock authorization, mock official quote, mock market intelligence, mock wallet result.
- Main API: `POST /api/demo/japan-trip/decision-flow`.

## Architecture Expectations

- Use an API-first TypeScript monorepo.
- Keep reusable API contracts in `packages/contracts`.
- Keep deterministic business logic in `packages/domain` and `packages/rules`.
- Keep storage concerns in `packages/db`.
- Keep mock scenario fixtures in `packages/mock-data`.
- Web, mobile, and WeChat miniapp clients must consume the shared contracts rather than re-declaring wire shapes.
- API handlers must remain stateless and carry `traceId` through logs, responses, and event records.
- Execution and payment-like endpoints must require idempotency.

## Debug And Release Modes

- `APP_MODE=debug` may show internal trace, rule evaluation, and mock service payloads.
- `APP_MODE=release` must redact prompts, PII, raw financial details, and internal rule detail.
- `REAL_PAYMENTS_ENABLED` must stay `false` until a separate production readiness review explicitly changes it.
- LLM timeout, schema failure, or uncertainty must fail closed to `ask` or `deny`.

## Development Workflow

Every feature follows:
1. Plan: update `docs/plans/<feature>.md` with goal, contracts, acceptance criteria, tests, and out-of-scope items.
2. Generate: implement the smallest vertical slice behind typed contracts.
3. Review/test: run lint, typecheck, unit/integration tests, and Playwright when UI behavior changes.

## Multiple Terminal Rules

- Use multiple terminals only for independent workstreams: one terminal per long-running server,
  validation command, or isolated module worktree.
- Give every terminal a clear ownership boundary: working directory, branch/worktree, module, and
  purpose.
- Do not edit the same file or package from two terminals at the same time. If ownership overlaps,
  stop one terminal and synchronize through git first.
- Use separate git worktrees for parallel module generation. Do not run concurrent commits, merges,
  rebases, or pushes from the same branch.
- Keep long-running dev servers in dedicated terminals. Before Playwright or manual QA, confirm no
  stale server is occupying the expected port.
- Before merging or pushing, run `git status --short --branch`, verify no secrets or unrelated
  untracked files are staged, and run final validation from the main workspace.
- Record multi-terminal generation, merge, and test activity in `docs/generation-log.md` when it is
  part of a planned feature build.
- See `docs/multiple-terminal-rules.md` for the detailed operating rules.

## Commands

- `pnpm install`
- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm db:migrate`
- `pnpm db:seed`

## Git Rules

- Never commit secrets or local `.env` files.
- Use feature branches named `feat/<short-name>`.
- Use conventional commits.
- Keep PRs focused and reviewable.
