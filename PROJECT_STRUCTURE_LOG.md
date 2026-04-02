# PROJECT_STRUCTURE_LOG.md

## Current Architecture Snapshot

```text
dot-mag/
├── app/
│   ├── layout.tsx              # Root layout with RTL, Persian font, Theme
│   ├── globals.css             # Tailwind + custom styles + color palette
│   ├── page.tsx                # Home page (fetches from API)
│   ├── about/
│   │   └── page.tsx            # About Us page
│   ├── api/
│   │   ├── .well-known/
│   │   │   └── assetlinks.json/route.ts    # Digital Asset Links for Android TWA
│   │   ├── articles/
│   │   │   ├── route.ts        # GET/POST articles
│   │   │   └── [id]/route.ts   # GET/PUT/DELETE single article
│   │   ├── radios/
│   │   │   ├── route.ts        # GET/POST radios
│   │   │   └── [id]/route.ts   # GET/PUT/DELETE single radio
│   │   └── magazines/
│   │       ├── route.ts        # GET/POST magazines
│   │       └── [id]/route.ts   # GET/PUT/DELETE single magazine
│   ├── archive/
│   │   ├── page.tsx            # Magazine archive listing (fetches from API)
│   │   └── [slug]/
│   │       ├── page.tsx        # Magazine detail page (cover + description + CTA)
│   │       ├── read/page.tsx   # Full-screen magazine reader page
│   │       └── _components/
│   │           └── MagazineReaderClient.tsx
│   ├── posts/
│   │   ├── page.tsx            # Articles listing (fetches from API)
│   │   └── [slug]/page.tsx     # Single article page (fetches from API)
│   ├── radio/
│   │   ├── layout.tsx           # Radio metadata layout
│   │   ├── page.tsx             # Radio listing page
│   │   └── [slug]/page.tsx      # Single radio detail + players
│   └── (admin)/
│       └── admin-panel/
│           ├── layout.tsx      # Admin auth layout with logout
│           ├── page.tsx        # Admin dashboard/login
│           └── _components/
│               ├── LoginForm.tsx       # Login page
│               ├── Dashboard.tsx       # Articles, Magazines, Radios, Tags tabs
│               ├── ArticleEditor.tsx   # Article CRUD form
│               ├── MagazineEditor.tsx  # Magazine CRUD form + pages
│               └── RadioEditor.tsx     # Radio CRUD form + highlight segments
├── android/
│   ├── .gitignore              # Ignore Android build artifacts
│   ├── README.md               # Android build documentation
│   └── twa-manifest.json       # Bubblewrap TWA configuration
├── components/
│   ├── ui/
│   │   ├── Logo.tsx            # Logo component
│   │   └── Button.tsx          # Button component
│   ├── shared/
│   │   ├── Header.tsx          # Global header with nav & theme toggle
│   │   ├── Footer.tsx          # Global footer
│   │   └── ThemeProvider.tsx   # Dark/Light mode context
│   └── feature/
│       ├── ArticleCard.tsx     # Article card variants
│       ├── AudioPlayer.tsx     # Reusable custom audio player + manual download
│       ├── MagazineCard.tsx    # Magazine cover card
│       ├── MagazineReader.tsx  # In-app magazine reader
│       └── RadioCard.tsx       # Radio list card
├── hooks/                      # Custom React hooks (empty)
├── lib/
│   ├── auth.ts                 # JWT, session, password utilities
│   ├── magazines.ts            # Shared magazine slug/data helpers for archive routes
│   └── uploads.ts              # Upload URL normalizer for public assets
├── actions/
│   ├── authActions.ts          # Server action: login/logout
│   ├── articleActions.ts       # Server actions: Article CRUD
│   ├── magazineActions.ts      # Server actions: Magazine CRUD
│   └── radioActions.ts         # Server actions: Radio CRUD + segment CRUD
├── prisma/
│   ├── schema.prisma           # Database schema (User, Article, Magazine, Radio, segments)
│   └── seed.ts                 # Database seeding script
├── public/
│   ├── assets/
│   │   ├── fonts/
│   │   │   └── webfonts/
│   │   │       └── Vazirmatn[wght].woff2
│   │   ├── images/
│   │   │   └── dot-logo.png
│   │   └── icons/              # PWA icons
│   ├── manifest.webmanifest    # PWA manifest
│   ├── sw.js                   # Service worker
│   └── offline.html            # Offline fallback page
├── middleware.ts               # Route protection for /admin-panel
├── .env.example                # Environment variables template
├── AGENTS.md                   # Architecture rules (locked)
├── CLAUDE.md                   # Agent instructions (locked)
├── ADMIN_SETUP.md              # Detailed admin panel setup
├── DEPLOYMENT_GUIDE.md         # Complete deployment guide
├── PROJECT_STRUCTURE_LOG.md    # This file
├── package.json                # Dependencies + db scripts
├── Dockerfile                  # Build configuration
├── docker-compose.yml          # PostgreSQL + web services
└── tsconfig.json
```

