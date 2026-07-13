---
name: notify-ui-change
description: Add or modify reusable Notify React design-system components in packages/ui. Use for shared primitives, controls, overlays, navigation, icons, accessibility behavior, variants, public exports, UI tests, or Storybook examples used across apps.
---

# Notify UI Change

Add shared UI only when the component is reusable or belongs to the design
system.

## Read First

Read `AGENTS.md`, the shared UI section of `docs/frontend.md`, and the nearest
component and test. Search `packages/ui/src/index.ts` before adding anything.

## Placement Decision

- Keep page layout, product copy, domain tables, and feature-specific empty
  states in the owning app.
- Put generic controls, overlays, navigation primitives, icons, and repeated
  data-display patterns in `packages/ui`.
- Extend an existing component or variant when that expresses the same concept.

## Workflow

1. Prefer the repository's existing Radix and utility patterns.
2. Keep the API composable, typed, accessible, and controlled where state must
   be owned by the caller.
3. Use Lucide icons when a standard icon exists. Keep custom brand icons in the
   shared icon module.
4. Use stable dimensions for controls and navigation elements so content and
   state changes do not shift layout.
5. Export the public component and relevant types from
   `packages/ui/src/index.ts`.
6. Load `notify-frontend-test` and add only the accessibility, state, keyboard,
   variant, or public-export coverage justified by the component contract.
7. Add or update a Storybook story for a visual component with meaningful
   states.

## Guardrails

- Avoid app-specific imports and business data types.
- Do not create nested card composition inside a shared component.
- Do not create a text button where a familiar icon-only action is clearer;
  provide an accessible label and tooltip.
- Preserve existing component behavior unless the request explicitly changes
  the contract.

## Verify

Run:

```sh
pnpm --filter @notify/ui test
pnpm --filter @notify/ui typecheck
pnpm --filter @notify/ui build
```

Typecheck any consuming app changed by the new public API.
