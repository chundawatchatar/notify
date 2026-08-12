# Product Map

Notify is a notification infrastructure platform for customer-facing apps. The
dashboard is organized around the product modules below.

## Authentication

Routes:

- `/auth`
- `/auth/login`
- `/auth/signup`
- `/auth/verify-email`
- `/auth/forgot-password`

Responsibilities:

- email ownership verification before collecting the password
- verified signup atomically creates the account, named workspace, and owner
  membership
- sign in with a short-lived access JWT and rotating refresh session
- current-account lookup and logout
- protected dashboard session restoration and logout
- enumeration-safe password recovery with one-time email links

Current backend endpoints:

- `POST /api/auth/signup`
- `POST /api/auth/signup/complete`
- `POST /api/auth/email-verification/resend`
- `POST /api/auth/email-verification/confirm`
- `POST /api/auth/password-reset`
- `POST /api/auth/password-reset/confirm`
- `POST /api/auth/password-reset/complete`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `DELETE /api/auth/session`

Google OAuth and auth rate limiting are deferred.
Rate limiting and a production email provider are required before public
production exposure.

## Workspace Collaboration

Workspace membership is the collaboration and access boundary for every
notification app. Initial roles are owner, admin, developer, and viewer.
Workspace switching uses membership-scoped sessions. Every product route below
uses the canonical `/w/:workspaceSlug` prefix; the listed unscoped path is a
temporary legacy alias that redirects to the canonical URL after the workspace
routing migration. Invitations will support expiring, revocable, single-use
email tokens. Security-sensitive collaboration mutations write append-only,
workspace-scoped audit events, but an audit-log UI is deferred. Departments or
teams, custom roles, and app-specific grants are deferred. The authoritative
model is in `docs/architecture.md`.

Invitation signup creates a named owner workspace and the invited membership
together, then stays in the invited workspace; the switcher exposes both
memberships. Login prefers the earliest active owner membership as its
server-side fallback when the browser has no restorable active workspace.

## Dashboard

Canonical route:

- `/w/:workspaceSlug/dashboard`

Legacy alias: `/dashboard`

Responsibilities:

- workspace overview
- delivery handoff summary
- ingress status
- notification app setup readiness
- recent accepted events and their best-effort realtime publish state

## Notification Apps

Canonical route:

- `/w/:workspaceSlug/apps`

Legacy alias: `/apps`

Notification app hierarchy:

```text
workspace
└── notification app
    └── environment
```

A notification app belongs to exactly one workspace, and an environment belongs
to exactly one notification app. Workspace membership remains the access
boundary for both resources. Creating an app uses the active workspace from the
authenticated membership; clients never provide a `workspace_id`.

App creation atomically creates exactly two initial environments: Development
and Production. The initial dashboard flow is sign in, show the no-apps empty
state, create an app, list the new app, then open it and select an environment.
Client keys and trusted origins are scoped to the selected environment.
Readiness is derived independently for Development and Production: an
environment is ready when it has at least one active client key and one trusted
origin. Notification event and delivery views remain outside the app-detail
flow; the ingress page and workspace dashboard own their safe summaries.

App and environment UUIDs remain database identities. Client URLs extend the
workspace route with the app and environment slugs:

- `/w/:workspaceSlug/apps/:appSlug/environments/:environmentSlug`

App slugs are normalized and unique within their workspace; environment slugs
are normalized and unique within their app. Renaming changes only an app's
display name, so its client URL remains stable. Opening an app without an
environment redirects to its Development environment. Selecting Development or
Production changes the URL, so the active environment remains shareable and
survives a refresh.

The initial authenticated app API uses the workspace selected by the current
membership-scoped session:

- `GET /api/apps` returns a stable `{apps: [...]}` list, including each app's
  Development and Production environments.
- `POST /api/apps` accepts an app name only and returns the created app with
  HTTP 201. The request never accepts a workspace identifier or slug.
- `GET /api/apps/:appSlug` resolves the app only inside the active workspace.
- `PATCH /api/apps/:appSlug` accepts a new display name and returns the updated
  app. It preserves the stable app slug.
- `DELETE /api/apps/:appSlug` soft-archives the app with HTTP 204. Archived
  apps are excluded from normal list and detail responses and cannot be
  restored in the current flow.

App slugs are generated from names. A same-workspace name collision receives the
first available numeric suffix, beginning with `-2`; a database uniqueness
conflict returns the stable `app_slug_taken` error. Cross-workspace app lookups
return `app_not_found` without revealing resource data.