## File Map Summary

### App Directory (Updated for API)

| File                                           | Purpose                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `app/layout.tsx`                               | Root layout with RTL direction, Vazirmatn font, ThemeProvider, Header, Footer |
| `app/globals.css`                              | Custom color palette, Tailwind config, typography, animations                 |
| `app/page.tsx`                                 | Home page - fetches articles/magazines/radios from API                        |
| `app/posts/page.tsx`                           | Articles listing - fetches from API with category filter                      |
| `app/posts/[slug]/page.tsx`                    | Single article page + related articles via Prisma with decoded slug matching  |
| `app/archive/page.tsx`                         | Magazine archive - fetches from API                                           |
| `app/archive/[slug]/page.tsx`                  | Magazine detail page (desktop two-column, CTA to reader)                      |
| `app/archive/[slug]/read/page.tsx`             | Full-screen magazine reader page                                              |
| `app/radio/layout.tsx`                         | Radio route metadata                                                          |
| `app/radio/page.tsx`                           | Radio listing page                                                            |
| `app/radio/[slug]/page.tsx`                    | Radio detail page with full audio + highlighted segments                      |
| `app/about/page.tsx`                           | About page with unified posts-like title hero and manifesto content           |
| `app/api/.well-known/assetlinks.json/route.ts` | Digital Asset Links API for Android TWA verification                          |
| `app/api/articles/route.ts`                    | API GET all articles / POST create article                                    |
| `app/api/articles/[id]/route.ts`               | API GET/PUT/DELETE single article                                             |
| `app/api/radios/route.ts`                      | API GET all radios / POST create radio                                        |
| `app/api/radios/[id]/route.ts`                 | API GET/PUT/DELETE single radio                                               |
| `app/api/upload/route.ts`                      | API upload endpoint for image/PDF/audio                                       |
| `app/api/uploads/[filename]/route.ts`          | Serves uploaded files with byte-range support (PDF/image/audio)               |
| `app/api/magazines/route.ts`                   | API GET all magazines / POST create magazine                                  |
| `app/api/magazines/[id]/route.ts`              | API GET/PUT/DELETE single magazine                                            |

### Admin Panel

| File                                                     | Purpose                                                  |
| -------------------------------------------------------- | -------------------------------------------------------- |
| `app/(admin)/admin-panel/layout.tsx`                     | Admin layout with logout button                          |
| `app/(admin)/admin-panel/page.tsx`                       | Main page - shows login or dashboard                     |
| `app/(admin)/admin-panel/_components/LoginForm.tsx`      | Login form component                                     |
| `app/(admin)/admin-panel/_components/Dashboard.tsx`      | Dashboard with Articles, Magazines, Radios, Tags tabs    |
| `app/(admin)/admin-panel/_components/ArticleEditor.tsx`  | Article editor form                                      |
| `app/(admin)/admin-panel/_components/RichTextEditor.tsx` | WYSIWYG article editor toolbar + contenteditable surface |
| `app/(admin)/admin-panel/_components/MagazineEditor.tsx` | Magazine editor form                                     |
| `app/(admin)/admin-panel/_components/RadioEditor.tsx`    | Radio editor + highlighted segment manager               |

### Authentication & Actions

| File                             | Purpose                                                              |
| -------------------------------- | -------------------------------------------------------------------- |
| `lib/auth.ts`                    | JWT, session, password utilities                                     |
| `lib/magazines.ts`               | Shared archive magazine fetch + slug normalize/decode helpers        |
| `lib/uploads.ts`                 | Normalizes upload URLs for CDN/API                                   |
| `lib/clientUpload.ts`            | Shared admin uploader with progress callbacks, timeout, and retry    |
| `lib/articleContent.ts`          | Converts legacy/plain text to safe sanitized HTML for post rendering |
| `middleware.ts`                  | Route protection for /admin-panel                                    |
| `app/actions/authActions.ts`     | Login/logout server actions                                          |
| `app/actions/articleActions.ts`  | Article CRUD server actions                                          |
| `app/actions/magazineActions.ts` | Magazine CRUD server actions                                         |
| `app/actions/radioActions.ts`    | Radio CRUD + highlighted segment CRUD                                |

### Database

| File                   | Purpose                            |
| ---------------------- | ---------------------------------- |
| `prisma/schema.prisma` | Database schema definition         |
| `prisma/seed.ts`       | Initial data + admin user creation |

### Components

