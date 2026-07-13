# Architecture

Notify is a pnpm and Nx monorepo with separate public, product, backend, domain,
and UI surfaces. The current architecture favors clear ownership over early
package splitting.

## Runtime Surfaces

- Marketing website: `apps/marketing`, served locally on `http://localhost:3200`.
- Dashboard web app: `apps/web`, served locally on `http://localhost:3100`.
- API backend: `apps/api`, served locally on `http://localhost:4100`.
- PostgreSQL: local port `15432`.
- Redis: local port `16379`.

See `docs/domain-architecture.md` for the intended production domain and
subdomain layout.

## Backend Boundary

`apps/api` is the backend application boundary. It owns:

- Phoenix endpoint, router, controllers, and JSON responses.
- `Api.Repo`.
- Ecto schemas and database migrations.
- Database seeds and release migration runner.
- API authentication, ingress endpoints, and dashboard APIs.

`libs/domain` is for framework-free business logic that can be tested without
Phoenix, Ecto, or a database connection. Do not put Phoenix controllers, Repo
calls, or migrations there.

`libs/open_api` is for framework-free OpenAPI schema modules. The API app still
owns routes, controllers, operation specs, and OpenAPI JSON generation.

## Frontend Boundary

`apps/web` is the authenticated dashboard. It owns product routes and page-level
composition for:

- authentication
- dashboard
- notification apps
- ingress endpoint
- analytics
- subscription
- security/API keys
- settings

`apps/marketing` is the public website. It should remain content-focused and
link into the dashboard for signup and login.

`packages/ui` contains shared React UI primitives and components. It should not
contain page-specific product behavior.

`packages/openapi` contains the generated OpenAPI JSON contract from the
backend. `packages/api-client` contains generated TypeScript API contract types
from that OpenAPI package. Frontend API helpers should use `@notify/api-client`
for request and response shapes.

## Data Flow

Target flow for product features:

```text
web route/component
  -> TanStack Query/Form layer
  -> @notify/api-client generated contract types
  -> API endpoint in apps/api
  -> Ecto schema or use case
  -> PostgreSQL/Redis
```

Pure business decisions should be extracted into `libs/domain` when they can be
used without framework dependencies.

## Adding New Features

When adding a feature, decide ownership first:

- Page-only UI: `apps/web`.
- Public website content: `apps/marketing`.
- Shared UI primitive: `packages/ui`.
- Generated OpenAPI contract: `packages/openapi`.
- Generated API contract type: `packages/api-client`.
- HTTP/API behavior: `apps/api`.
- Pure business rule: `libs/domain`.
- Reusable Elixir OpenAPI schema: `libs/open_api`.
- Database shape: `apps/api/priv/repo/migrations`.
