---
name: notify-frontend-test
description: Write focused Notify frontend tests without excessive cases, snapshots, or mocks. Use for Vitest tests in apps/web or packages/ui; component interactions, forms, validation, TanStack Query, routes, loading, error, accessibility, regression, typed API fixtures, browser behavior, or deciding when no unit test is needed.
---

# Notify Frontend Test

Test behavior a user can observe. Do not turn implementation structure into a
large mocked test suite.

## Read First

Read `AGENTS.md`, `docs/frontend.md`, the changed component, the nearest test,
and the current test render/setup helpers before choosing tools.

## Decide Whether To Add A Test

Add an automated test for interaction, validation, state transition, data
mapping, accessibility behavior, or a regression. Static copy, spacing, and
page composition usually need typecheck, build, and visual inspection rather
than a unit test.

For one behavior, start with only:

- one successful user path;
- one meaningful validation or failure path, when it exists;
- one loading or disabled-state assertion, only when users depend on it.

For a bug fix, add one regression test that fails before the fix. Do not create
a test for every prop, Zod field, query status, or visual variant unless each
represents a distinct product risk.
For one component flow, default to at most three automated tests. Combine the
pending-state assertion with the happy path when practical. Name the additional
risk before exceeding that cap.

## Test At The Right Boundary

- Test reusable component contracts in `packages/ui`.
- Test product workflows and form/query integration in `apps/web`.
- Test pure data transformation as a small unit without rendering.
- Verify responsive layout and visual hierarchy in a browser, not by asserting
  long class strings.
- Do not duplicate a shared component test in every consuming page.

## Rendering And Interaction

- Use the repository's existing React `act`/`createRoot` render and setup
  helpers. `@testing-library/react` is not currently a direct dependency; do not
  import transitive Testing Library packages.
- Propose a shared Testing Library harness as a separate justified change only
  when repeated user-level interactions cannot be expressed safely with the
  current helpers.
- Prefer roles, labels, accessible names, and visible text over selectors tied
  to DOM structure.
- Exercise the real form, query, router, and shared UI integration when that is
  the behavior under test.
- Use a fresh QueryClient per test with retries disabled when testing TanStack
  Query behavior.
- Keep typed API payload builders small. Provide scenario values explicitly and
  centralize repeated irrelevant defaults in a test fixture builder.

## Mocking Policy

- Default to zero component mocks.
- Do not mock `@notify/ui`, child components, TanStack Form, TanStack Query,
  TanStack Router, or Zod merely to simplify a test.
- Mock only the network/API boundary or an unavailable browser API.
- Prefer one small fake response at the boundary over several mocked hooks and
  implementation functions.
- Add a network mocking library only when repeated integration tests justify
  the dependency; do not add one for a single test.

## Assertion Policy

- Assert user-visible output, accessibility state, navigation, submitted data,
  or cache-visible behavior.
- Avoid broad snapshots and assertions on private state or function calls.
- Assert styling only when it is a documented public variant or state contract.
- Keep each test focused on one behavior while allowing multiple assertions
  that prove that behavior.

## Verify

Run only the owning project first:

```sh
pnpm --filter @notify/ui test
pnpm --filter @notify/web test
```

Pair the relevant test command with that project's typecheck and build. Load
`notify-verify-change` to decide whether broader checks are justified.