| File                                    | Purpose                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------ |
| `components/ui/Logo.tsx`                | Logo with dark/light variants                                            |
| `components/ui/UploadStatus.tsx`        | Unified upload progress/success/error indicator for admin file inputs    |
| `components/shared/Header.tsx`          | Sticky header, navigation, theme toggle, mobile menu                     |
| `components/shared/Footer.tsx`          | Footer with links, social, copyright                                     |
| `components/shared/ThemeProvider.tsx`   | Dark/Light mode context with localStorage                                |
| `components/feature/ArticleCard.tsx`    | Article cards (default, featured, horizontal)                            |
| `components/feature/AudioPlayer.tsx`    | Custom buffered audio player with manual download                        |
| `components/feature/MagazineCard.tsx`   | Magazine cover card with stronger visual separation + date/page meta row |
| `components/feature/MagazineReader.tsx` | Full-screen reader with fixed top/bottom bars and real PDF download flow |
| `components/feature/RadioCard.tsx`      | Radio list card for public pages                                         |

### PWA Files

| File                          | Purpose                                                   |
| ----------------------------- | --------------------------------------------------------- |
| `public/manifest.webmanifest` | PWA manifest for installability                           |
| `public/sw.js`                | Service worker for offline support + audio cache strategy |
| `public/offline.html`         | Offline fallback page                                     |

### Configuration & Documentation

| File                  | Purpose                                           |
| --------------------- | ------------------------------------------------- |
| `.env.example`        | Environment variables template                    |
| `docker-compose.yml`  | PostgreSQL + web services orchestration           |
| `Dockerfile`          | Build configuration for Next.js container startup |
| `package.json`        | Dependencies + db scripts (generate, push, seed)  |
| `ADMIN_SETUP.md`      | Detailed local setup instructions                 |
| `DEPLOYMENT_GUIDE.md` | Complete deployment & API documentation           |
| `AGENTS.md`           | Architecture rules (locked - read-only)           |
| `CLAUDE.md`           | Agent instructions (locked)                       |

## Change Journal

