# API Health And Version

Add minimal API readiness endpoints before introducing auth or notification
domain persistence.

## Decision

- Add `GET /api/health` as the operational health endpoint.
- Keep service information in `/api/health`, including app name, version,
  environment, and database readiness.
- Return HTTP 200 when the API and database are ready.
- Return HTTP 503 with the same response shape when the API is running but the
  database check fails.
- Add `GET /api/version` as a lightweight version endpoint for clients and
  tooling that do not need readiness details.
- Keep this task infrastructure-focused. Do not add auth, users,
  subscriptions, notification tables, or Redis logic yet.

## Implementation Plan

- Add a Phoenix health controller.
- Add a Phoenix version controller.
- Wire `/api/health` and `/api/version` in the API router.
- Add controller tests for successful JSON responses.
- Update API documentation with the new endpoints.
- Make the API test target load `.env` so local database port overrides are
  respected.
- Move default local API, web, PostgreSQL, and Redis ports away from common
  framework and database defaults.
- Add a root API setup command so the Phoenix development database can be
  created before serving the API.

## Status

- Added `GET /api/health` with service information and database readiness.
- Added `GET /api/version` with lightweight API version information.
- Added controller tests for both endpoints.
- Updated API documentation with the new endpoints.
- Updated the API Nx test target to load `.env` through `tools/with-env.sh`.
- Updated local default ports to API `4100`, web `3100`, PostgreSQL `15432`,
  and Redis `16379`.
- Added `pnpm api:setup` and wired it into `pnpm setup`.
