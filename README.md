# Cypher Website

The website for **Cypher** (cypher.net), built with [Next.js 15](https://nextjs.org/) (App Router). It presents the companies, research, and mission behind a sovereign AI stack.

This is the Cypher site on its own, extracted from the multi-brand `cypher-website` repo. The other brand sites (Wilder World, ZODE, ZERO, Z Chain) are not part of this project; the home page and navigation link out to their own domains.

## Prerequisites

- **Node.js** LTS (20+)
- **npm** 10+

## Install

```bash
npm install
```

## Run

```bash
npm run dev       # Start dev server (http://localhost:3000)
npm run build     # Production build
npm run start     # Serve production build
npm run typecheck # Type-check with tsc (no emit)
npm test          # Run unit tests with Vitest
```

## Environment

The site needs no secrets. Copy `.env.example` to `.env.local` to set the one optional variable:

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_MIXPANEL_TOKEN_CYPHER` | Mixpanel public project token. Inlined at build time, so changing it needs a rebuild. If unset, analytics is a silent no-op. |

## Deployment

Hosted on [Vercel](https://vercel.com/). Pushes to `main` deploy to production. Set `NEXT_PUBLIC_MIXPANEL_TOKEN_CYPHER` in the Vercel project's environment variables to turn analytics on.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page: the company grid and key facts |
| `/vision` | Mission statement |
| `/research` | Research index, with papers at `/research/the-grid`, `/research/aura-harness`, `/research/zns` and `/research/zero-os` |
| `/privacy`, `/terms` | Legal documents |
| `/contact` | Contact details |
| `/docs` | Getting-started guide |
| `/components` | Component showcase |

## Project Structure

```
src/
  app/                  # Routes, root layout, providers, favicon (icon.tsx)
    styles/globals.css  # Design tokens, theme variables, resets
  components/           # Shared chrome and UI (Nav, Footer, ProductGrid, Facts, ...)
  sites/cypher/         # Landing page
  features/analytics/   # Analytics boundary and its Mixpanel provider
  lib/
    site.ts             # Nav, footer, metadata and theme defaults
    fonts.ts            # Font loaders
public/images/          # Brand, company card, and research images
```

### Key conventions

- **CSS Modules** for all component/page styles (`*.module.css`)
- **Global CSS** with design tokens and theme variables imported once in `layout.tsx`
- **Theme**: `ThemeProvider` in `ThemeContext.tsx` manages dark/light mode via the `data-theme` attribute on `<html>`, persisted to `localStorage`
- **Client boundary**: any component using theme hooks or interactive state is marked `"use client"`
- **Fonts**: Inter (sans-serif) and JetBrains Mono (monospace) via `next/font/google`
