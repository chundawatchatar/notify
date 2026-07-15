# Notify Agent Guide

This file is the general AI context for the Notify repository. Read it before
making changes. Keep it concise and update the linked docs when behavior,
architecture, product modules, migrations, or frontend conventions change.

## Global Working Rules

- Do not use em dashes in prose. Use a hyphen instead.
- Always use a single-line commit message.
- Do not run tests unless the user explicitly asks.
- Do not start or run an application unless the user explicitly asks.
- Do not inspect or test a live application in a browser unless the user explicitly asks.
- Do not commit changes unless the user explicitly asks.

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
- `docs/authentication.md`: access tokens, refresh rotation, browser security,
  and session revocation.
- `docs/frontend.md`: dashboard, marketing, shared UI, and frontend rules.
- `docs/product-map.md`: product modules and intended flows.
- `docs/database.md`: database ownership, migrations, and safety rules.
- `docs/development.md`: local setup and runtime versions.
- `docs/operations.md`: releases, health probes, metrics, and Kubernetes deployment.

## Universal AI Playbooks

Project playbooks use plain Markdown and YAML under `.agents/skills`; they do
not require a vendor-specific agent or manifest. When a task matches a
repeatable workflow, read `.agents/skills/index.yaml` and load only the smallest
matching playbook set. An agent without native skill discovery must open the
selected `SKILL.md` files directly. Follow recipe order for cross-boundary work
and include `notify-verify-change` before reporting completion or committing.

Keep playbook instructions and the index current when repository ownership,
commands, generated files, or deployment policy changes.

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
- Use `notify-backend-test` and `notify-frontend-test` to keep test coverage
  risk-based. Do not mock internal application layers.
- Create persisted backend test entities through shared factories. Use Faker in
  factories for irrelevant realistic values, deterministic sequences for
  unique fields, and explicit values for the behavior under assertion.
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
pnpm db:reset
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

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
