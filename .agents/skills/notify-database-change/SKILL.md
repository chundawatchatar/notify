---
name: notify-database-change
description: Plan and implement Notify PostgreSQL persistence safely. Use for Ecto schemas, changesets, Repo queries, migrations, tables, columns, indexes, constraints, tenant scoping, backfills, seeds, or migration deployment behavior.
---

# Notify Database Change

Keep persistence owned by the API and make production migrations backward
compatible.

## Read First

Read `AGENTS.md`, `docs/database.md`, and `docs/database-migrations.md`. Inspect
existing migrations and persistence code before choosing names or patterns.

## Ownership

- Put Ecto schemas, changesets, Repo access, seeds, and migrations in
  `apps/api`.
- Put migrations in `apps/api/priv/repo/migrations`.
- Put only framework-free business rules in `libs/domain`.
- Do not create a separate migration package while `apps/api` owns the
  database.

## Workflow

1. Confirm the product flow and tenant boundary before defining a table.
2. Model workspace or tenant ownership explicitly where the record is scoped.
3. Generate a migration from `apps/api`; do not invent duplicate timestamps.
4. Add database constraints, foreign keys, and indexes that enforce the stated
   invariants. Add unique indexes with the tenant key when uniqueness is
   tenant-local.
5. Prefer Ecto migration DSL. Use SQL only for capabilities the DSL does not
   express well.
6. Use expand-contract changes: add compatible shape, deploy compatible code,
   backfill separately, then remove obsolete shape in a later release.
7. Add or update the Ecto schema and changeset without duplicating pure domain
   policy.
8. Test constraints, changesets, tenant isolation, and relevant queries.

## Large Changes

- Use `CREATE INDEX CONCURRENTLY` for large production indexes and set
  `@disable_ddl_transaction true` in that migration.
- Keep large backfills outside schema migrations when they can exceed the
  deployment window.
- Never run migrations automatically from API pod startup. Use
  `/app/bin/migrate` as a one-off deployment job.

## Verify

Start PostgreSQL when needed, then run:

```sh
pnpm docker:up
pnpm api:test
```

Run the migration up and down locally when rollback behavior is part of the
change.
