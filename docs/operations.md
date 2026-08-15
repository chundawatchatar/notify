# Operations

This document defines the current production baseline for the Notify API.

## Release Image

Build the production image from the repository root:

```sh
pnpm api:image
```

`apps/api/Dockerfile` builds a Phoenix release and runs it as an unprivileged
user. The same image provides:

- `/app/bin/server` for API pods.
- `/app/bin/migrate` for the one-off migration Job.

Published images must use an immutable commit tag or digest. Do not deploy the
placeholder image value from the Kubernetes templates.

## Kubernetes

Base API resources are under `deploy/kubernetes/base` and can be rendered with:

```sh
kubectl kustomize deploy/kubernetes/base
```

Create the `notify-api-runtime` Secret through the deployment platform. It must
provide the production runtime values, including:

- `DATABASE_URL`
- `SECRET_KEY_BASE`
- `PHX_HOST`
- `CORS_ORIGINS`
- `AUTH_JWT_SECRET`, containing at least 32 random bytes
- `WEB_APP_URL`, used to build verification links
- `metrics-token`

Before authentication is publicly exposed, the Secret must also provide the
Redis and Postmark settings defined in
`docs/authentication-production-readiness.md`. The Kubernetes templates do not
enable public authentication by themselves.

For authentication rate limiting, provide:

- `REDIS_URL`, pointing every API replica at the same production Redis service;
- `AUTH_RATE_LIMIT_NAMESPACE`, unique to this deployment but stable across its
  normal rollouts;
- `AUTH_RATE_LIMIT_TRUSTED_PROXIES`, containing the exact comma-separated IP or
  CIDR ranges of ingress peers allowed to set `X-Forwarded-For`.

The ingress must replace client-supplied `X-Forwarded-For` values with its
managed forwarding chain. Network policy must prevent public clients from
connecting directly to API pods. Requests from peers outside the configured
trusted ranges use the socket peer address and ignore forwarding headers.

`CORS_ORIGINS` must contain exact comma-separated origins and must include
`WEB_APP_URL`. Cookie-mutating authentication requests are rejected unless
their `Origin` header matches one of these configured origins.

Do not commit real secret values. Before creating resources, replace the image
in both the Deployment and `deploy/kubernetes/migration-job.yaml` with the same
immutable image. Create the migration template with `kubectl create -f`; its
generated name allows each deployment to keep an independent Job record.

Deployment order:

1. Build and publish the API image.
2. Run the migration Job with that image.
3. Wait for the Job to succeed.
4. Roll out the API Deployment with that image.
5. Verify readiness and version endpoints.

## Health Probes

`GET /api/health/live` checks only whether the API process can serve requests.
Kubernetes uses it for startup and liveness probes.

`GET /api/health/ready` checks PostgreSQL with a short timeout. Kubernetes uses
it to decide whether a pod should receive traffic. Dependency failure details
are logged internally and are never returned to clients.

## Delivery Publisher

After an ingress transaction commits, its request handler attempts an immediate
best-effort publish. Every API instance also runs a supervised delivery
publisher that polls the notification event outbox every five seconds,
requeues stale processing claims, and publishes one available handoff. Failed
attempts return to `pending` without a scheduled backoff or delivery guarantee.
Concurrent instances are safe because claiming locks the row and every renewal,
completion, or reset is conditional on its processing token.

## Metrics

The API exposes Prometheus text format at `GET /metrics` when
`METRICS_ENABLED=true`. Metrics include bounded route-level request data,
database latency histograms, and BEAM VM gauges.

Production startup requires `METRICS_TOKEN` whenever metrics are enabled. A
scraper must send:

```text
Authorization: Bearer <METRICS_TOKEN>
```

Keep `/metrics` internal to the cluster even when bearer authentication is
enabled. Do not route it through the public ingress.

## Authentication Runtime

`AUTH_JWT_SECRET` signs 15-minute dashboard access tokens and must remain in the
runtime Secret. Rotating it invalidates issued access JWTs; persisted refresh
sessions can still issue new JWTs with the new key.

The built-in production verification, password-reset, and invitation email
adapters are intentionally disabled. Configure real provider implementations
before exposing signup, password recovery, or workspace invitations. Until auth
rate limiting and production email delivery are installed, authentication must
not be publicly exposed.

`docs/authentication-production-readiness.md` is the authoritative contract for
the protected endpoint set, Redis failure behavior, Postmark runtime variables,
implementation order, and concrete public-exposure checklist. Redis is a
required readiness dependency for API pods serving public authentication. A
Redis outage makes `/api/health/ready` return `503`, and protected authentication
requests fail closed with `503 rate_limiter_unavailable` until the shared store
recovers. Exhausted fixed-window budgets return `429 rate_limited` and an
integer `Retry-After` response header.

In development, verification, password-reset, and invitation messages are
delivered to the local Mailpit SMTP service and can be inspected at
`http://localhost:8025` with the default `MAILPIT_UI_PORT`. Configure the API
relay host with `DEV_EMAIL_SMTP_HOST`; `MAILPIT_SMTP_PORT` configures both the
host-facing Mailpit SMTP port and the API SMTP client port. `MAILPIT_UI_PORT`
configures the inbox UI port. Do not enable these adapters in production.
Development messages contain live one-time links; keep Mailpit local and do not
expose its SMTP or inbox UI outside the development machine.

## CI Policy

GitHub Actions workflows are intentionally deferred until the MVP is ready.
Local precommit and prepush hooks continue to avoid tests. Before merging a
change, run `pnpm check`, `pnpm build`, and any relevant release or container
checks manually. `docs/github-workflow.md` defines the future CI/CD plan.
