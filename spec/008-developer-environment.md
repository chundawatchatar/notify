# Developer Environment

Add a lightweight, repeatable developer environment setup so contributors can
install the same runtime versions without reading through every package first.

## Decision

- Use mise as the repository-level runtime version manager.
- Keep Docker Compose responsible for infrastructure services such as
  PostgreSQL and Redis.
- Pin the runtimes currently used by the repository:
  - Node.js 24.18.0
  - pnpm 11.7.0
  - Erlang/OTP 29
  - Elixir 1.20.2 compiled for OTP 29
- Keep `.nvmrc` as a fallback for developers who only need the JavaScript
  toolchain, but document that mise is the preferred setup path.
- Do not add Nix, devbox, or asdf configuration in this step.

## Implementation Plan

- Add `.mise.toml` at the repository root.
- Add a single setup command that prepares runtimes, dependencies, `.env`, and
  local services.
- Move detailed developer instructions into a dedicated development document.
- Keep existing pnpm, Nx, Mix, and Docker scripts unchanged.

## Status

- Added `.mise.toml` with pinned Node.js, pnpm, Erlang/OTP, and Elixir
  versions.
- Added `pnpm setup` backed by `tools/setup-dev.sh`.
- Added `docs/development.md` for detailed developer setup instructions.
- Kept README focused on the quick setup command and linked to the detailed
  development guide.
