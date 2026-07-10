# 010 Add Marketing App

## Status

Superseded by `011-adopt-astro-marketing-app.md`.

## Goal

Add a dedicated public marketing website app for the apex product domain while
keeping the dashboard app in `apps/web`.

This spec originally added a TanStack Start marketing app. The implementation
was later replaced with Astro in `011-adopt-astro-marketing-app.md`.

## Context

Notify needs separate public and authenticated web surfaces:

- `notify.tld` for product marketing, pricing, and public conversion pages.
- `app.notify.tld` for the authenticated dashboard.

The dashboard already uses TanStack Start. The marketing app should use the same
frontend foundation so shared UI, shared styles, package versions, and future
design system work remain consistent across the platform.

## Decisions

- Create `apps/marketing` as a TanStack Start React app.
- Use the existing pnpm catalog versions for TanStack Start, Router, React,
  Vite, TypeScript, Tailwind CSS, and testing packages.
- Import shared styling through `@notify/styles/app.css`.
- Build page UI with `@notify/ui` instead of local component copies.
- Use `MARKETING_PORT=3200` for local development.
- Keep Storybook in `apps/storybook` and reusable UI only in `packages/ui`.

## Scope

- Add `@notify/marketing` package manifest with Nx-discovered scripts.
- Add TanStack Start Vite, router, root route, and index route files.
- Add root scripts for running the marketing app.
- Include the marketing app in `dev:all`.
- Update local environment examples and developer/domain docs.

## Non-Goals

- Do not add Astro, Next.js, or another web framework.
- Do not add production deployment workflows in this spec.
- Do not add docs site implementation.
- Do not add authentication, billing, or API integration to the marketing app.

## Acceptance Criteria

- `pnpm marketing` starts the public marketing app on port `3200`.
- `pnpm dev:all` starts API, dashboard web, and marketing apps together.
- `pnpm nx run @notify/marketing:typecheck` passes.
- `pnpm nx run @notify/marketing:test` passes.
- `pnpm nx run @notify/marketing:build` passes.
- README and developer docs list the marketing app and local port.
