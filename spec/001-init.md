# Init the Project - Notify App

Notify is a SaaS product that provides notification facilities for web apps. It
will offer a subscription-based, plug-and-play notification solution for
early-stage startups.

## Architecture

Use an Nx monorepo with pnpm workspaces. Apps and packages should be controlled
by workspace package manifests rather than generated as Nx-owned projects. Each
future app or package should have its own `package.json`, with Nx integration
defined alongside the package when needed.

## Tools and Tech

- TanStack Start
- Tailwind CSS
- shadcn
- TypeScript
- oxlint
- oxfmt
- Biome

## Task

Set up the basic repository structure with pnpm workspaces and an Nx monorepo.
Apps and packages will be created one by one in later specs.

## Status

Implemented.
