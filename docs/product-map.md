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
- verified signup atomically creates the account, workspace, and owner membership
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

Responsibilities:

- create notification apps
- list app environments and trusted origins
- expose client keys
- show setup readiness
- track app-level event volume

Expected future backend ownership:

- app records
- client keys
- environment labels
- trusted origins per app

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
