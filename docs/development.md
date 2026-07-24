# Development

This repository uses mise to pin local runtime versions and Docker Compose for
local infrastructure services, including Mailpit for development email.

## First Setup

Install mise, then run the repository setup command:

```sh
mise x -- pnpm setup
```

The setup command:

- installs pinned mise runtimes
- creates `.env` from `.env.example` when `.env` does not already exist
- installs pnpm workspace dependencies
- starts PostgreSQL, Redis, and Mailpit with Docker Compose
- installs Phoenix API Mix dependencies and prepares the API database

Default local ports are:

- API: `4100`
- web: `3100`
- marketing: `3200`
- PostgreSQL: `15432`
- Redis: `16379`
- Mailpit SMTP: `1025`
- Mailpit inbox: `http://localhost:8025` by default

## Daily Commands

```sh
pnpm docker:up
pnpm dev:all
pnpm api:setup
pnpm db:reset
pnpm api
pnpm api:release
pnpm api:image
pnpm check
pnpm build
pnpm web
pnpm marketing
pnpm storybook
```

Use `pnpm docker:down` to stop local services without deleting volumes. Use
`pnpm docker:clean` only when you intentionally want to delete local service
data.

If another local process already uses one of those ports, update the related
values in `.env`, then restart services with `pnpm docker:down` and
`pnpm docker:up`:

- Changing `API_PORT` also requires updating `VITE_API_URL`.
- Changing `WEB_PORT` also requires updating `PUBLIC_WEB_APP_URL` and
  `CORS_ORIGINS`.
- Changing `MAILPIT_SMTP_PORT` or `MAILPIT_UI_PORT` changes the host ports for
  Mailpit. The API uses `MAILPIT_SMTP_PORT` for SMTP, so no second port setting
  is needed.

Verification, password-reset, and invitation messages are delivered to Mailpit
in development. Open `http://localhost:8025` with the default
`MAILPIT_UI_PORT`, or `http://localhost:<MAILPIT_UI_PORT>` after changing it,
to inspect them. Mailpit captures messages locally and does not send them to
real recipients.

`DATABASE_URL` is used by production releases and container migration commands.
Local development and API tests use the `POSTGRES_*` values. API tests load
`.env` through the Nx test target.

## API Test Database

Prepare and run API integration tests with the existing local PostgreSQL
container:

```sh
pnpm docker:up
pnpm api:test:setup
pnpm api:test
```

Development and test databases share one PostgreSQL container but use separate
databases. `pnpm api:test:setup` creates and migrates `notify_api_test` without
loading development seeds.

Use `Api.DataCase` for schema, changeset, query, and transaction tests. Use
`ApiWeb.ConnCase` for HTTP tests that may also access PostgreSQL. Both test
cases run each test in the SQL Sandbox, so database changes are rolled back
after every test.

Factories create test data per test. Do not use seeds to create test data. Add
an entity factory only alongside its corresponding real Ecto schema.

## Runtime Versions

Runtime versions are pinned in `.mise.toml`:

- Node.js 24.18.0
- pnpm 11.7.0
- Erlang/OTP 29.0.3
- Elixir 1.20.2 for OTP 29

`.nvmrc` remains available as a Node-only fallback, but mise is the preferred
setup path for full-stack development.

## Operational Endpoints

- `GET /api/health/live`: API process liveness.
- `GET /api/health/ready`: PostgreSQL readiness.
- `GET /metrics`: Prometheus metrics when `METRICS_ENABLED=true`.

Local metrics do not require a token. Production metrics are disabled by
default and require `METRICS_TOKEN` when enabled.
