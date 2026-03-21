<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Execution Guide (Frontend Architecture Lock)

## Purpose

This guide defines the mandatory working rules for any coding agent in this repository.
The goal is a consistent, scalable, non-duplicated frontend codebase.

This guide is architecture policy, not feature documentation.

## Next.js Documentation Requirement (CRITICAL)

**Before writing ANY Next.js code, read the relevant documentation in `node_modules/next/dist/docs/`.**

Your training data is outdated. The bundled docs are the source of truth for:

- Routing conventions (`params` and `searchParams` are now Promises - must be awaited)
- Server/Client Components patterns
- `use cache` directive and caching APIs (`cacheLife`, `cacheTag`, `updateTag`)
- Server Functions/Actions (`use server` directive)
- Data fetching patterns
- New type helpers (`PageProps`, `LayoutProps`)

Key docs to read first:

1. `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
2. `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
3. `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
4. `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`
5. `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`
6. `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`

## Mandatory Read Order (Before Any Task)

Before planning or editing any file, the agent must read these documents in order:

1. Next.js docs in `node_modules/next/dist/docs/` (relevant to the task)
2. [FRONTEND_ARCHITECTURE_ANALYSIS.md](FRONTEND_ARCHITECTURE_ANALYSIS.md)
3. [AGENT_EXECUTION_GUIDE.md](AGENT_EXECUTION_GUIDE.md)
4. [PROJECT_STRUCTURE_LOG.md](PROJECT_STRUCTURE_LOG.md) (if exists)

If step 4 does not exist yet, create it once and keep updating only that same file for the rest of the project.

## Non-Negotiable Rules

1. Always stay inside the defined architecture. No ad-hoc structure.
2. Reuse before create: if a similar file/component/hook exists, extend it.
3. Avoid duplicate logic, duplicate UI blocks, duplicate utility functions.
4. Every structural decision must be reflected in PROJECT_STRUCTURE_LOG.md.
5. Do not add Persian text in source code.
6. All code comments must be English.
7. Comments must be short, precise, and functional. No long paragraph comments.
8. Keep comments as short phrase-like lines where possible.

## Final Target Structure (Must Stay Consistent)

```text
project-root/
  app/
    layout.tsx
    globals.css
    not-found.tsx

    (public)/
      (marketing)/
        layout.tsx
        page.tsx
        _components/
          sections/
      (auth)/
        login/
        signup/
      (pages)/
        about/
        features/
        pricing/
        contact/

    (dashboard)/
      layout.tsx
      page.tsx
      _components/
      (pages)/
        account/
        billing/
        support/

    api/

  components/
    ui/
    shared/
    feature/
    payments/
    utility/

  hooks/
  actions/
  lib/
  db/
    schema/
    migrations/
    seed/

  public/
    assets/
      images/
      icons/
      fonts/
    manifest.webmanifest
    sw.js
    offline.html

  tests/
    unit/
    e2e/

  docs/

  .env.example
  Dockerfile
  docker-compose.yml
  .dockerignore
  package.json
  tsconfig.json
  next.config.ts
