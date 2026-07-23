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

Use directory-owned route families. A route family's `route.tsx` owns its
shared layout behavior, guards, loaders, pending UI, error UI, and `<Outlet />`;
its `index.tsx` is the default page. For example, auth routes live under
`auth/`, with `auth/route.tsx` as the guest layout and child pages such as
`auth/login.tsx`. Apply the same convention to pathless layouts such as
`_authenticated/route.tsx` and its protected child routes. Keep standalone
routes such as `__root.tsx` and `404.tsx` at the route root.

Authentication routes remain unscoped:

- `/auth`
- `/auth/login`
- `/auth/signup`
- `/auth/verify-email`
- `/auth/forgot-password`
- `/404`

Workspace-scoped product routes use `/w/:workspaceSlug` as their canonical
prefix, with a globally unique readable workspace slug and no UUID in the URL:

| Product area      | Canonical route                  | Legacy alias during migration |
| ----------------- | -------------------------------- | ----------------------------- |
| Dashboard         | `/w/:workspaceSlug/dashboard`    | `/dashboard`                  |
| Notification apps | `/w/:workspaceSlug/apps`         | `/apps`                       |
| Ingress           | `/w/:workspaceSlug/ingress`      | `/ingress`                    |
| Analytics         | `/w/:workspaceSlug/analytics`    | `/analytics`                  |
| Subscription      | `/w/:workspaceSlug/subscription` | `/subscription`               |
| Security          | `/w/:workspaceSlug/security`     | `/security`                   |
| Settings          | `/w/:workspaceSlug/settings`     | `/settings`                   |

Legacy aliases are transitional only. They resolve the current membership and
redirect to the matching canonical URL; they do not become a second route
contract. If no current membership can be resolved, the user is sent to
workspace selection instead.

The authenticated route layer must resolve the active membership from the API;
client state and a JWT role claim are not authorization sources. A workspace
switch receives a new membership-scoped access token and refresh token before
the route context changes. See `docs/architecture.md` for the collaboration
model and `docs/authentication.md` for credential rotation.

### Notification App Behavior

A notification app belongs to the workspace selected by the authenticated
membership, and each environment belongs to one notification app. The client
must not send or derive a `workspace_id` when creating an app; the API applies
the active membership's workspace scope. A workspace URL is navigation context,
not authorization.

The initial apps flow is: show an empty state when the active workspace has no
apps, create an app, then show the newly created app with Development and
Production environments. Default environments are created atomically by the
backend, rather than as follow-up browser requests.

App detail routes use
`/w/:workspaceSlug/apps/:appSlug/environments/:environmentSlug`. App and
environment UUIDs stay out of URLs. App slugs are unique within the workspace
and environment slugs are unique within the app. Renaming changes only an app's
display name, so its URL remains stable. Client keys and trusted origins are
environment-scoped. Each app response derives setup readiness independently for
Development and Production from the presence of an active client key and a
trusted origin. The environment detail shows the readiness status, links missing
checklist items to their controls, and refreshes readiness after configuration
mutations. Events, delivery data, analytics, billing, and collaboration controls
remain deferred.

The workspace switcher lists every active membership, including both the owned
and invited workspaces created during invitation signup. After an explicit
sign-in, the browser may restore its last active workspace from a per-account
local-storage ID, resolves it from the authenticated workspace list, then uses
the normal switch API. If that membership was revoked, it clears the ID and
keeps the API-selected fallback workspace.

The security section may describe audit posture, but it does not query or
display audit records in the current phase. Audit persistence is backend-owned
and no audit credential or event metadata belongs in browser storage.

Shared dashboard layout lives in:

```text
apps/web/src/components/workspace-shell.tsx
```

Domain page content lives in:

```text
apps/web/src/components/workspace-section-page.tsx
```

The shared workspace sections use one constrained `$section` child route under
the pathless authenticated layout. Dashboard routes remain explicit because
they render different page composition. Unmatched paths and unsupported section
values render the root route's not-found component without replacing the
requested URL. The explicit `/404` route renders the same page.

## React Conventions

### Components And State

- Keep components pure. Rendering must not mutate external state, start
  requests, write browser storage, or change the DOM outside React.
- Store the minimum state needed. Calculate values from props, form state,
  query data, and existing state during render instead of synchronizing another
  state variable.
- Do not copy props into state unless the component intentionally owns an
  editable snapshot. Prefer controlled components or a `key` when a subtree
  must reset for a new entity.
- Keep state close to the components that use it. Lift it only when multiple
  siblings need the same source of truth.
- Put user-triggered work in the corresponding event handler or TanStack
  mutation. Do not set state and watch that state in an Effect to discover that
  a button was clicked.
- Use functional state updates when the next value depends on the previous
  value.
- Use refs for mutable values that do not affect rendering. Do not use refs to
  hide render state from React.

### Effects

Treat `useEffect` as an escape hatch for synchronizing React with an external
system. Before adding an Effect, check whether the work belongs in render, an
event handler, a route lifecycle, TanStack Query, or an external-store adapter.

Do not use an Effect for:

