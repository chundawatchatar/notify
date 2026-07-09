# Notify API

Phoenix API application for the Notify backend.

## Commands

```sh
mix setup
mix phx.server
mix test
mix format --check-formatted
```

The API depends on the shared domain library at `../../libs/domain`.
The default local API port is `4100`.

From the repository root, use `pnpm api:setup` to create and migrate the local
development database before running `pnpm api`.

## Endpoints

- `GET /api/health`: service information and readiness checks.
- `GET /api/version`: API service version.

## Learn more

- Official website: https://www.phoenixframework.org/
- Guides: https://hexdocs.pm/phoenix/overview.html
- Docs: https://hexdocs.pm/phoenix
- Forum: https://elixirforum.com/c/phoenix-forum
- Source: https://github.com/phoenixframework/phoenix
