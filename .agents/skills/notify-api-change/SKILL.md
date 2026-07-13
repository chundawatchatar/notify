---
name: notify-api-change
description: Implement or change Notify Phoenix HTTP endpoints and their type-safe OpenAPI contracts. Use for API routes, controllers, request or response schemas, operation IDs, status codes, JSON errors, OpenAPI generation, generated TypeScript API types, or frontend API helpers.
---

# Notify API Change

Keep the Phoenix behavior, OpenAPI contract, generated client types, and tests in sync.

## Read First

Read `AGENTS.md` and `docs/architecture.md`. Read `docs/frontend.md` when a web
consumer changes. Inspect a nearby controller, route, schema, and test before
editing.

## Ownership

- Put routes, controllers, operation specs, and HTTP behavior in `apps/api`.
- Put reusable OpenAPI schema modules in `libs/open_api`.
- Treat `packages/openapi/openapi.json` and
  `packages/api-client/src/generated/schema.ts` as generated output.
- Keep Ecto and Repo access out of `libs/open_api`.

## Workflow

1. Define the endpoint method, path, success status, failure statuses, and
   request/response shapes before coding.
2. Load `notify-database-change` before continuing when the endpoint introduces
   or changes persistence. Load `notify-domain-change` when it introduces a
   reusable pure business rule.
3. Add or update shared schemas in `libs/open_api`.
4. Add a unique `operation_id` and complete response specs in the controller.
5. Add the route to the existing appropriate router scope and pipeline.
6. Return stable client-safe errors. Log internal exceptions; do not expose
   stack traces, database messages, or secrets.
7. Load `notify-backend-test` and add the smallest tests justified by the
   behavior. Update the OpenAPI test when routes or schemas change.
8. Run `pnpm api-client:generate`. Never hand-edit either generated contract.
9. Update frontend helpers to import response/request types from
   `@notify/api-client`.

## Guardrails

- Preserve existing paths unless the request explicitly allows a breaking
  contract change.
- Keep liveness independent of external dependencies; put dependency checks in
  readiness.
- Enforce authentication and workspace scope before accessing tenant data.
- Keep operational-only endpoints such as internal metrics out of the public
  contract unless clients need them.

## Verify

Run:

```sh
pnpm api:test
pnpm api-client:check
pnpm elixir:lint
git diff --check
```

Also run `pnpm --filter @notify/web typecheck` when a web consumer changes.
The API is an Nx/Mix project, not a pnpm workspace package: do not use
`pnpm --filter @notify/api`. Do not prefix Git commands with `pnpm`.
