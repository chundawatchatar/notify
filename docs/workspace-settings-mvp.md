# Workspace Settings MVP

This document defines the implemented workspace settings MVP across
persistence, API contracts, and the dashboard. It replaces the former static
placeholder contract and remains authoritative for the settings flow.

## Goals

- let authorized members rename the active workspace
- persist one workspace timezone for dashboard presentation defaults
- show stable workspace and environment-routing facts without presenting them
  as editable settings
- keep settings reads and mutations scoped to the authenticated membership
- exclude preferences that have no backend behavior in the current product

## Settings Contract

| Field               | State         | Source and behavior                                                                                                                                                |
| ------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Workspace name      | Editable      | Persisted as `workspaces.name`. Trim surrounding whitespace and require 2 to 100 characters. Renaming does not change the workspace slug.                          |
| Timezone            | Editable      | Persisted on the workspace as a canonical IANA timezone identifier. New and existing workspaces default to `UTC`. Fixed UTC offsets and abbreviations are invalid. |
| Workspace slug      | Informational | Persisted as `workspaces.slug`. It remains the stable browser identifier and is not accepted by the settings mutation.                                             |
| Default environment | Informational | The system-owned value is Development. It is derived from the existing app-routing rule and is not persisted as a workspace setting.                               |

The timezone is a dashboard presentation default. It does not rewrite stored
event timestamps, change the fixed UTC analytics windows, schedule delivery,
or alter notification event semantics.

Every notification app continues to receive Development and Production
environments atomically. Opening an app without an environment continues to
redirect to its Development environment. The settings MVP does not allow a
workspace to select a different default.

## Ownership

`apps/api` owns workspace settings persistence, validation, membership-scoped
resolution, authorization, and HTTP behavior. The existing workspace row owns
the name and timezone. No separate settings aggregate or notification
preferences table is introduced for this contract.

`libs/domain` owns framework-free settings rules only when they can remain
independent of Ecto and Phoenix. The centralized workspace permission policy
continues to own role-to-action decisions.

`apps/web` owns the canonical settings route, loading and mutation state,
editable and read-only presentation, and cache invalidation after a successful
update. `packages/openapi` and `packages/api-client` contain only generated
contracts from the API source definitions.

## Authorization

Settings endpoints authorize against the active database-backed membership.
The workspace slug in a browser or API path is routing context and never an
authorization source.

| Operation                         | Permission         | Roles                           |
| --------------------------------- | ------------------ | ------------------------------- |
| View settings                     | `view_workspace`   | Owner, admin, developer, viewer |
| Update workspace name or timezone | `manage_workspace` | Owner, admin                    |

The API must use named permissions from `Domain.WorkspacePermissions` rather
than compare role strings. Developers and viewers receive the same settings
representation but the dashboard renders the editable fields read-only and
does not offer a save action.

## HTTP Boundary

The authenticated API surface is:

- `GET /api/workspaces/:workspaceSlug/settings`
- `PATCH /api/workspaces/:workspaceSlug/settings`

Both endpoints resolve `:workspaceSlug` only within the active membership. An
unknown slug or a slug that does not match the session workspace returns the
same not-found response and must not reveal another workspace. Switching
workspaces remains a separate authenticated session operation.

The OpenAPI source and generated TypeScript contracts expose these operations
as `getWorkspaceSettings` and `updateWorkspaceSettings`.

The read and successful update response uses this shape:

```json
{
  "settings": {
    "name": "Acme Cloud",
    "slug": "acme-cloud",
    "timezone": "UTC",
    "default_environment": "development"
  }
}
```

The patch request accepts only editable fields:

```json
{
  "name": "Acme Platform",
  "timezone": "Asia/Kolkata"
}
```

The patch is partial and atomic. At least one editable field is required.
Unknown, null, blank, or invalid values are rejected through the normal typed
validation error response. `slug` and `default_environment` are never accepted
as mutation fields. A successful rename preserves `slug` and returns the
complete settings representation.

Reads require `view_workspace`; updates require `manage_workspace`.
Unauthenticated requests return the normal authentication error, a member
without mutation permission receives a forbidden response, and tenant-safe
resolution occurs before returning workspace data.

## Browser Behavior

The canonical page remains `/w/:workspaceSlug/settings`. The legacy
`/settings` alias resolves the active membership and redirects to the canonical
route. It does not render a second settings page or accept edits directly.

The page loads the settings representation with TanStack Query and offers a
retry when that read fails. Owner and admin forms use TanStack Form and Zod for
workspace name and timezone. After a successful mutation, the browser refreshes
settings plus any authenticated workspace summaries that display the workspace
name. A failed mutation keeps the entered values available for correction.
Developer and viewer sessions show the same values without enabled form
controls.

The page labels Workspace slug and Default environment as informational. It
must not present those values as disabled controls that imply a future update
is already supported.

## Deferred Settings

The following placeholder values are removed from the MVP surface and must not
be persisted by the settings tickets:

- delivery alerts, because the delivery MVP has no terminal failure or client
  receipt signal to alert on
- usage alerts and thresholds, because billing and usage counters remain
  separately owned future work
- weekly reports, because scheduled reporting and report delivery are deferred
- incident contacts, because no incident-routing or contact-delivery boundary
  exists yet
- data residency, because the current deployment and workspace model has no
  authoritative per-workspace region value
- team defaults, custom roles, organization hierarchy, billing controls,
  audit-log retrieval, and advanced policy controls

Future work must define the producing signal, delivery channel, persistence
owner, authorization, and failure behavior before adding any notification
preference or incident-contact field. It must not infer those contracts from
the former placeholder copy.
