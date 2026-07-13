# Notify

Notify is a notification SaaS monorepo intended to provide plug-and-play
notification infrastructure for early-stage web products.

## Workspace

This repository uses pnpm workspaces and Nx in package-based mode. Apps and
packages own their own `package.json` files, and Nx discovers targets from those
package manifests instead of owning the project layout. Shared third-party
versions are controlled from the pnpm catalog in `pnpm-workspace.yaml`.

```text
apps/      Product apps, dashboards, API workspaces, and web entry points.
libs/      Shared Elixir libraries.
packages/  Shared TypeScript libraries and reusable frontend building blocks.
tools/     Internal scripts and development utilities.
spec/      Implementation specs.
```

## Developer Setup

mise is the preferred way to install this repository's runtime toolchain. For
full setup instructions, see `docs/development.md`.

```sh
mise x -- pnpm setup
```

The setup command installs pinned runtimes, creates `.env` from `.env.example`
when needed, installs dependencies, and starts local PostgreSQL and Redis.

Default local ports are API `4100`, web `3100`, marketing `3200`, PostgreSQL
`15432`, and Redis `16379`.

## Commands

```sh
pnpm install
pnpm dev:all
pnpm check
pnpm build
pnpm test
pnpm format:all
pnpm lint:all
pnpm lint:all:fix
pnpm typecheck:all
pnpm docker:up
pnpm docker:down
pnpm api
pnpm api:deps
pnpm api:setup
pnpm api:compile
pnpm api:release
pnpm api:image
pnpm api:openapi
pnpm api:test:setup
pnpm api:test
pnpm api-client:generate
pnpm elixir:check
pnpm domain:compile
pnpm domain:test
pnpm storybook
pnpm web
pnpm marketing
pnpm nx show projects
pnpm graph
```

Prepare and run API integration tests with the existing PostgreSQL container:

```sh
pnpm docker:up
pnpm api:test:setup
pnpm api:test
```

## Local Infrastructure

Docker Compose provides local PostgreSQL and Redis services for development.
PostgreSQL is intended for core application data, while Redis is intended for
rate limiting and short-lived operational state.

```sh
pnpm docker:up
pnpm docker:logs
pnpm docker:down
```

Cassandra is deferred for now. If notification log writes outgrow PostgreSQL
partitions, it should be introduced behind a dedicated logging storage adapter
in a future spec.

## Elixir Backend

The backend structure uses a Phoenix API app plus a separate Elixir library
directory:

- `libs/domain`: framework-free domain library for notification business
  contracts.
- `libs/open_api`: framework-free OpenAPI schema library shared by the API
  contract.
- `apps/api`: Phoenix API-only backend application linked to `libs/domain`.

Redis integration and persistence adapters will be added in future specs.
Elixir and Mix are required before running the `api:*` and `domain:*` scripts.

Production API deployment uses a Phoenix release built by
`apps/api/Dockerfile`. The same immutable image runs the API server and the
explicit migration job. See `docs/operations.md` and
`docs/database-migrations.md`.

## Packages

- `@notify/common`: shared TypeScript types and interfaces for notification
  domain contracts.
- `@notify/openapi`: generated OpenAPI JSON contract from the Phoenix API.
- `@notify/api-client`: generated TypeScript API contract types from
  `@notify/openapi`.
- `@notify/ui`: shared React UI library built with Vite, Tailwind CSS,
  shadcn-compatible conventions, Radix primitives, and Vitest setup.
- `@notify/styles`: shared Tailwind CSS theme, design tokens, and base styles.
- `@notify/storybook`: Storybook app for documenting and previewing UI
  components from `@notify/ui`.
- `@notify/web`: TanStack Start frontend app for the Notify dashboard.
- `@notify/marketing`: Astro public marketing website for the apex product
  domain, sharing React UI components from `@notify/ui`.

## Project Conventions

Each future app or package should include its own `package.json` with local
scripts and an `nx.targets` section when it needs Nx-specific metadata. The root
workspace provides shared TypeScript, lint, and formatting configuration.
