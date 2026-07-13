---
name: notify-web-change
description: Build or modify Notify authenticated dashboard and authentication features in apps/web. Use for TanStack routes, pages, workspace navigation, forms, Zod validation, TanStack Query data, API integration, loading or error states, responsive product UI, or dashboard interactions.
---

# Notify Web Change

Build product UI inside the dashboard while reusing shared contracts and UI
components.

## Read First

Read `AGENTS.md`, `docs/frontend.md`, and the relevant section of
`docs/product-map.md`. Inspect the nearest route, page component, shell, and API
helper.

## Workflow

1. Keep the route file small and compose page behavior from `apps/web`.
2. Add TanStack Router file routes under `apps/web/src/routes`. Never edit
   `apps/web/src/routeTree.gen.ts` manually.
3. Reuse `workspace-shell.tsx` for authenticated product navigation and the
   existing auth composition for authentication routes.
4. Search `@notify/ui` before creating a component. Keep page-specific tables,
   cards, copy, and empty states in `apps/web`.
5. Use TanStack Form with Zod for forms. Show field errors, pending state,
   success, and server failure without losing entered values.
6. Use TanStack Query for server state and mutations. Keep query keys stable and
   invalidate only affected data.
7. Type API helpers with `@notify/api-client`; do not redefine server response
   interfaces locally.
8. Provide loading, empty, error, disabled, and success states where the flow
   needs them.

## UI Guardrails

- Keep dashboard UI quiet, dense, and work-focused.
- Avoid nested cards and marketing-style hero composition.
- Use Lucide icons for standard actions and tooltips for unfamiliar icon-only
  controls.
- Keep text and controls stable without overlap at mobile and desktop widths.
- Preserve client-side navigation; do not replace router links with full-page
  reloads.

## Verify

Run:

```sh
pnpm --filter @notify/web typecheck
pnpm --filter @notify/web test
pnpm --filter @notify/web build
```

Also run `pnpm --filter @notify/ui test` when shared UI changes.
