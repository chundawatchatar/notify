# Domain

Framework-free Elixir domain library for notification business contracts.

## Boundary

This library owns business meaning and rules that should remain true regardless
of how the application is exposed or stored:

- notification structs and types
- supported channels and statuses
- lifecycle transitions
- pure validation helpers

It must not depend on Phoenix, Ecto, PostgreSQL, Kubernetes, or HTTP concerns.
Database schemas, migrations, repositories, controllers, and deployment runners
belong in `apps/api`.
