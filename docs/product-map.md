# Product Map

Notify is a notification infrastructure platform for customer-facing apps. The
dashboard is organized around the product modules below.

## Authentication

Routes:

- `/auth`
- `/auth/login`
- `/auth/signup`
- `/auth/forgot-password`
- `/auth/reset-password`

Responsibilities:

- email ownership verification before collecting the password
- verified signup atomically creates the account, workspace, and owner membership
- sign in with a short-lived access JWT and rotating refresh session
- current-account lookup and logout
- Google login UI
- forgot password
- future reset password flow

Current backend endpoints:

- `POST /api/auth/signup`
- `POST /api/auth/signup/complete`
- `POST /api/auth/email-verification/resend`
- `POST /api/auth/email-verification/confirm`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `DELETE /api/auth/session`

Google OAuth, password reset, multi-workspace selection, and auth rate limiting
are deferred. Rate limiting is required before public production exposure.

## Dashboard

Route:

- `/dashboard`

Responsibilities:

- workspace overview
- delivery health summary
- ingress status
- subscription usage summary
- recent events and operational activity

## Notification Apps

Route:

- `/apps`

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

Route:

- `/ingress`

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

Route:

- `/analytics`

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

Route:

- `/subscription`

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

Route:

- `/security`

Responsibilities:

- server API keys
- key rotation
- trusted origins
- socket token policy
- audit activity

Expected future backend ownership:

- API key storage and hashing
- key rotation lifecycle
- origin enforcement
- audit log records

## Settings

Route:

- `/settings`

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