| Date       | Change                                           | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-03-21 | Initial project setup                            | Project foundation with RTL, font, colors                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-03-21 | Created components                               | Header, Footer, Cards, Reader                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-03-21 | Created all pages                                | Home, Posts, Archive, About                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-03-21 | Added PWA files                                  | Manifest, SW, offline page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-03-25 | Added Android TWA setup                          | Bubblewrap configuration for Android APK build                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-03-25 | Added Digital Asset Links                        | API route for TWA verification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-03-27 | UI spacing fixes                                 | Fixed hamburger menu background, button spacing, footer buffer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-03-27 | Persian text updates                             | Replaced "فرسته" with "نوشته‌ها" (8 instances across 5 files)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-03-27 | Spacing system overhaul                          | Added CSS utilities for consistent spacing                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-03-27 | Hashtag category system                          | Implemented #ازـما #ازـشما #ازـدیگران filtering with "no posts" handling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-03-27 | Search feature removal                           | Removed search functionality from header - simplified UI                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-03-27 | **Admin Panel Implementation**                   | **Complete CRUD system with PostgreSQL, JWT auth, API routes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-03-27 | Database migration                               | Moved from static JSON to PostgreSQL with Prisma ORM                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-03-27 | API endpoints created                            | RESTful API for articles and magazines                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-03-27 | Admin authentication                             | JWT-based auth with httpOnly cookies                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-03-27 | Admin UI implementation                          | Dashboard with Articles & Magazines tabs, full CRUD forms                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-03-27 | Updated public pages                             | All pages now fetch from API instead of static JSON imports                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-03-27 | Removed JSON data files                          | data/articles.json and data/magazines.json deleted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-03-30 | Magazine freshness fixes                         | Forced dynamic archive/reader pages, tag-based cache busting, larger cover uploads                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-03-30 | Cache revalidate signature                       | Added required cache profile to `revalidateTag` for magazine mutations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-03-30 | Upload path normalization                        | Upload API now returns /api/uploads URLs, added helper to normalize legacy /uploads paths, PDF served via API                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-03-30 | PDF spread rendering fix                         | Magazine reader now uses stable left/right canvases for single/two-page PDF display                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-03-30 | Slug normalization for archive                   | Archive reader accepts Persian/Arabic/ASCII digit variants to prevent 404 on localized slugs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-03-30 | Archive slug decoding                            | Decoded percent-encoded slugs and kept archive route fully dynamic to resolve localized magazine pages                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-03-30 | PDF SSR compatibility                            | Lazy-loaded pdfjs on the client to avoid DOM APIs during server render (fixes DOMMatrix errors)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-03-31 | PDF worker cleanup                               | Switched pdfjs loader to use bundled workerSrc via GlobalWorkerOptions to avoid runtime load errors                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-03-31 | PDF worker type declaration                      | Added module declaration for pdfjs worker to satisfy TypeScript during build                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-03-31 | PDF reader SSR + worker fix                      | MagazineReader uses client wrapper (no SSR), versioned CDN workerSrc; switched to legacy pdfjs build for Safari compatibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-03-31 | Archive PDF loading stability                    | Fixed loading/empty-state render condition, switched worker to local module, added load timeout and byte-range support                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-03-31 | Worker fallback for pdfjs                        | If workerSrc cannot be resolved at runtime, reader now falls back to `disableWorker` instead of failing the whole PDF load                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-03-31 | Seed bootstrap hardening                         | Updated `db:seed` script to run `db:push` first so first-run admin seed works on empty databases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-03-31 | Admin text color stabilization                   | Added explicit light/dark text colors on admin layout and admin form/list wrappers to prevent black text on mobile devices                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-04-01 | Radio Dot module implementation                  | Added Radio + RadioSegment schema, radio actions/API/routes/pages, admin radio CRUD tab/editor, reusable audio player, and service worker audio caching flow                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-04-01 | Posts slug route 404 fix                         | Switched `app/posts/[slug]/page.tsx` to Prisma-backed loading and decoded+normalized slug matching to prevent false not-found on article click                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-04-01 | Admin radio typing hardening                     | Aligned dashboard radio/article typings with editor contracts and added segment success-data guard to unblock TypeScript build during deployment                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-04-01 | Dynamic route render hardening                   | Marked `app/posts/[slug]/page.tsx` and `app/radio/[slug]/page.tsx` as `force-dynamic` and removed empty `generateStaticParams` to fix production `DYNAMIC_SERVER_USAGE` errors                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-04-01 | Mobile menu overlay hardening                    | Updated `components/shared/Header.tsx` to keep solid mobile menu background while scrolled and lock body scroll when menu is open                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-04-01 | Footer tags + post detail sync                   | Footer now loads real tags from DB (`برچسب‌ها`), post detail hides reading-time, shows normalized article image, and related posts are filtered by shared/no-tag logic                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-04-01 | Social links refresh                             | Footer social row now uses provided PNG logos (Bale, Eitaa, Virasty, Telegram) from public assets, rendered as white masks on transparent backgrounds, and updated targets                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-04-01 | About page layout tweak                          | Added desktop sticky hero image with padded frame, decorative dividers/headings, enforced manifesto line breaks, and refreshed centered Bale CTA with hover/focus styling                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-04-01 | About page manifesto refresh                     | Replaced about page with manifesto text, hero poster image, and single contact CTA with Telegram-style button to ble.ir/dotmag_kiosk; removed values/team sections                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-04-01 | Content date model overhaul                      | Added `sortDate` DateTime to Article/Magazine/Radio, kept `publishedAt` as free text, switched all list ordering from `publishedAt` to `sortDate`, and wired create/update normalization across actions and APIs                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-04-01 | Article author removal                           | Removed `author` from Prisma Article model and aligned article cards, post detail, admin tabs/types, and homepage types to the new schema                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-04-01 | Admin writing experience upgrade                 | Added `RichTextEditor` (bold/italic/underline/strikethrough/font-size), switched article content input from textarea to WYSIWYG HTML, and added safe HTML rendering helper `lib/articleContent.ts` for post detail pages                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-04-01 | Post UI cleanup + media fit                      | Removed top tag badges/fallback label noise from article cards, removed public posts load-more button, adjusted article image rendering to reduce laptop/desktop cropping for square uploads, and simplified post header meta block                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-04-01 | Mobile menu visual fix                           | Reworked mobile menu/header backgrounds to fully opaque theme-based layers and tightened scroll lock behavior to prevent translucent overlap with hero text                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-04-01 | Posts tabs subtitle removal                      | Removed descriptive sentence text under post filter tabs so only hashtag tabs remain visible in the sticky filter bar                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-04-01 | Rich-text size parity fix                        | Updated `lib/articleContent.ts` sanitizer to preserve admin font-size formatting in public post rendering by accepting keyword sizes and converting legacy `<font size>` tags to styled spans                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-04-01 | Magazine text-date parity + admin cleanup        | Displayed magazine `publishedAt` text in public card/reader views to match text-based date behavior, and removed the unused `featured` toggle from article editor in admin panel                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-04-01 | Large/X-Large render parity + wording rename     | Expanded article sanitizer `font-size` allowlist for legacy and WebKit large values so public rendering matches admin for Large/X-Large text sizes, and renamed UI wording from `نوشته` to `نوشته‌ها` across public and admin screens                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-04-01 | Article detail layout/readability pass           | Reworked single article header to desktop two-column (text right, image left) while keeping mobile stacked layout, prefixed article tag chips with `#`, reduced mobile gutters for article page containers, and normalized prose word/line spacing for cleaner Persian reading                                                                                                                                                                                                                                                                                                                         |
| 2026-04-01 | Editor selection + excerpt styling upgrade       | Improved `RichTextEditor` so font-size changes apply reliably to mid/end text selections and toolbar size state syncs with cursor selection, enabled styled excerpt editing in `ArticleEditor`, rendered excerpt safely in article detail, and kept list cards/meta descriptions plain via `toPlainText`                                                                                                                                                                                                                                                                                               |
| 2026-04-01 | Global mobile gutter unification                 | Set shared mobile `--container-padding` to match the preferred compact article-page gutter across all routes, and tightened posts tag-strip container/tab pill spacing on phones to reduce early horizontal scrolling                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-04-01 | Mobile gutter 30% trim + text spacing refinement | Reduced global phone gutter to exactly 70% of the previous value, tightened article/excerpt word spacing plus line/paragraph spacing, and normalized NBSP/repeated spaces during sanitized article rendering to prevent stretched word gaps                                                                                                                                                                                                                                                                                                                                                            |
| 2026-04-01 | Posts tags no-scroll layout                      | Removed horizontal scrolling from post hashtag tabs and switched to wrapped, width-distributed pill buttons on mobile so all tags stay visible without side scrolling                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-04-01 | Global page margin unification pass              | Reduced horizontal container gutter at all breakpoints, removed posts-tab special gutter override, and aligned admin layout wrappers with global container spacing so left/right page margins stay consistent across routes                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-04-02 | Kiosk card visual parity                         | Reworked the kiosk card shell to match the hero card surface, border, ring, blur, and spacing in both light and dark themes while preserving the user-edited kiosk text                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-04-02 | Exact kiosk-manifesto card match                 | Switched the kiosk card container to use the exact same manifesto text-card shell classes (`border-card-border`, `bg-card-bg`, matching paddings/typography shell) so light and dark themes render identically                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-04-02 | About page polish                                | Unified manifesto section dividers with thicker gradients, removed duplicate heading/flag line, switched hero poster to PNG source, and rebuilt the Bale kiosk CTA as a centered gradient card with elevated button                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-04-02 | Radio/posts copy cleanup + tag ordering controls | Removed requested helper/empty-state copy from public radio and posts pages, added admin up/down controls for tag ordering with persistent `Tag.sortOrder`, applied that order to public tags API/footer/posts tabs, and moved magazine detail mobile cover position between subtitle and description                                                                                                                                                                                                                                                                                                  |
| 2026-04-02 | Excerpt plain-text rollback + about frame align  | Reverted article excerpt input/render from rich HTML to plain text for uniform cards/details, tightened mobile gap between excerpt and date on single-post header, and rebuilt About hero image frame using the same border/padding shell pattern as single-post image cards                                                                                                                                                                                                                                                                                                                           |
| 2026-04-02 | Card excerpt clamp + magazine rich-description   | Enforced one-line excerpt slot with blank-line fallback on article cards, added active-state toolbar feedback for rich editor marks, switched magazine description to rich-text editing with sanitized public rendering, and hardened newest-first ordering with `sortDate` + `createdAt` tie-breakers across admin/public article-magazine feeds                                                                                                                                                                                                                                                      |
| 2026-04-02 | Stable uploads + original PDF filename           | Rebuilt upload API to store files with unique stable keys while preserving original file names for download headers/links, added shared XHR upload helper with retry/progress, and unified all admin image/PDF/audio uploads with consistent percent progress + green success + red failure status UI                                                                                                                                                                                                                                                                                                  |
| 2026-04-02 | Reader spread polish + unified image frames      | Removed white page backplates in magazine reader on desktop/mobile, restored tighter two-page spread spacing with odd-last-page left blank behavior, flipped arrow icons to outward direction with left-next/right-prev mapping, aligned page/progress counters to spread display semantics, reduced top/bottom viewport inset for page area, and standardized detail-page image framing across archive cover, single post, and about images via shared frame utilities                                                                                                                                |
| 2026-04-02 | Reader parity + create-mode page uploads         | Reduced desktop magazine detail cover to 85% while keeping shared frame style, increased desktop spread gap slightly, brightened reader subtitle/date contrast, fixed spread order to odd-right/even-left with odd-last-page anchored right, ensured top back action exits fullscreen before returning to detail, enabled page-image upload/reorder/replace/delete in magazine create mode using the same bottom section as edit, switched admin cover/page previews to low-quality optimized thumbnails, and hardened shared uploads with multi-retry/offline wait and response-size integrity checks |
| 2026-04-02 | Spread side correction + chunked upload engine   | Forced desktop spread grid to LTR direction so logical left/right page placement matches user-facing order (odd pages right, even pages left, odd last page right), increased spread gap by 1.2x from previous state, rolled back admin page thumbnail preview from `next/image` to native lazy `<img>` for reliability, and upgraded `/api/upload` + client uploader to chunked resumable uploads with per-chunk retries, network-wait recovery, and final file-size integrity validation for larger PDF/image/audio uploads                                                                          |
| 2026-04-01 | Archive/detail reader split + UI unification     | Converted `/archive/[slug]` into magazine detail page, moved full reader to `/archive/[slug]/read`, unified archive/about title sections with posts style, removed archive helper texts, upgraded magazine cards (shadow/border + date/pages row), pinned reader bars to viewport edges, and switched PDF action to real file download flow                                                                                                                                                                                                                                                            |
| 2026-04-01 | MagazineReader type-check hotfix                 | Fixed `useEffect` dependency array in `MagazineReader` to remove pre-declaration references (`nextPage`/`prevPage`) that broke production TypeScript build during deploy                                                                                                                                                                                                                                                                                                                                                                                                                               |