The workspace routing foundation owns workspace slug and membership behavior;
app work depends on that foundation and does not redefine collaboration,
permissions, or workspace sessions.

Responsibilities:

- create notification apps
- list notification apps and their environments
- select an environment
- show derived setup readiness and link missing requirements to configuration

Deferred from this module's initial app flow:

- analytics, billing, and collaboration behavior

Backend ownership:

- notification app records and default-environment creation
- environment records

## Ingress Endpoint

Canonical route:

- `/w/:workspaceSlug/ingress`

Legacy alias: `/ingress`

Responsibilities:

- show event ingestion endpoint
- show environment-scoped server API key requirements
- show idempotency and schema policy
- publish an authenticated dashboard test event
- monitor recent accepted events for the selected environment

Current backend ownership:

- `POST /api/v1/notifications`
- authenticated ingress dashboard APIs scoped by app and environment UUIDs
- environment-scoped server API key authentication
- idempotency key handling with 24-hour retention
- accepted-event persistence and outbox handoff records

The ingress APIs are implemented in `apps/api`; their OpenAPI output and
generated TypeScript client are checked in under `packages/openapi` and
`packages/api-client`.

Ingress MVP boundary:

- the public ingest endpoint accepts one event per request and derives
  workspace, app, and environment from the server API key
- the request body owns the event name, recipient id, payload object, optional
  occurred-at timestamp, and optional safe metadata
- best-effort realtime publish is implemented through the durable outbox;
  scheduled retry policy, delivery receipts, analytics, and billing remain
  deferred

Delivery MVP boundaries are defined in `docs/notification-delivery-mvp.md`.
Ingress acceptance ends when the accepted event and pending outbox handoff are
committed. Realtime publish is best-effort and `published` is not a client
receipt. Offline recovery, scheduled retry guarantees, receipts, and
non-realtime channels remain deferred.

## Analytics

Canonical route:

- `/w/:workspaceSlug/analytics`

Legacy alias: `/analytics`

Responsibilities:

- delivery counts
- queued/retried/failed events
- app-level success rates
- latency and SLA views

Expected future backend ownership:

- event aggregation
- delivery state transitions
- app and workspace analytics queries

## Subscription

Canonical route:

- `/w/:workspaceSlug/subscription`

Legacy alias: `/subscription`

Responsibilities:

- plan summary
- event/app/seat usage
- renewal status
- future billing portal links

Expected future backend ownership:

- plan data
- usage counters
- billing provider integration

## Security And API Keys

Canonical route:

- `/w/:workspaceSlug/security`

Legacy alias: `/security`

Responsibilities:

- server API keys
- key rotation
- trusted origins
- socket token policy
- future audit activity view

Server API keys are environment-scoped backend credentials for customer
servers. They are distinct from environment client keys, which remain public
browser identifiers with the `nfy_pk_` prefix. The dashboard keeps using
workspace, app, and environment slugs for navigation, while server API key
endpoints identify the owning app and environment by `:appId` and
`:environmentId` UUIDs.

The v1 key lifecycle is list, create, rotate, and revoke. Reads require the
existing `view_apps` permission. Create, rotate, and revoke require the
existing `manage_credentials` permission. Creating or rotating a key reveals
the raw secret exactly once in the response and UI. Persistence stores only a
one-way digest, and the raw secret must never be logged. After the one-time
disclosure, subsequent API responses and the dashboard show only safe metadata
and lifecycle state. Revocation is irreversible and retained as lifecycle
history. Rotation atomically creates a replacement key and revokes the
previously active key in the same environment.

The Security page lets users pick an app and environment by slug, keeps that
selection in the route search state, and then loads or mutates keys through the
UUID-based API. Owners, admins, and developers can create, rotate, and revoke
keys. Viewers can inspect metadata but cannot mutate secrets.

Server API keys are the environment-scoped backend credential for
`POST /api/v1/notifications`, as defined by
`docs/notification-ingress-mvp.md`. Existing client-key, trusted-origin, and
readiness rules remain unchanged.

Expected future backend ownership:

- origin enforcement
- audit-event retrieval and retention policy

## Settings

Canonical route:

- `/w/:workspaceSlug/settings`

Legacy alias: `/settings`

Responsibilities:

- workspace name
- default environment
- timezone
- data residency display
- alert preferences
- incident contacts

Expected future backend ownership:

- workspace settings
- notification preferences
- team defaults
