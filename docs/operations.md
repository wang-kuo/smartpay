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

Open the user demo at `http://localhost:3000`. The demo login is email-only local browser state.
Open the local admin console at `http://localhost:3000/admin`.

## Required External Services

- GitHub repository and GitHub Actions.
- DeepSeek API key for real profile analysis and AI fit check when mocks are replaced.
- Neon Postgres for preview or hosted demo.
- Upstash Redis for rate limits, queues, and locks.
- Vercel for API and web preview deployment.
- Secrets manager through GitHub and Vercel environment variables.

## DeepSeek Key

The interactive demo can call DeepSeek from the API server only through LangChain. The browser never
receives the key.

For local development, keep secrets outside git, for example:

```bash
mkdir -p secrets
printf 'DEEPSEEK_API_KEY=your_key_here\nDEEPSEEK_MODEL=deepseek-v4-flash\nDEEPSEEK_BASE_URL=https://api.deepseek.com\n' > secrets/deepseek.env
set -a
. secrets/deepseek.env
set +a
pnpm dev
```

If `DEEPSEEK_API_KEY` is empty, times out, or returns malformed output, the API uses deterministic
fallback analysis and the decision engine still fails closed to `ask` or `deny` where appropriate.
Do not commit files under `secrets/`.

DeepSeek is used through its OpenAI-compatible chat-completions API with JSON output. LangChain uses
`@langchain/openai` with `DEEPSEEK_BASE_URL` set to `https://api.deepseek.com`.

## Demo Admin Account

The local admin account is configured through ignored secrets:

```bash
mkdir -p secrets
printf 'DEMO_ADMIN_EMAIL=admin@smartpay.local\nAUTH_SESSION_SECRET=change_me_session_secret\n' > secrets/admin.env
pnpm dev
```

Only admin sessions receive `session.adminToken`. The web admin page sends it as
`X-Demo-Admin-Token`; the API returns debug payloads, structured analysis, LLM status, and trace
details only when that signed session token is valid. Email delivery requires `SMTP_HOST` and
`SMTP_FROM` plus provider credentials when required by the SMTP server.

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
