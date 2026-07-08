# Database And Docker Infrastructure

The application should use different storage systems for different data access
patterns:

- PostgreSQL for core application data such as login, signup, users, workspaces,
  templates, API keys, subscriptions, and billing records.
- Redis for rate limiting and short-lived operational state.
- Notification logs should start in PostgreSQL. Cassandra can be considered
  later for high-volume append-only logging when write volume and query patterns
  justify the operational complexity.

## Implementation

- Add Docker Compose configuration for local PostgreSQL and Redis.
- Add example environment variables for local services.
- Add Docker ignore rules and root scripts for common local infrastructure
  commands.
- Defer Cassandra and Phoenix/API integration to future specs.

## Status

- Implemented local Docker Compose services for PostgreSQL and Redis.
- Added `.env.example`, `.dockerignore`, and root Docker scripts.
- Documented Cassandra as a future storage option instead of adding it to the
  local Docker stack now.
