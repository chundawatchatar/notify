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

In development, verification, password-reset, and invitation messages are
written as `.eml` files under `.tmp/dev-emails`. The adapters log the recipient
and absolute file path, but keep the raw link in the file. `.tmp/` is gitignored.
Override the location with `DEV_EMAIL_OUTBOX_DIR` when needed. Do not enable
these adapters in production.

## CI Policy

GitHub Actions workflows are intentionally deferred until the MVP is ready.
Local precommit and prepush hooks continue to avoid tests. Before merging a
change, run `pnpm check`, `pnpm build`, and any relevant release or container
checks manually. `docs/github-workflow.md` defines the future CI/CD plan.
