---
name: notify-operations-change
description: Change Notify API runtime delivery and operational behavior safely. Use for Phoenix releases, Docker images, Kubernetes manifests, migration jobs, runtime environment variables, health probes, Prometheus metrics, secrets, resources, rollout order, or future CI/CD design.
---

# Notify Operations Change

Keep runtime changes reproducible, non-root, observable, and safe to deploy.

## Read First

Read `AGENTS.md`, `docs/operations.md`, `docs/database-migrations.md`, and the
existing Docker or Kubernetes file being changed.

## Invariants

- Build one immutable API image for both server and migration execution.
- Run `/app/bin/migrate` as an explicit one-off job before API rollout.
- Never run migrations automatically during API pod startup.
- Keep `/api/health/live` dependency-free and use `/api/health/ready` for
  required dependencies.
- Keep `/metrics` internal and require `METRICS_TOKEN` when enabled in
  production.
- Run containers as a non-root user with least privilege and explicit resource
  requests and limits.
- Do not add `.github/workflows` before the MVP unless the user explicitly asks
  to enable GitHub Actions.

## Workflow

1. Identify whether the change affects build time, runtime configuration,
   deployment order, observability, or secrets.
2. Keep secrets in environment or Kubernetes Secret references; never commit
   real values.
3. Pin runtime images to immutable digests and use the same application image
   for migration and server workloads.
4. Preserve startup, liveness, readiness, graceful shutdown, and rollback
   behavior.
5. Use `generateName` for repeatable migration Jobs and wait for success before
   rollout.
6. Update `docs/operations.md` and `.env.example` when runtime behavior or
   variables change.
7. Keep deployment templates generic; environment overlays and credentials
   belong to the deployment platform when it is selected.

## Verify

Use the checks relevant to the change:

```sh
pnpm api:release
pnpm api:image
kubectl kustomize deploy/kubernetes/base
```

For image changes, run `/app/bin/migrate`, start the image, and check both
health endpoints against local PostgreSQL. Do not leave smoke-test containers
running.
