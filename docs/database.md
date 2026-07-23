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

Reset the local development database by dropping it, recreating it, and running
all migrations:

```sh
pnpm db:reset
```

This command permanently deletes local development data and does not load
development seeds.

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

- `auth_challenges`: purpose-scoped, one-time signup and password-reset
  credentials. Signup purposes are scoped to a normalized email, while
  password-reset purposes are scoped to a user. Each verification or completion
  stage has its own hashed token, expiry, and optional consumption time. A new
  request replaces the current verification stage for the same purpose and
  subject.
- `users`: normalized unique login identity, Argon2 password hash, email
  confirmation, terms acceptance, and latest successful login time.
- `workspaces`: tenant boundary created during signup.
- `workspace_memberships`: user-to-workspace role and session boundary. Rows
  are retained across removal, with `active` or `removed` status plus join and
  removal timestamps. Initial roles are `owner`, `admin`, `developer`, and
  `viewer`.
- `auth_sessions`: membership-scoped refresh digest, expiry, and revocation.
- `workspace_audit_events`: append-only workspace-scoped records for
  collaboration security mutations. Each record stores the workspace, optional
  acting membership, action, target type and optional target ID, bounded JSON
  metadata, and UTC insertion time. Metadata must not contain raw invitation,
  password, access-token, refresh-token, or token-hash material.

An active membership is one that has not been removed or deactivated. It is the
only membership that can authorize a request, own a session, or count as a
workspace owner. Removal or deactivation revokes every session for that
membership in the same transaction.

Normal and invitation signup atomically create a named workspace with an active
owner membership for the new user. Invitation signup also creates the invited
membership and starts its session in that workspace. A later login uses the
user's earliest active owner membership as its server-side fallback, or the
earliest active membership when the user owns none.

`workspace_invitations` stores the normalized invitee email, selected workspace
role, inviter membership, SHA-256 digest of a single-use token, seven-day
expiry, optional revocation time, and acceptance time. Raw invitation tokens
are never persisted. An acceptance must not reuse a consumed or revoked token,
and re-inviting a removed user reactivates the existing membership row.
The membership migration must use a deferred database constraint trigger, or an
equivalent commit-time database invariant, to reject any transaction that leaves
a workspace without an active owner. It applies to membership removal, owner
role demotion, deactivation, and invitation acceptance, so concurrent changes
cannot remove or demote the final active owner.

No custom-role, department/team, or app-specific-grant tables are planned in
this phase. See `docs/architecture.md` for the collaboration model.

All authentication IDs use UUIDs. Raw refresh, verification, signup completion,
and password-reset credentials are never persisted. Confirming an email-link
credential consumes its verification row and creates a separate 15-minute
completion row. Signup does not create a user until the email has been verified.
The verified completion transaction creates the user, workspace, and owner
membership together.

## Product Tables

Implemented tables:

- `notification_apps`: a UUID-identified app owned by exactly one workspace,
  with a display name, tenant-local `app_slug`, and optional archival timestamp.
  Its workspace foreign key is the tenant scope; membership authorization is
  resolved before a client can create, read, or manage it.
- `app_environments`: a UUID-identified environment owned by exactly one
  notification app, with a display name, app-local `environment_slug`, and
  production classification. Creating an app creates its Development and
  Production environments in the same transaction. If any part of that flow
  fails, the app and both environment rows are rolled back. An app can have
  at most one production environment, and each environment slug is unique
  within its app. A successfully created app therefore has exactly one
  production environment.
- `environment_client_keys`: environment-scoped, server-generated browser
  client identifiers with a recognizable `nfy_pk_` prefix and optional
  revocation timestamp. They are not server ingestion secrets.
- `environment_trusted_origins`: environment-scoped normalized exact HTTP(S)
  origins. A unique `(app_environment_id, origin)` constraint prevents the
  same normalized origin from being trusted twice in an environment.

## Future Product Tables

- server API keys, notification_events, and delivery_attempts: future
  environment-scoped data, introduced only with their owning product contracts
- subscription_plans or workspace_subscriptions

Notification app and environment UUIDs are database identities. Readable app
and environment slugs are normalized as lowercase kebab-case values and support
future workspace-scoped client routes. A unique constraint on
`(workspace_id, app_slug)` prevents duplicate app URLs within a workspace, and
a unique constraint on `(notification_app_id, environment_slug)` prevents
duplicate environment URLs within an app. Slug collisions resolve
deterministically to the first available numeric suffix, beginning with `-2`.
Renames must validate and persist the new normalized value in the same
transaction; former slugs are not retained as redirect aliases. Client input
never selects a workspace ID for app creation. The collaboration model owns
membership, role, and workspace authorization - app tables do not add
app-specific grants.

Notification app and environment persistence is owned by this API application.
HTTP contracts for managing those records are introduced separately.

Notification apps are soft-archived by setting `archived_at`. Active list and
detail queries exclude archived apps, while the archived row and its stable slug
remain retained for auditability and to prevent URL reuse. Archiving is scoped
to the authenticated workspace and is irreversible in the current product flow.

The database enforces the same ownership boundaries used by application code:
an app must reference an existing workspace, an environment must reference an
existing app, app slugs are unique per workspace, and environment slugs are
unique per app. Queries must still apply the authenticated workspace scope so a
valid UUID or slug cannot expose another tenant's records.

## Ecto Guidance

- Prefer Ecto migration DSL for normal table and index changes.
- Use explicit SQL only when needed, such as concurrent indexes.
- For large production indexes, use `CREATE INDEX CONCURRENTLY` and disable
  migration transactions with `@disable_ddl_transaction true`.
- Keep schemas named after domain concepts, not UI pages.
- Keep database IDs and tenant/workspace scoping explicit.
