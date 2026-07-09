# Development

This repository uses mise to pin local runtime versions and Docker Compose for
local infrastructure services.

## First Setup

Install mise, then run the repository setup command:

```sh
mise x -- pnpm setup
```

The setup command:

- installs pinned mise runtimes
- creates `.env` from `.env.example` when `.env` does not already exist
- installs pnpm workspace dependencies
- starts PostgreSQL and Redis with Docker Compose
- installs Phoenix API Mix dependencies and prepares the API database

Default local ports are:

- API: `4100`
- web: `3100`
- PostgreSQL: `15432`
- Redis: `16379`

## Daily Commands

```sh
pnpm docker:up
pnpm dev:all
pnpm api:setup
pnpm api
pnpm check
pnpm build
pnpm web
pnpm storybook
```

Use `pnpm docker:down` to stop local services without deleting volumes. Use
`pnpm docker:clean` only when you intentionally want to delete local service
data.

If another local process already uses one of those ports, update the matching
port in `.env`, then restart services with `pnpm docker:down` and
`pnpm docker:up`. API tests load `.env` through the Nx test target.

## Runtime Versions

Runtime versions are pinned in `.mise.toml`:

- Node.js 24.18.0
- pnpm 11.7.0
- Erlang/OTP 29.0.3
- Elixir 1.20.2 for OTP 29

`.nvmrc` remains available as a Node-only fallback, but mise is the preferred
setup path for full-stack development.
