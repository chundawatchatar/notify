# Database Migrations

This document defines how Notify manages and runs database migrations.

## Decision

For now, migrations are owned by the Phoenix API application.

```text
apps/api/priv/repo/migrations
```

The API owns `Api.Repo`, runtime database configuration, and the current
application database. Keeping migrations beside the API preserves clear database
ownership while still allowing CI/CD to run migrations separately from the API
server process.

Do not create a separate migration library unless the database becomes shared by
multiple backend applications with a clear ownership model.

## Local Development

Start local infrastructure:

```sh
pnpm docker:up
```

Create and migrate the local API database:

```sh
pnpm api:setup
```

Generate a new migration:

```sh
cd apps/api
mix ecto.gen.migration create_notifications
```

Run pending migrations:

```sh
cd apps/api
mix ecto.migrate
```

Rollback the most recent migration during local development:

```sh
cd apps/api
mix ecto.rollback
```

Reset the local API database only when local data can be deleted:

```sh
cd apps/api
mix ecto.reset
```

## CI/CD And Kubernetes

Migrations should run as a one-off job before the API deployment rolls forward.
The migration job should use the same API container image that will be deployed.

Target deployment order:

```text
1. Build API image.
2. Push API image.
3. Run migration job using that exact image.
4. Deploy or roll out API pods only after migrations succeed.
5. Stop the rollout if migrations fail.
```

The API server should not run migrations automatically on boot. In Kubernetes,
multiple pods may start at the same time, so schema migration must be an explicit
deployment step.

## Release Runner

The production migration runner is implemented in:

```text
apps/api/lib/api/release.ex
```

It starts the minimum applications required for Ecto and runs:

```elixir
Ecto.Migrator.run(Api.Repo, :up, all: true)
```

The release image exposes this through:

```sh
/app/bin/migrate
```

This keeps runtime migration execution separate from API startup while keeping
migration ownership inside `apps/api`.

`deploy/kubernetes/migration-job.yaml` is the generic Job template. Replace its
image with the same immutable tag or digest used by the Deployment, create the
Job, wait for completion, and only then roll out the API pods.

## Migration Safety Rules

Use expand-contract migrations for production changes:

- First add new tables, nullable columns, or backward-compatible indexes.
- Deploy code that can read and write both old and new shapes when needed.
- Backfill data in a separate controlled step for large tables.
- Only remove old columns, constraints, or tables after all deployed code no
  longer depends on them.

Avoid destructive migrations in the same release that introduces replacement
code.

## Indexing Guidance

For small early tables, normal Ecto index creation is acceptable.

For large production tables, prefer explicit SQL with concurrent indexes:

```elixir
def up do
  execute "CREATE INDEX CONCURRENTLY notifications_tenant_id_idx ON notifications (tenant_id)"
end

def down do
  execute "DROP INDEX CONCURRENTLY IF EXISTS notifications_tenant_id_idx"
end
```

When using concurrent indexes, disable migration transactions in that migration:

```elixir
@disable_ddl_transaction true
```

## Ownership Boundary

Keep these in `apps/api`:

- `Api.Repo`
- Ecto schemas
- database migrations
- database seeds
- release migration runner

Keep these in business libraries:

- pure domain structs and rules
- validation that does not require database access
- business lifecycle logic
- application use cases that can be tested without Phoenix controllers
