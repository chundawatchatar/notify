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

## Dashboard Authentication

Dashboard authentication is owned by `apps/api` and uses two credentials:

- a 15-minute JWT sent as `Authorization: Bearer <token>`;
- a rotating opaque refresh token stored in an HttpOnly cookie scoped to
  `api.notify.tld` under `/api/auth`.

The API persists the refresh-token digest and active workspace membership. It
checks the session record on every protected request so logout, expiry, or
membership removal revokes access immediately. Browser refresh and logout calls
must include credentials and originate from the configured dashboard origin.
See `docs/authentication.md` for the complete login, refresh, rotation,
browser-access, and session-revocation flow.

Email/password signup verifies ownership before creating an account. The API
stores a hashed, expiring signup challenge and exchanges the email link for a
15-minute, one-time signup-completion credential. Completing signup atomically
creates the confirmed user, one workspace, and its owner membership. This keeps
an unverified request from reserving another person's email. No session is
created until the user signs in.

Password recovery stores hashed, expiring, one-time credentials and returns the
same request response whether or not an account exists. Completing a reset
updates the Argon2 password hash and revokes all existing sessions for the user.

Google OAuth and authentication rate limiting remain deferred.

## Workspace Collaboration And Access

The tenant hierarchy is `user -> membership -> workspace -> notification app`.
A user is an account identity that may have multiple workspace memberships. A
workspace is the tenant, billing, collaboration, and audit boundary; notification
apps always belong to a workspace. A membership joins a user to one workspace,
stores the user's role, and is the security boundary for a session.

Initial workspace roles are `owner`, `admin`, `developer`, and `viewer`.
Authorization loads the current membership from the database. A JWT identifies
the user, session, and workspace, but it does not carry a role claim. This keeps
role changes and membership removal effective immediately when protected
requests check the session and active membership.

The centralized workspace permission policy is the only role-to-action mapping:

| Role      | Permissions                                                                                |
| --------- | ------------------------------------------------------------------------------------------ |
| Owner     | All workspace permissions                                                                  |
| Admin     | All except deleting the workspace and managing owners                                      |
| Developer | View workspace and members; view, create, and manage apps; manage credentials; view events |
| Viewer    | View workspace, members, apps, and events                                                  |

Billing and membership management are limited to owners and admins. Controllers
must require named permissions from this policy rather than compare role strings.

Each workspace has a globally unique, readable slug. Dashboard URLs use
`/w/:workspaceSlug` and never expose a workspace UUID. Switching workspaces
creates a new membership-scoped access token and rotating refresh token.

Invitations target a normalized email and use hashed, single-use credentials
with expiry, revocation, and acceptance timestamps. A workspace must always
retain at least one active owner. Removing a membership revokes its sessions
immediately. See `docs/authentication.md` for session behavior,
`docs/database.md` for persistence constraints, and `docs/frontend.md` for URL
and client conventions.

Security-sensitive collaboration mutations create append-only audit records in
the owning transaction. The audit model records workspace and actor scope,
action, target, and safe structured metadata, but never credentials or token
material. Audit activity has no dashboard UI in this phase.

Departments or teams, custom roles, and notification-app-specific grants are
explicitly deferred.

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

## Runtime Delivery

The API ships as one Phoenix release image built from `apps/api/Dockerfile`.
Kubernetes deployment templates live under `deploy/kubernetes`.

The image has two explicit entry points:

- `/app/bin/server`: starts the API server.
- `/app/bin/migrate`: runs all pending Ecto migrations and exits.

API pods never run migrations during startup. A deployment pipeline must run
the migration Job with the exact immutable image that will be rolled out.
