# Elixir API And Library Layout

Add the initial Elixir API application and domain library.

## Decision

- Keep the Elixir app under `apps/api`.
- Keep shared Elixir libraries under the top-level `libs` directory.
- Keep the domain layer in `libs/domain` as a framework-free Elixir Mix package.
- Keep the Phoenix API boundary in `apps/api`.
- Let the API app depend on the domain library with a local Mix path dependency.
- Avoid top-level `packages/` for Elixir code because it is already used by
  TypeScript packages in the pnpm workspace.
- Defer an umbrella split until we have enough backend surface area to justify
  separate Mix child apps.
- Use Phoenix as an API-only app with Ecto/PostgreSQL support.
- Do not keep generated Phoenix HTML, asset pipeline, LiveView, dashboard, or
  mailer files in the API app until the backend actually needs them.
- Add root scripts that delegate to Mix through Nx and include Elixir checks in
  the existing `pnpm check`, `pnpm build`, and pre-commit flows.

## Status

- Implemented `apps/api` as an API-only Phoenix application.
- Implemented `libs/domain` as the initial domain library.
- Linked `apps/api` to `libs/domain` with a local Mix path dependency.
- Removed generated Phoenix frontend files, asset configuration, dashboard, and
  mailer setup from the API app.
- Added Nx metadata, root Mix delegation scripts, Elixir format/lint/check
  scripts, and Elixir ignore rules.
