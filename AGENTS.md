# Notify Agent Guide

This file is the general AI context for the Notify repository. Read it before
making changes. Keep it concise and update the linked docs when behavior,
architecture, product modules, migrations, or frontend conventions change.

## Global Working Rules

- Keep answers short and direct. Use technical prose only.
- Avoid fluff or cheerful filler text.
- Answer the user's question before making edits or running implementation commands when they ask a question.
- When responding to user feedback or an analysis, explicitly say whether you agree or disagree before describing changes.
- Do not use em dashes in prose. Use a hyphen instead.
- Do not use emojis in commits, issues, pull requests, comments, or code.
- Always use a single-line commit message.
- Do not run tests during implementation. For an assigned implementation
  ticket, run the smallest relevant test suites once implementation is complete
  and before staging, committing, or pushing.
- Do not start or run an application unless the user explicitly asks.
- Do not inspect or test a live application in a browser unless the user explicitly asks.
- Starting or resuming a named implementation ticket authorizes its final
  tests, staging ticket files, task-scoped commits, push, review-ready pull
  request, Linear link, and In Review transition. Outside that workflow, do not
  commit, push, open a pull request, or mutate Linear unless the user explicitly
  asks.
- On resume, inspect the ticket's Git, GitHub, and Linear state and continue
  only from the first incomplete step. Do not repeat an existing commit, push,
  pull request, Linear link, or status transition.

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
- `docs/ticket-delivery.md`: required Linear ticket lifecycle, authorization
  gates, review, merge, and worktree cleanup.
- `docs/operations.md`: releases, health probes, metrics, and Kubernetes deployment.
- `docs/github-workflow.md`: GitHub checks, merge queue, release, and hotfix flow.

## Universal AI Playbooks

Project playbooks use plain Markdown and YAML under `.agents/skills`; they do
not require a vendor-specific agent or manifest. When a task matches a
repeatable workflow, read `.agents/skills/index.yaml` and load only the smallest
matching playbook set. An agent without native skill discovery must open the
selected `SKILL.md` files directly. Start assigned Linear implementation tickets
with `notify-ticket-delivery`, follow recipe order for task-specific work, and
include `notify-verify-change` before reporting completion or committing.

Keep playbook instructions and the index current when repository ownership,
commands, generated files, or deployment policy changes.

## Core Rules

- Prefer existing patterns before adding new abstractions.
- Read files in full before broad changes, before editing files you have not
  fully inspected, and when asked to investigate or audit.
- Keep database access and Ecto schemas in `apps/api`.
- Keep pure business rules in `libs/domain` when they do not require Phoenix or
  Ecto.
- Use `@notify/ui` components before creating app-local UI.
- Add reusable frontend primitives to `packages/ui`; keep page-specific layouts
  inside the owning app.
- For forms in the web app, use TanStack Form and Zod.
- For server state in the web app, use TanStack Query.
- Avoid `any` unless it is clearly necessary.
- Check dependency types and upstream APIs before guessing local type shapes.
- Prefer top-level imports. Do not add inline `await import()` or dynamic type
  imports unless the user asks for that pattern or the file already depends on it.
- For TypeScript checked by the repo root config, use erasable syntax only. Do
  not introduce constructs that require JavaScript emit transforms such as
  parameter properties, `enum`, `namespace`, `module`, `import =`, or `export =`.
- Inline single-use helpers when that keeps the code clearer than adding a named
  abstraction.
- Ask before removing functionality or code that appears intentional.
- Preserve existing API, data, and user-facing behavior by default. Only make
  breaking changes when the user explicitly requests them or approves them.
- Do not add new compatibility shims unless they are necessary for an approved
  compatibility requirement.
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

When running project tasks, prefer `pnpm nx ...` where an Nx target exists.
Use focused checks first and avoid broad commands unless the task justifies them.

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
- Before starting a new assigned ticket, fast-forward local `develop` from
  `origin/develop`, then create a new dedicated ticket branch and worktree from
  that refreshed base. Resume only the same ticket's existing worktree.
- Only stage and commit files changed in the current task. Stage explicit paths.
- Check `git status --short` before staging or committing.
- Use Angular Conventional Commit subjects: `<type>(<scope>): <imperative summary>`.
  Keep every commit message to one line, without a trailing period.
- Before opening a pull request, inspect the final diff and verify the target
  branch. Use `develop` unless the task specifies another target.
- Commit generated route updates when route files change.
- Keep unrelated changes out of commits.
- Never use `git add -A`, `git add .`, `git stash`, `git clean -fd`,
  `git reset --hard`, `git checkout .`, or `git commit --no-verify`.
- If rebasing or resolving conflicts, only resolve conflicts in files changed in
  the current task. If a conflict is in an unrelated file, stop and ask the user.

## Dependencies And Generated Files

- Treat dependency and lockfile changes as reviewed code.
- Prefer install commands that skip lifecycle scripts unless the user explicitly
  asks to run them.
- Do not edit generated files directly when the source generator script or
  contract definition is available. Update the source and regenerate instead.

## Issues And Pull Requests

- Do not switch branches or check out a pull request unless the user explicitly asks.
- For pull request review, prefer read-only inspection with `gh pr view`,
  `gh pr diff`, `gh api`, `git show`, and `git diff` against fetched refs.
- Follow `docs/github-workflow.md` for merge, queue, hotfix, and release expectations.

## User Override

- If the user's instructions conflict with this document, ask for explicit
  confirmation before overriding the rule.

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
