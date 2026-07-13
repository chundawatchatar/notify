---
name: notify-marketing-change
description: Build or modify Notify public marketing pages in apps/marketing. Use for Astro routes, public React page components, homepage, platform, developers, security, pricing, marketing navigation, shared header or footer, SEO content, or links into dashboard authentication.
---

# Notify Marketing Change

Keep the public website content-focused, consistent, and separate from the
authenticated product app.

## Read First

Read `AGENTS.md`, the marketing section of `docs/frontend.md`, and the nearest
Astro page and React page component. Inspect `MarketingShell.tsx` before
changing navigation or shared layout.

## Workflow

1. Add the Astro route under `apps/marketing/src/pages` and render a focused
   React component when interactivity or shared composition requires it.
2. Wrap every public page with `MarketingShell` so header and footer remain
   consistent.
3. Update the shared navigation once; do not copy headers or footers into page
   components.
4. Reuse `@notify/ui` and existing typography and spacing patterns.
5. Link sign-in and signup through `marketingUrls`, which respects
   `PUBLIC_WEB_APP_URL`. Do not duplicate authentication UI in marketing.
6. Keep page copy aligned with `docs/product-map.md` and implemented product
   capabilities. Mark future capabilities honestly.
7. Ensure headings wrap naturally without fixed line heights that cause
   overlap.
8. Load `notify-frontend-test` only when the page adds interaction or fixes a
   behavioral regression. Do not unit-test static marketing copy or spacing.

## Visual Guardrails

- Make the product or offer visible in the first viewport.
- Use real product visuals or relevant bitmap assets when imagery is needed.
- Keep header and footer identical across all marketing routes.
- Avoid nested cards, decorative gradients, and oversized text inside compact
  sections.
- Verify responsive navigation and long headings at mobile and desktop widths.

## Verify

Run:

```sh
pnpm --filter @notify/marketing typecheck
pnpm --filter @notify/marketing build
```

Visually inspect changed routes when layout or responsive behavior changes.
