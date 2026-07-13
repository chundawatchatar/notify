# Frontend

This document defines frontend conventions for the dashboard, marketing site,
and shared UI package.

## Applications

- `apps/web`: TanStack Start dashboard app for authenticated users.
- `apps/marketing`: Astro public marketing website.
- `packages/openapi`: generated OpenAPI JSON contract from the backend.
- `packages/api-client`: generated TypeScript API contract types from the
  OpenAPI package.
- `packages/ui`: shared React UI component library.
- `packages/styles`: shared Tailwind theme and tokens.

## Dashboard App

Use TanStack Router file routes in `apps/web/src/routes`. Do not edit
`apps/web/src/routeTree.gen.ts` by hand; it is generated.

Current main routes:

- `/auth`
- `/auth/login`
- `/auth/signup`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/dashboard`
- `/apps`
- `/ingress`
- `/analytics`
- `/subscription`
- `/security`
- `/settings`
- `/404`

Shared dashboard layout lives in:

```text
apps/web/src/components/workspace-shell.tsx
```

Domain page content lives in:

```text
apps/web/src/components/workspace-section-page.tsx
```

## Forms And Data

- Use TanStack Form for form state.
- Use Zod for validation schemas.
- Use TanStack Query for server state, mutations, loading, and cache behavior.
- Use `@notify/api-client` generated types for API request and response shapes.
- Keep API request helpers separate from presentational components when real
  API wiring is added.

## API Type Safety

The backend OpenAPI spec is generated from Phoenix controller specs and shared
Elixir schemas in `libs/open_api`:

```sh
pnpm api:openapi
```

The frontend contract package is regenerated from that spec:

```sh
pnpm api-client:generate
```

Generated OpenAPI JSON lives in:

```text
packages/openapi/openapi.json
```

Generated TypeScript lives in:

```text
packages/api-client/src/generated/schema.ts
```

Do not edit generated schema files by hand. Update Phoenix OpenAPI schemas and
operations first, regenerate the spec, then regenerate the TypeScript types.
`pnpm api-client:check` verifies that both generated contract files are current.

Browser API calls use `VITE_API_URL`, which defaults to `http://localhost:4100`.
The API accepts the local dashboard origin by default. Set `CORS_ORIGINS` to a
comma-separated allowlist for deployed browser origins; wildcard origins are not
allowed for authenticated routes.

## Shared UI

Use `@notify/ui` before creating app-local components. Add a component to
`packages/ui` when it is reusable across apps or belongs to the design system.

Keep these app-local:

- page layouts
- domain tables
- product-specific cards
- copy and page-specific empty states

Move these to `packages/ui` when they repeat:

- generic primitives
- dialogs, dropdowns, inputs, toggles, tables
- shell/navigation primitives
- reusable data display components

Shared UI exports live in:

```text
packages/ui/src/index.ts
```

## Visual Conventions

- Prefer quiet SaaS/product UI over marketing-style cards in the dashboard.
- Use icons from `lucide-react` when a standard icon exists.
- Avoid nested cards.
- Keep cards for repeated items, modals, and framed tools.
- Use stable dimensions for nav, toolbar, and control elements.
- Ensure text does not overlap or overflow on mobile and desktop.
- Use the shared `Switch` component for toggle behavior.

## Marketing Site

Marketing pages are Astro routes that render React components. Keep the shared
header/footer consistent through:

```text
apps/marketing/src/components/MarketingShell.tsx
```

Marketing should link to dashboard auth routes through the configured web app
URL instead of duplicating auth UI.

## Verification

Common frontend checks:

```sh
pnpm format:all
pnpm --filter @notify/web typecheck
pnpm --filter @notify/web build
pnpm --filter @notify/marketing build
pnpm --filter @notify/ui test
```