```

## PWA + APK Readiness Rules (Installable in Chrome)

This architecture must always remain PWA-ready.
All features must be implemented in a way that supports both:

1. Installable Chrome Web App (Add to Home Screen / Install App)
2. Future APK packaging without architecture rewrite

### Mandatory PWA Requirements

1. Keep a valid `public/manifest.webmanifest` with:

- app `name` and `short_name`
- `start_url`
- `display: standalone`
- `theme_color` and `background_color`
- complete icon set (`192x192`, `512x512`, maskable)

2. Keep service worker enabled (`public/sw.js` or framework-managed equivalent).
3. Provide offline fallback (`public/offline.html` and route-level fallback behavior).
4. Set required metadata in app layout/head for installability.
5. Ensure secure context compatibility (HTTPS-ready assumptions in deployment).

### APK Output Compatibility Requirements

1. Keep routing stable and deep-link-safe for Trusted Web Activity wrappers.
2. Avoid browser-only critical flows that fail in standalone/PWA mode.
3. Keep auth and payment redirects compatible with standalone context.
4. Do not hardcode environment/domain assumptions that block APK wrapping.
5. Treat PWA as single source of truth; APK is a packaging layer, not a second app.

## Responsive Architecture Rules (Mobile-First, Mandatory)

All UI must follow Mobile-First implementation.
Start from smallest screens, then scale up.

### Breakpoint Contract

1. Phones: `320px` to `767px`

- Primary design baseline: `375px` (or `414px` if required by screen spec)

2. Tablets: `768px` to `1023px`
3. Laptops / Small Desktops: `1024px` to `1439px`
4. Large Desktops: `1440px+`

### Implementation Rules

1. Base classes must target phone layout first.
2. Add progressive overrides at `768`, `1024`, and `1440` breakpoints only.
3. Do not build desktop-first and back-patch mobile fixes.
4. Keep component behavior and spacing consistent across route groups.
5. Test each feature in all four ranges before considering task complete.
6. Keep responsive logic inside approved structure (`components/*`, `app/*`), not ad-hoc files.

## File Responsibility Rules

- app/: routing, layouts, pages, route-level composition only.
- components/ui/: reusable design-system primitives.
- components/shared/: reusable business-agnostic composed blocks.
- components/feature/: feature-scoped reusable blocks.
- hooks/: reusable client hooks only.
- actions/: server actions only (mutation/read orchestration).
- lib/: stateless helpers, clients, adapters, constants.
- db/: schema, migrations, seed.
- public/assets/: all static assets (images/icons/fonts).
- docs/: long-form project documentation.

## Server/Client Boundary Rules

1. Default to Server Component.
2. Add "use client" only when hooks/events/browser APIs are required.
3. Use wrapper pattern when server data is required by interactive UI.
4. Keep server-only logic out of client components.

## Next.js Breaking Changes (Must Follow)

These are critical changes from older Next.js versions. Ignore your training data and follow these rules:

### Dynamic Route Parameters

- `params` and `searchParams` are now **Promises** and must be awaited:

```tsx
// Correct (new)
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // ...
}

// Wrong (old)
export default function Page({ params }: { params: { slug: string } }) {
  const { slug } = params; // ERROR - params is a Promise
}
```

### Type Helpers

- Use `PageProps<'/path'>` and `LayoutProps<'/path'>` global helpers:

```tsx
export default async function Page(props: PageProps<"/blog/[slug]">) {
  const { slug } = await props.params;
  return <h1>Blog post: {slug}</h1>;
}
```

### Caching

- `fetch` requests are **not cached by default**
- Use `use cache` directive for caching components/functions
- Use `cacheLife()` and `cacheTag()` for cache control
- Use `updateTag()` or `revalidateTag()` for revalidation
- Use `refresh()` from `next/cache` to refresh client router

### Server Functions

- Use `'use server'` directive at function or file level
- Server Functions are publicly accessible via POST - always verify auth

## Naming and Reuse Rules

1. One responsibility per file.
2. Keep file names explicit and stable.
3. Prefer extension of existing modules over creating near-duplicate modules.
4. New utilities must be generic and placed in lib/ only if reusable.

## Environment and Container Rules

1. Every new environment variable must be added to .env.example with a short English description.
2. If runtime/build changes affect container behavior, sync all of these files together:
   - Dockerfile
   - docker-compose.yml
   - .dockerignore
3. Never keep hidden env dependencies undocumented.
4. PWA-related environment keys (if introduced) must be documented in `.env.example`.

## Required Ongoing Log File

Agent must maintain exactly one continuous log file:

- [PROJECT_STRUCTURE_LOG.md](PROJECT_STRUCTURE_LOG.md)

This file is the agent's operational memory for this repository.
After every meaningful change, update this file.
Do not create multiple parallel logs.

### PROJECT_STRUCTURE_LOG.md must include

1. Current architecture snapshot (short tree).
2. File map summary: each touched file and its purpose.
3. Change journal: what changed and why.
4. Reuse decisions: what was reused instead of newly created.
5. Pending refactors/TODOs.
6. Known constraints and assumptions.

## Task Execution Checklist (Every Task)

1. Read Next.js docs in `node_modules/next/dist/docs/` for relevant APIs.
2. Read required project docs in order.
3. Locate reusable modules first.
4. Implement inside approved structure only.
5. Keep code and comments English-only.
6. Keep comments short and exact.
7. Update PROJECT_STRUCTURE_LOG.md.
8. Verify no duplication introduced.
9. Verify .env.example / Docker files if relevant.
10. Verify PWA installability constraints are not broken.
11. Verify responsive behavior on all 4 breakpoint ranges.

## Output Quality Standard

Changes must be:

- consistent with architecture,
- non-duplicated,
- traceable in PROJECT_STRUCTURE_LOG.md,
- easy for the next agent to continue without confusion.

If any requested change conflicts with this guide, resolve in favor of this guide and record the decision in PROJECT_STRUCTURE_LOG.md.
