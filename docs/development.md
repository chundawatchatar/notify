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
- installs Phoenix API Mix dependencies
- starts PostgreSQL and Redis with Docker Compose

## Daily Commands

```sh
pnpm docker:up
pnpm check
pnpm build
pnpm web
pnpm storybook
```

Use `pnpm docker:down` to stop local services without deleting volumes. Use
`pnpm docker:clean` only when you intentionally want to delete local service
data.

## Runtime Versions

Runtime versions are pinned in `.mise.toml`:

- Node.js 24.18.0
- pnpm 11.7.0
- Erlang/OTP 29.0.3
- Elixir 1.20.2 for OTP 29

`.nvmrc` remains available as a Node-only fallback, but mise is the preferred
setup path for full-stack development.