## Reuse Decisions

- **ThemeProvider**: Single context for all theme needs
- **ArticleCard**: One component with 3 variants (default, featured, horizontal)
- **Logo**: Single component with dark/light variants
- **Auth utilities**: Centralized in lib/auth.ts (JWT, session, passwords)
- **Server Actions**: Separate files for articles, magazines, auth (one concern per file)
- **API Routes**: RESTful structure with shared patterns
- **Radio module reuse**: Radio list/detail uses existing card/layout patterns from posts/archive with dedicated audio components

## Architecture Patterns Established

### Data Flow

1. Public pages (Next.js server components) → fetch from `/api/*` routes
2. Admin panel → server actions → Prisma → PostgreSQL
3. API routes → auth check → server actions → Prisma → PostgreSQL
4. Radio playback → `/api/uploads/*` byte-range responses → service worker audio/runtime caches

### Authentication

- Login → JWT token → httpOnly cookie → middleware check
- All admin routes protected at middleware level
- All admin API endpoints verify token

### Admin Panel Flow

- `/admin-panel` (no auth) → LoginForm
- `/admin-panel` (authenticated) → Dashboard with tabs
- Dashboard → ArticleEditor, MagazineEditor, or RadioEditor
- Editors submit to server actions → database updates

## Pending / TODOs

