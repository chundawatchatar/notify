# 011 Adopt Astro Marketing App

## Status

Implemented.

## Goal

Adopt Astro as the implementation for the public marketing website and remove
the temporary TanStack Start marketing app.

## Context

The dashboard should remain on TanStack Start because it is an authenticated
product application with richer client-side routing and state. The public
marketing website is a better fit for Astro because it is static-first,
content-friendly, SEO-focused, and can still render React components from the
shared UI package.

## Standard Commands Used

- `pnpm create astro@latest apps/marketing-astro --template minimal --no-install --no-git --no-ai --yes`
- `pnpm --dir apps/marketing-astro astro add react --yes`
- `pnpm --dir apps/marketing-astro astro add tailwind --yes`

The generated Astro app was then moved to `apps/marketing` after the framework
decision was made.

## Decisions

- Keep `apps/marketing` as the only public marketing app.
- Use Astro for `@notify/marketing`.
- Remove the TanStack Start marketing implementation.
- Use `@astrojs/react` so the app can consume shared React components from
  `@notify/ui`.
- Use Tailwind CSS through the shared `@notify/styles/app.css` entrypoint.
- Keep Astro, React, Tailwind, and TypeScript versions controlled by the pnpm
  workspace catalog.
- Use `MARKETING_PORT=3200` for local development.
- Keep `pnpm marketing` as the single marketing app command.
- Keep `pnpm dev:all` pointed at `@notify/marketing`.

## Scope

- Replace the TanStack Start app under `apps/marketing` with the Astro app.
- Add an Astro page that imports shared styles and renders a shared-UI React
  marketing component.
- Add Nx-discovered scripts for dev, build, preview, and typecheck.
- Update root scripts, `.env.example`, README, and development docs.
- Remove temporary `marketing:astro` naming and port configuration.

## Non-Goals

- Do not add production deployment wiring for Astro yet.
- Do not duplicate shared UI components locally in the Astro app.
- Do not add CMS, MDX content collections, analytics, or SEO automation yet.

## Acceptance Criteria

- `pnpm marketing` starts the Astro app on port `3200`.
- `pnpm nx run @notify/marketing:typecheck` passes.
- `pnpm nx run @notify/marketing:build` passes.
- Shared styles are imported through `@notify/styles/app.css`.
- UI primitives are imported from `@notify/ui`.
- No TanStack Start marketing files remain in `apps/marketing`.
