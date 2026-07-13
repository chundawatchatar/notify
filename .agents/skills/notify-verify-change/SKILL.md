---
name: notify-verify-change
description: Select and run cost-effective verification for Notify repository changes. Use before reporting completion, committing, reviewing a diff, or when deciding which formatting, lint, typecheck, test, build, generated-contract, release, Docker, or Kubernetes checks are required.
---

# Notify Verify Change

Run the smallest check set that covers the changed behavior, then broaden when
the change crosses package or runtime boundaries.

## Start

1. Run `git status --short` and identify every owning project changed.
2. Run `git diff --check`.
3. Never revert unrelated user changes.
4. Check generated files when their source contract or routes changed.

## Check Matrix

| Change                          | Required checks                                                            |
| ------------------------------- | -------------------------------------------------------------------------- |
| Docs or agent guidance          | `pnpm format:all:check`                                                    |
| `libs/domain`                   | Author with `notify-backend-test`; run domain test and Elixir format check |
| `libs/open_api` or API contract | Author with `notify-backend-test`; run API test and contract check         |
| API implementation              | Author with `notify-backend-test`; run API test                            |
| `packages/ui`                   | Author with `notify-frontend-test`; run UI test, typecheck, and build      |
| `apps/web`                      | Author with `notify-frontend-test`; run web test, typecheck, and build     |
| `apps/marketing`                | Marketing typecheck and build; test only interactive behavior              |
| Cross-package feature           | `pnpm check`, `pnpm build`                                                 |
| Phoenix release                 | `pnpm api:release`                                                         |
| Docker runtime                  | `pnpm api:image` plus container smoke test                                 |
| Kubernetes                      | `kubectl kustomize deploy/kubernetes/base` and YAML parse                  |

Use package commands from `AGENTS.md`; do not invent alternate scripts when a
repository command exists.

## Generated Contract

When controllers, OpenAPI schemas, operation IDs, or API paths change:

```sh
pnpm api-client:generate
pnpm api-client:check
```

Never fix drift by editing generated JSON or TypeScript directly.

## Completion Rules

- Report exact checks run and whether they passed.
- State any check that could not run and why.
- Do not claim a live Kubernetes validation when only offline rendering ran.
- Do not leave required command sessions, servers, or smoke containers running.
- Keep tests out of precommit and prepush hooks unless the user changes that
  policy; run relevant tests manually before completion.