1. [x] Add Android TWA build setup
2. [x] Add Digital Asset Links route
3. [x] Complete Android build (requires manual bubblewrap build)
4. [x] Add Prisma + PostgreSQL database
5. [x] Create admin panel authentication
6. [x] Create admin panel UI
7. [x] Create API routes for CRUD
8. [x] Migrate mock data to database
9. [x] Update public pages to use API
10. [x] Remove JSON data files

**Next Phase:**

- [ ] Local testing (setup .env.local, test all features)
- [ ] Docker deployment test
- [ ] Production deployment

## Known Constraints & Assumptions

- **Build-time static generation disabled** for dynamic routes (generateStaticParams returns empty array)
  - Articles/magazines now fetched at runtime from API
  - Allows real-time updates from admin panel
  - No rebuild needed when content changes

- Archive + magazine reader routes are force-dynamic; magazine data uses cache tag `magazines` and is revalidated on mutations (home page fetch tagged)

- Magazine navigation flow is now two-step: archive card opens `/archive/[slug]` (detail page) and reading happens at `/archive/[slug]/read`

- Radio list/detail pages fetch via `/api/radios` and are revalidated with cache tag `radios`; radio mutations trigger `revalidateTag("radios", "default")`

- Audio uploads now allow compressed podcast formats and use `/api/uploads/[filename]` range responses; service worker stores runtime audio requests and supports partial replay paths

- **API calls from public pages use revalidation**: 3600s (1 hour cache)
  - Balance between freshness and performance
  - Can be adjusted per route

- **No newsletter subscription backend yet**
  - Form exists on /archive page but is non-functional
  - Can be connected later

- **Admin panel credentials in .env**
  - Change ADMIN_PASSWORD before deployment
  - JWT_SECRET must be cryptographically strong (min 32 chars)

- **Database seeding script**
  - Automatically run via `npm run db:seed`
  - Idempotent - can be run multiple times safely
  - Creates admin user from env variables

- **Date model split is intentional**
  - `publishedAt` is display-only free text entered by admin
  - `sortDate` is DateTime source of truth for ordering and OpenGraph publishedTime

- **Article content format migration**
  - New edits store HTML from admin WYSIWYG editor
  - Public article render sanitizes HTML via `lib/articleContent.ts`
  - Legacy plain-text content is converted to paragraph HTML at render time

- **Local DB sync dependency**
  - `npm run db:push` requires reachable PostgreSQL service at `postgres:5432`
  - In this run, schema push was blocked because database container was not reachable

## Security Notes

