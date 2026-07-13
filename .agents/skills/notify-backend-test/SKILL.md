---
name: notify-backend-test
description: Write focused Notify backend tests without excessive cases or mocks. Use for ExUnit tests in apps/api, libs/domain, or libs/open_api; controller, context, changeset, database, tenant-isolation, contract, regression, factory, Faker, fixture, SQL Sandbox, or external-adapter test decisions.
---

# Notify Backend Test

Test business and contract risk at the lowest useful layer. Prefer real code and
real PostgreSQL behavior over internal mocks.

## Read First

Read `AGENTS.md`, the changed implementation, and the nearest test plus
`apps/api/test/support/data_case.ex` or `conn_case.ex` when applicable.

## Set A Test Budget

For one new behavior, start with only:

- one happy-path test;
- one meaningful validation or boundary test, when such a boundary exists;
- one authentication or tenant-isolation test, when security scope exists.

For a bug fix, add one regression test that fails before the fix. Exceed this
budget only for a named risk such as money, authorization, idempotency,
concurrency, destructive migration behavior, or multiple distinct contracts.
For a normal new endpoint, default to at most five new tests across all backend
layers. Name every additional distinct risk before exceeding that cap.

Do not repeat the same rule in domain, changeset, context, and controller tests.
Test it once at the lowest owning layer, then test only integration wiring above.

## Choose The Layer

- Test pure policy and lifecycle behavior in `libs/domain` without the database.
- Test changesets, constraints, queries, transactions, and tenant isolation with
  `Api.DataCase` and the real SQL Sandbox.
- Test HTTP status, authorization, and JSON contract with `ApiWeb.ConnCase`.
- Test OpenAPI paths and schema references in the existing OpenAPI test.
- Do not test Phoenix, Ecto, or library behavior that Notify does not own.

## Entity Factories And Faker

Do not build persisted Ecto entities repeatedly inside individual tests.

When the first persisted entity is introduced:

1. Add compatible `ex_machina` and `faker` dependencies with `only: :test`.
2. Create `apps/api/test/support/factory.ex` using `ExMachina.Ecto` and
   `Api.Repo`.
3. Import `Api.Factory` from `Api.DataCase` and `ApiWeb.ConnCase`.
4. Create valid defaults in one factory per entity and compose associations
   through factories.
5. Use `build`, `insert`, `params_for`, and explicit overrides from tests.

ExMachina creates and persists entities; Faker supplies realistic field values.
Use Faker inside factories for fields that are irrelevant to the
assertion, such as names or descriptive text. Use deterministic factory
sequences for unique indexed values to avoid random collisions. Always provide
the value explicitly when the test asserts it or when it defines the scenario.
Do not assert against whichever random value Faker happened to generate.

Until persisted entities exist, do not add unused factory dependencies. Small
pure domain values may use a local test builder when repetition appears.

## Mocking Policy

- Default to zero mocks.
- Never mock Repo, Ecto schemas, changesets, contexts, controllers, or pure
  domain modules.
- Mock only a true external boundary such as a payment or delivery provider,
  clock, email transport, or remote HTTP client.
- Put an external boundary behind a behavior and verify only calls that are
  part of the contract. Do not reproduce the provider internally.
- Do not sleep in tests or call real external services.

## Quality Rules

- Assert outcomes, persisted state, emitted contract, or explicit side effects.
- Keep setup in factories or shared setup only when at least two tests need it.
- Keep tests deterministic and independent; use `async: true` only when the
  sandbox and shared application state permit it.
- Avoid broad snapshots, exhaustive field permutations, and assertions on
  private implementation details.

## Verify

Run only the narrow owning suite first:

```sh
pnpm domain:test
pnpm api:test
```

Use the command relevant to the changed project, then load
`notify-verify-change` to decide whether broader checks are justified.
