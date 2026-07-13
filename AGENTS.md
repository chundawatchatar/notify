# Notify Agent Guide

This file is the general AI context for the Notify repository. Read it before
making changes. Keep it concise and update the linked docs when behavior,
architecture, product modules, migrations, or frontend conventions change.

## Project Overview

Notify is a notification SaaS monorepo for plug-and-play notification
infrastructure. It currently contains a Phoenix API, a TanStack Start dashboard,
an Astro marketing site, shared React UI packages, and a framework-free Elixir
domain library.

## Workspace Map

- `apps/api`: Phoenix API-only backend. Owns `Api.Repo`, Ecto migrations,
  seeds, and HTTP routes.
- `apps/web`: TanStack Start dashboard app. Product UI after login.
- `apps/marketing`: Astro marketing website. Public product, pricing, platform,
  developer, and security pages.
- `apps/storybook`: Storybook for shared UI previews.
- `libs/domain`: framework-free Elixir business domain library.
- `libs/open_api`: framework-free Elixir OpenAPI schema library.
- `packages/ui`: shared React UI components and primitives.
- `packages/openapi`: generated backend OpenAPI JSON contract.
- `packages/api-client`: generated TypeScript API contract types from the
  OpenAPI package.
- `packages/styles`: shared Tailwind theme and base styles.
- `packages/common`: shared TypeScript domain contracts.
- `docs`: project architecture and implementation guidance.

## Read Next

- `docs/architecture.md`: service boundaries and repo architecture.
- `docs/frontend.md`: dashboard, marketing, shared UI, and frontend rules.
- `docs/product-map.md`: product modules and intended flows.
- `docs/database.md`: database ownership, migrations, and safety rules.
- `docs/development.md`: local setup and runtime versions.
- `docs/operations.md`: releases, health probes, metrics, and Kubernetes deployment.

## Core Rules

- Prefer existing patterns before adding new abstractions.
- Keep database access and Ecto schemas in `apps/api`.
- Keep pure business rules in `libs/domain` when they do not require Phoenix or
  Ecto.
- Use `@notify/ui` components before creating app-local UI.
- Add reusable frontend primitives to `packages/ui`; keep page-specific layouts
  inside the owning app.
- For forms in the web app, use TanStack Form and Zod.
- For server state in the web app, use TanStack Query.
- Do not hand-roll routes by editing `routeTree.gen.ts`; let TanStack Router
  generate it.
- Do not run migrations automatically from API pod boot. Use an explicit
  deployment job.
- Do not introduce a separate migration package unless database ownership
  changes across multiple backend applications.

## Commands

Use focused checks when possible:

```sh
pnpm format:all
pnpm --filter @notify/web typecheck
pnpm --filter @notify/web build
pnpm --filter @notify/marketing build
pnpm --filter @notify/ui test
pnpm api-client:generate
pnpm api:test
pnpm api:release
pnpm api:image
pnpm domain:test
```

Broader checks:

```sh
pnpm check
pnpm build
pnpm test
pnpm typecheck:all
pnpm lint:all
```

Local services:

```sh
pnpm docker:up
pnpm docker:down
pnpm dev:all
pnpm api
pnpm web
pnpm marketing
```

## Implementation Order

For product features, prefer this order:

1. Update docs when changing architecture, product behavior, API contracts, or
   database shape.
2. Add or update domain rules in `libs/domain` when pure business logic exists.
3. Add migrations, Ecto schemas, and API code in `apps/api`.
4. Add web UI and data hooks in `apps/web`.
5. Add or reuse UI primitives in `packages/ui` only when shared.
6. Add focused tests.
7. Run the smallest relevant verification commands and report them.

## Git And Generated Files

- Never revert user changes unless explicitly asked.
- Check `git status --short` before staging or committing.
- Commit generated route updates when route files change.
- Keep unrelated changes out of commits.
