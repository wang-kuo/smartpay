# SmartPay Operations

## Local Services

Start local Postgres and Redis:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Install dependencies:

```bash
pnpm install
```

Run the web and API demo:

```bash
pnpm dev
```

## Required External Services

- GitHub repository and GitHub Actions.
- OpenAI API key for real profile analysis and AI fit check when mocks are replaced.
- Neon Postgres for preview or hosted demo.
- Upstash Redis for rate limits, queues, and locks.
- Vercel for API and web preview deployment.
- Secrets manager through GitHub and Vercel environment variables.

## Environment Modes

- Use `.env.debug.example` for local development.
- Use `.env.release.example` for preview demos.
- Keep `REAL_PAYMENTS_ENABLED=false` until a separate production readiness review.
- Keep `ALLOW_SEED_RESET=false` outside debug.

## Release Checklist

- Lint, typecheck, tests, build, and e2e pass.
- Debug trace is disabled or redacted.
- Raw prompts, secrets, PII, and financial details are not logged.
- Rate limits are strict.
- LLM timeout and schema failure fail closed.