1. **Authentication**: JWT tokens in httpOnly cookies, not XSS-accessible
2. **Password hashing**: bcryptjs with 10 salt rounds
3. **Route protection**: Middleware checks all /admin-panel\* routes
4. **API protection**: All write operations require valid JWT
5. **Environment secrets**: All sensitive values in .env files (not in code)
6. **HTTPS ready**: secure=true on cookies can be enabled for production

## File Responsibility Rules (AGENTS.md Compliance)

- **app/**: routing, layouts, pages, route-level composition
- **components/**: UI primitives (ui/), composed blocks (shared/), feature-scoped components (feature/)
- **lib/**: stateless helpers, JWT, auth utilities
- **actions/**: server actions only
- **api/**: API routes
- **prisma/**: database schema and seeding
- **public/**: static assets

All files follow single responsibility principle.

## Responsive Architecture (Mobile-First)

All components implemented with mobile-first approach:

- Base: phone layout (320px-767px)
- tablet breakpoint: 768px-1023px
- laptop breakpoint: 1024px-1439px
- large desktop: 1440px+

Admin panel is desktop-focused but responsive.

## PWA + APK Readiness Status

✅ Valid manifest.webmanifest with all required fields
✅ Service worker enabled (public/sw.js present)
✅ Runtime audio caching strategy added for radio playback and manual downloads
✅ Offline fallback page (public/offline.html)
✅ PWA metadata in app/layout.tsx
✅ HTTPS-ready for production
✅ Deep linking safe (routing stable)
✅ Auth compatible with standalone/TWA context
✅ Ready for APK wrapping without architecture changes

## Color Palette Reference

```css
--color-primary: #d73b3a; /* Primary Red */
--color-deep-black: #0b0b0b; /* Deep Black */
--color-cream: #d9cbb8; /* Light Cream/Beige */
--color-khaki: #a98964; /* Khaki/Brown */
--color-forest: #3c5247; /* Dark Green */
```

## Environment Variables Reference

```env
# Database Connection (Prisma)
DATABASE_URL=postgresql://user:password@host:5432/database

# PostgreSQL Docker
POSTGRES_USER=dot_mag_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=dot_mag

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure_password

# Security
JWT_SECRET=min_32_characters_recommended_64

# Public Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000 (or production domain)

