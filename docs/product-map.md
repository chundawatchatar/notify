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
- delivery health summary
- ingress status
- subscription usage summary
- recent events and operational activity

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
Credentials, origins, notification events, and delivery data will be scoped to
the selected environment when those capabilities are introduced.

App and environment UUIDs remain database identities. Client URLs extend the
workspace route with the app and environment slugs:

- `/w/:workspaceSlug/apps/:appSlug/environments/:environmentSlug`

App slugs are normalized and unique within their workspace; environment slugs
are normalized and unique within their app. Renaming changes only an app's
display name, so its client URL remains stable.

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

Deferred from this module's initial app flow:

- client keys and credentials
- trusted origins
- ingress and event delivery data
- analytics, billing, and collaboration behavior

Expected future backend ownership:

- notification app records and default-environment creation
- environment records

## Ingress Endpoint

Canonical route:

- `/w/:workspaceSlug/ingress`

Legacy alias: `/ingress`

Responsibilities:

- show event ingestion endpoint
- manage signed request rules
- show idempotency and schema policy
- test event publishing
- monitor recent accepted events

Expected future backend ownership:

- `POST /api/v1/notifications` or equivalent ingest endpoint
- request signature validation
- idempotency key handling
- event persistence and queue handoff

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

Expected future backend ownership:

- API key storage and hashing
- key rotation lifecycle
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
