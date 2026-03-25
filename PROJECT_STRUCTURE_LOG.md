# PROJECT_STRUCTURE_LOG.md

## Current Architecture Snapshot

```text
dot-mag/
├── app/
│   ├── layout.tsx              # Root layout with RTL, Persian font, Theme
│   ├── globals.css             # Tailwind + custom styles + color palette
│   ├── page.tsx                # Home page
│   ├── about/
│   │   └── page.tsx            # About Us page
│   ├── api/
│   │   └── .well-known/
│   │       └── assetlinks.json/
│   │           └── route.ts    # Digital Asset Links for Android TWA
│   ├── archive/
│   │   ├── page.tsx            # Magazine archive listing
│   │   └── [slug]/
│   │       └── page.tsx        # Magazine reader page
│   └── posts/
│       ├── page.tsx            # Articles listing
│       └── [slug]/
│           └── page.tsx        # Single article page
├── android/
│   ├── .gitignore              # Ignore Android build artifacts
│   ├── README.md               # Android build documentation
│   └── twa-manifest.json       # Bubblewrap TWA configuration
├── components/
│   ├── ui/
│   │   ├── Logo.tsx            # Logo component
│   │   └── Button.tsx          # Button component (if exists)
│   ├── shared/
│   │   ├── Header.tsx          # Global header with nav & theme toggle
│   │   ├── Footer.tsx          # Global footer
│   │   └── ThemeProvider.tsx   # Dark/Light mode context
│   └── feature/
│       ├── ArticleCard.tsx     # Article card variants
│       ├── MagazineCard.tsx    # Magazine cover card
│       └── MagazineReader.tsx  # In-app magazine reader
├── data/
│   ├── articles.json           # Mock article data
│   └── magazines.json          # Mock magazine data
├── hooks/                      # Custom React hooks (empty)
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
├── .env.example                # Environment variables template
├── AGENTS.md                   # Architecture rules
├── CLAUDE.md                   # Agent instructions
└── PROJECT_STRUCTURE_LOG.md    # This file
```

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

| File                                    | Purpose                                                      |
| --------------------------------------- | ------------------------------------------------------------ |
| `components/ui/Logo.tsx`                | Logo with dark/light variants                                |
| `components/shared/Header.tsx`          | Sticky header, navigation, search, theme toggle, mobile menu |
| `components/shared/Footer.tsx`          | Footer with links, social, copyright                         |
| `components/shared/ThemeProvider.tsx`   | Dark/Light mode context with localStorage                    |
| `components/feature/ArticleCard.tsx`    | Article cards (default, featured, horizontal)                |
| `components/feature/MagazineCard.tsx`   | Magazine cover card with hover effect                        |
| `components/feature/MagazineReader.tsx` | Full-screen magazine reader with swipe, keyboard nav         |

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

| Date       | Change                    | Reason                                         |
| ---------- | ------------------------- | ---------------------------------------------- |
| 2026-03-21 | Initial setup             | Project foundation with RTL, font, colors      |
| 2026-03-21 | Created components        | Header, Footer, Cards, Reader                  |
| 2026-03-21 | Created all pages         | Home, Posts, Archive, About                    |
| 2026-03-21 | Added PWA files           | Manifest, SW, offline page                     |
| 2026-03-25 | Added Android TWA setup   | Bubblewrap configuration for Android APK build |
| 2026-03-25 | Added Digital Asset Links | API route for TWA verification                 |

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
7. [ ] Implement actual search functionality (client-side filter)
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