- deriving display values or filtering data;
- copying one React state value into another;
- submitting forms or handling user actions;
- redirecting or enforcing route authorization;
- ordinary API loading that belongs in TanStack Query or a route loader;
- chains of state updates where one Effect exists only to trigger another.

An Effect is appropriate for subscriptions and imperative systems such as
timers, browser event listeners, `BroadcastChannel`, Web APIs, or third-party
widgets that must stay synchronized while a component is mounted.

When an Effect is necessary:

- Include every reactive dependency. Restructure the code instead of disabling
  dependency lint rules.
- Return cleanup that exactly reverses setup, including listeners, timers,
  subscriptions, and pending work where cancellation is supported.
- Make setup and cleanup safe to repeat. React development behavior may run an
  additional setup and cleanup cycle to reveal lifecycle bugs.
- Do not assume `useEffect(..., [])` means exactly once for the lifetime of the
  application.
- Keep each Effect focused on one external synchronization process. Extract a
  custom Hook when that process is reusable.
- Use `useLayoutEffect` only for browser layout measurement or a required
  pre-paint DOM adjustment. It should be rare.

### Routing, Server State, And External Stores

- Use TanStack Router `beforeLoad` for access checks and redirects. Use loaders
  to coordinate critical route data before rendering.
- Use TanStack Query for server state, caching, retries, mutations, and cache
  invalidation. Do not mirror query results into component state without a
  specific editable-state requirement.
- Use TanStack Form for form state and validation instead of Effects that keep
  individual fields synchronized.
- Use `useSyncExternalStore` for mutable stores that live outside React and can
  change independently of a component.
- Keep browser-only APIs out of server rendering. Use a client-only route,
  browser guard, or Effect according to whether the API is needed before or
  after rendering.

### Memoization And Composition

- Do not add `useMemo`, `useCallback`, or `memo` by default. Add memoization
  when a calculation is meaningfully expensive or stable identity is required
  by a measured child, dependency, or external API.
- Keep route modules small and compose page behavior from focused components
  and Hooks in the owning application.
- Custom Hooks share stateful behavior. They must follow the same dependency,
  cleanup, and ownership rules as components.
- Name event props `onThing` and their local implementations `handleThing`.
- Prefer composition over large components with many boolean modes.

These conventions follow React's guidance on
[avoiding unnecessary Effects](https://react.dev/learn/you-might-not-need-an-effect)
and [synchronizing with external systems](https://react.dev/reference/react/useEffect).

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

The package also exports named aliases for commonly consumed contracts. The
notification app flow uses `ApiCreateNotificationAppRequest`,
`ApiNotificationApp`, `ApiNotificationAppEnvironment`, and
`ApiNotificationAppsResponse` from `@notify/api-client` rather than defining
duplicate browser-side interfaces.

Browser transport is centralized in:

```text
apps/web/src/lib/http-client.ts
```

Use its typed `get`, `post`, `put`, `patch`, and `delete` helpers instead of
calling `fetch` from endpoint modules or components. Keep endpoint-specific
paths and generated request and response types in `api-client.ts`. The transport
retries bounded transient failures for idempotent requests. It does not retry
`POST` or `PATCH` by default because repeating a non-idempotent mutation can
duplicate work.

Web client tests use the shared MSW server in `apps/web/src/test/server.ts`.
Register request handlers per test and keep unhandled requests as errors. Test
endpoint helpers through that boundary instead of replacing `fetch` with a mock.

Browser API calls use `VITE_API_URL`, which defaults to `http://localhost:4100`.
The API accepts the local dashboard origin by default. Set `CORS_ORIGINS` to a
comma-separated allowlist for deployed browser origins; wildcard origins are not
allowed for authenticated routes.

Authentication helpers must keep the access JWT in frontend-managed memory,
send it with the `Authorization` header, and use `credentials: "include"` for
login, refresh, and logout so the API-scoped HttpOnly refresh cookie is sent.
Refresh attempts must be single-flighted across tabs because replaying a rotated
credential revokes the session.

The dashboard initializes authentication after browser hydration by rotating
the HttpOnly refresh cookie. Product routes live under a client-only protected
layout whose `beforeLoad` guard reads the shared auth client from typed router
context. Child routes and their loaders run only after initialization succeeds.
Refresh calls use the Web Locks API across tabs and fail closed when that browser
capability is missing. Logout is broadcast to other tabs, while access tokens
remain memory-only.

Signup is email-first. The signup page starts the flow with only an email. The
verification route exchanges the emailed token for a 15-minute signup token,
then collects and confirms the password, workspace name, and terms acceptance
and calls the signup-completion endpoint. Password validation is shown on blur
or submit so incomplete passwords are not flagged while the user is typing. The
dashboard must not persist either verification credential in browser storage.
New users completing an invitation also name the workspace they own while
creating their password. Their first authenticated session still opens in the
workspace that invited them.

Password recovery starts with an enumeration-safe email request. The emailed
one-hour token is exchanged after browser hydration for a 15-minute completion
credential, then removed from the URL. The reset form validates and confirms the
new password before submission. Successful completion returns to login and all
previous sessions for that user are revoked.

Google OAuth controls must not simulate success while the backend flow is
deferred.

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