# Android App Linking
ANDROID_SHA256_FINGERPRINT=your_sha256_fingerprint
```

## Implementation Complete ✅

All components, pages, API routes, authentication, and database integration are complete and ready for:

1. Local development and testing
2. Docker-based deployment
3. Production deployment on your server

See DEPLOYMENT_GUIDE.md for detailed deployment instructions.

## File Map Summary

### App Directory

| File                                           | Purpose                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `app/layout.tsx`                               | Root layout with RTL direction, Vazirmatn font, ThemeProvider, Header, Footer |
| `app/globals.css`                              | Custom color palette, Tailwind config, typography, animations                 |
| `app/page.tsx`                                 | Home page with Hero, Editorial, Featured/Latest Articles sections             |
| `app/posts/page.tsx`                           | Articles listing with category filter                                         |
| `app/posts/[slug]/page.tsx`                    | Single article with content, meta, related articles                           |
| `app/archive/page.tsx`                         | Magazine archive grid                                                         |
| `app/archive/[slug]/page.tsx`                  | In-app magazine reader                                                        |
| `app/about/page.tsx`                           | About page with mission, values, team                                         |
| `app/api/.well-known/assetlinks.json/route.ts` | Digital Asset Links API for Android TWA verification                          |

### Android Directory

| File                        | Purpose                                                  |
| --------------------------- | -------------------------------------------------------- |
| `android/.gitignore`        | Ignores Android build artifacts (APK, AAB, keystore)     |
| `android/README.md`         | Complete Android build documentation and troubleshooting |
| `android/twa-manifest.json` | Bubblewrap TWA configuration for Android app packaging   |

### Components

| File                                    | Purpose                                              |
| --------------------------------------- | ---------------------------------------------------- |
| `components/ui/Logo.tsx`                | Logo with dark/light variants                        |
| `components/shared/Header.tsx`          | Sticky header, navigation, theme toggle, mobile menu |
| `components/shared/Footer.tsx`          | Footer with links, social, copyright                 |
| `components/shared/ThemeProvider.tsx`   | Dark/Light mode context with localStorage            |
| `components/feature/ArticleCard.tsx`    | Article cards (default, featured, horizontal)        |
| `components/feature/MagazineCard.tsx`   | Magazine cover card with hover effect                |
| `components/feature/MagazineReader.tsx` | Full-screen magazine reader with swipe, keyboard nav |

### Data

| File                  | Purpose                                 |
| --------------------- | --------------------------------------- |
| `data/articles.json`  | 6 mock articles with various categories |
| `data/magazines.json` | 3 mock magazine issues with pages       |

### PWA Files

| File                          | Purpose                            |
| ----------------------------- | ---------------------------------- |
| `public/manifest.webmanifest` | PWA manifest for installability    |
| `public/sw.js`                | Service worker for offline support |
| `public/offline.html`         | Offline fallback page              |

### Environment & Config

| File           | Purpose                                         |
| -------------- | ----------------------------------------------- |
| `.env.example` | Environment variables template (Android SHA256) |

## Change Journal

| Date       | Change                        | Reason                                                                                                                              |
| ---------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-21 | Initial setup                 | Project foundation with RTL, font, colors                                                                                           |
| 2026-03-21 | Created components            | Header, Footer, Cards, Reader                                                                                                       |
| 2026-03-21 | Created all pages             | Home, Posts, Archive, About                                                                                                         |
| 2026-03-21 | Added PWA files               | Manifest, SW, offline page                                                                                                          |
| 2026-03-25 | Added Android TWA setup       | Bubblewrap configuration for Android APK build                                                                                      |
| 2026-03-25 | Added Digital Asset Links     | API route for TWA verification                                                                                                      |
| 2026-03-27 | UI spacing fixes              | Fixed hamburger menu background, button spacing, footer buffer                                                                      |
| 2026-03-27 | Persian text updates          | Replaced "فرسته" with "نوشته‌ها" (8 instances across 5 files)                                                                       |
| 2026-03-27 | Spacing system overhaul       | Added CSS utilities for consistent spacing                                                                                          |
| 2026-03-27 | Hashtag category system       | Implemented #ازـما #ازـشما #ازـدیگران filtering with "no posts" handling                                                            |
| 2026-03-27 | Search feature removal        | Removed search functionality from header - simplified UI                                                                            |
| 2026-03-31 | PDF renderer backup branch    | Preserved current PDF rendering implementation in `backup/pdf-render-2026-03-31` before main-branch rewrite                         |
| 2026-03-31 | Image-first magazine reader   | Replaced runtime PDF.js rendering with image-page reader and kept optional PDF download action                                      |
| 2026-03-31 | Admin page-management upgrade | Simplified page model to image-first tools in UI (upload/replace/delete/reorder) and added server action for durable page reorder   |
| 2026-03-31 | Deploy flow safety hardening  | Added `scripts/post-receive.example.sh`; switched container startup to optional DB sync/seed flags; removed startup data-loss path  |
| 2026-03-31 | Env cleanup for deploy flow   | Removed startup DB toggle vars from `.env.example`; keep DB initialization as explicit manual/hook commands                         |
| 2026-03-31 | Script cleanup for deploy     | Removed obsolete DB toggle env checks from entrypoint/hook template; seed is now explicit manual operation                          |
| 2026-03-31 | Prisma build stabilization    | Removed Docker `db:generate` step and changed Prisma binary target to `linux-musl-openssl-3.0.x` to reduce blocked engine downloads |
| 2026-03-31 | Hook template restored        | Re-added `scripts/post-receive.example.sh` with manual seed policy and schema push on deploy                                        |
| 2026-03-31 | Offline APK install support   | Added `offline-pkgs/apk` bundle path, Dockerfile offline-first `openssl` install, and `scripts/fetch-offline-apk.sh` helper         |
| 2026-03-31 | Admin route + shell update    | Renamed admin URL to `/admin-panel` and removed global Header/Footer chrome from admin pages                                        |

## Reuse Decisions

- **ThemeProvider**: Single context for all theme needs
- **ArticleCard**: One component with 3 variants (default, featured, horizontal)
- **Logo**: Single component with dark/light variants
- **Data files**: JSON files reused across multiple pages

## Pending / TODOs

1. [x] Add Android TWA build setup
2. [x] Add Digital Asset Links route
3. [ ] Complete Android build (requires manual bubblewrap build)
4. [ ] Extract SHA256 fingerprint and update .env
5. [ ] Add actual PWA icons (72x72 to 512x512)
6. [ ] Add article/magazine images when available
7. [ ] Add actual content images when available
8. [ ] Add category filter functionality on /posts
9. [ ] Enhance magazine reader with actual page images
10. [ ] Add newsletter subscription backend (when needed)

## Known Constraints

- **No Backend**: All data is static JSON
- **No Auth**: No login/signup pages
- **No E-commerce**: No store section
- **Images**: Using placeholders until actual images provided
- **Font**: Using local Vazirmatn variable font

## Color Palette Reference

```css
--color-primary: #d73b3a; /* Primary Red */
--color-deep-black: #0b0b0b; /* Deep Black */
--color-cream: #d9cbb8; /* Light Cream/Beige */
--color-khaki: #a98964; /* Khaki/Brown */
--color-forest: #3c5247; /* Dark Green */
```
