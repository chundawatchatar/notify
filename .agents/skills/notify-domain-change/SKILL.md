---
name: notify-domain-change
description: Implement framework-free Notify business concepts and policies in libs/domain. Use for domain structs, lifecycle transitions, supported values, validation rules, invariants, commands, or decisions that must not depend on Phoenix, Ecto, HTTP, or PostgreSQL.
---

# Notify Domain Change

Express stable business meaning as pure Elixir with focused tests.

## Read First

Read `AGENTS.md`, `docs/architecture.md`, `libs/domain/README.md`, and the
nearest domain module and test.

## Boundary Test

Put logic in `libs/domain` only when it can run without Phoenix, Ecto, Repo,
HTTP, PostgreSQL, Redis, or deployment configuration. Otherwise keep it in the
owning application.

## Workflow

1. State the invariant or decision in business language.
2. Reuse an existing domain concept when one owns the behavior; add a module
   only for a distinct concept.
3. Define explicit types and stable return values such as `{:ok, value}` or
   `{:error, reason}`.
4. Keep functions deterministic. Pass clocks, IDs, and external results in as
   values when deterministic tests require them.
5. Validate at construction and at state transitions so invalid domain states
   do not silently spread.
6. Keep transport field names, JSON formatting, persistence IDs, and changesets
   outside this library.
7. Add focused ExUnit tests for valid behavior, boundary values, and rejected
   transitions.

## Guardrails

- Do not make the domain module a mirror of a database table.
- Do not add dependencies merely to avoid a small pure helper.
- Preserve public return shapes unless all callers are updated together.
- Keep tenant or workspace identity explicit when it affects a business rule.

## Verify

Run:

```sh
pnpm domain:test
pnpm elixir:format:check
```
