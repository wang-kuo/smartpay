# Multiple Terminal Rules

Use multiple terminals to increase throughput only when the workstreams are isolated and auditable.
When isolation is unclear, use one terminal and finish the current operation before starting another.

## Terminal Ownership

Each active terminal must have one clear purpose:

- `server`: long-running API, web, mobile, or e2e dev server.
- `validation`: lint, typecheck, unit tests, build, or Playwright.
- `module-worktree`: edits and tests for one branch/worktree-owned module.
- `inspect`: read-only commands such as `rg`, `git diff`, `git status`, or logs.

Record the terminal's working directory, branch or worktree, and module boundary before doing
write operations. Do not use two terminals to write to the same package, route, test file, fixture,
or documentation page at the same time.

## Git Worktrees

For parallel module generation, use separate git worktrees:

```bash
git worktree add /tmp/smartpay-worktrees/<module> -b feat/<module>
```

Rules:

- One terminal owns one worktree and one branch.
- Shared contracts are the upstream boundary. Update `packages/contracts` before dependent API or
  client work.
- Stacked worktrees must merge the latest `main` into their branch before final implementation or
  review.
- Do not commit, merge, rebase, or push concurrently from two terminals on the same branch.
- Do not resolve conflicts independently in two terminals. Pick one merge terminal and make it the
  source of truth.

## Servers And Ports

Long-running servers belong in dedicated terminals.

- Keep `pnpm dev`, API servers, Next dev servers, and Playwright web servers separate from editing
  terminals.
- Before e2e or manual QA, check that ports are not held by stale processes.
- If a stale server is found, confirm the PID and command before killing it.
- Do not reuse an old dev server after changing API routes, contracts, env loading, or frontend
  routing. Restart it so tests run against the current code.
- If a server is intentionally left running for the user, report the URL and keep no other required
  terminal session active.

## Validation

Per-worktree checks are useful, but final validation must run from the main workspace after merges:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`
5. `pnpm test:e2e` when UI or end-to-end behavior changed

If a worktree cannot run checks because dependencies or workspace links are missing, record that
limitation and run the corresponding checks from the main workspace after merging.

## Logging

For planned generation or multi-module work, update `docs/generation-log.md` with:

- terminal/worktree purpose
- branch or worktree path
- commands run
- merge order
- validation results
- known limitations or retries

Do not paste secrets, API keys, raw `.env` contents, or local token values into logs. Record secret
file names and environment variable names only.

## Safety

- Never stage `secrets/`, local `.env` files, unrelated untracked files, or generated local reports
  unless the feature explicitly owns them.
- Run `git status --short --branch` before every commit, merge, and push.
- Prefer read-only inspection commands in parallel. Keep write operations serialized unless each
  terminal owns a separate worktree.
- Avoid destructive commands. If cleanup is required, target explicit files or PIDs after confirming
  ownership.
