# Database

The API application owns the application database.

Primary migration reference:

- `docs/database-migrations.md`

## Ownership

Keep database concerns in `apps/api`:

- `Api.Repo`
- Ecto schemas
- migrations
- seeds
- release migration runner
- persistence adapters

Keep pure business rules in `libs/domain` when they do not require database
access.

## Migration Location

Migrations live in:

```text
apps/api/priv/repo/migrations
```

Generate migrations from the API app:

```sh
cd apps/api
mix ecto.gen.migration create_notification_apps
```

Run migrations:

```sh
cd apps/api
mix ecto.migrate
```

Or use setup from the root:

```sh
pnpm docker:up
pnpm api:setup
```

## CI/CD

Migrations should run as an explicit one-off job before API pods roll forward.
Do not run migrations automatically during API application boot.

Target deployment order:

```text
1. Build API image.
2. Push API image.
3. Run migration job with that exact image.
4. Roll out API pods after migrations succeed.
5. Stop rollout if migrations fail.
```

## Safety Rules

Use expand-contract migrations for production:

- Add new tables, nullable columns, and backward-compatible indexes first.
- Deploy code that can handle old and new shapes when needed.
- Backfill large data separately.
- Remove old columns/tables only after deployed code no longer depends on them.

Avoid destructive migrations in the same release that introduces replacement
code.

## Current Authentication Tables

- `signup_challenges`: normalized email, hashed email-verification and
  signup-completion credentials, expiries, verification time, and consumption
  time. A resend replaces the existing challenge for that email.
- `users`: normalized unique login identity, Argon2 password hash, email
  confirmation, terms acceptance, and latest successful login time.
- `workspaces`: tenant boundary created during signup.
- `workspace_memberships`: user-to-workspace role, initially only `owner`.
- `auth_sessions`: membership-scoped refresh digest, expiry, and revocation.

All authentication IDs use UUIDs. Raw refresh, verification, and signup
completion credentials are never persisted. Signup does not create a user until
the email has been verified. The verified completion transaction creates the
user, workspace, and owner membership together.

## Expected Product Tables

Likely next tables:

- notification_apps
- trusted_origins
- api_keys
- notification_events
- delivery_attempts
- subscription_plans or workspace_subscriptions
- audit_events

Confirm product flow and API contracts before adding tables.

## Ecto Guidance

- Prefer Ecto migration DSL for normal table and index changes.
- Use explicit SQL only when needed, such as concurrent indexes.
- For large production indexes, use `CREATE INDEX CONCURRENTLY` and disable
  migration transactions with `@disable_ddl_transaction true`.
- Keep schemas named after domain concepts, not UI pages.
- Keep database IDs and tenant/workspace scoping explicit.
