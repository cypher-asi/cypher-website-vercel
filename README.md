# Cypher Website

The website for **Cypher** (cypher.net), built with [Next.js 15](https://nextjs.org/) (App Router). It presents the companies, research, and mission behind a sovereign AI stack.

It is also the **content hub** for the company sites. Each site (ZODE first) writes its news and changelog posts through the `/api/v1` API with its own key and serves them back from here. ZODE OS, the ZODE portal, is the editor. Every source a post cites is indexed as research, and cypher.net shows all the writing in one terminal-style workspace.

## Prerequisites

- **Node.js** 22.18+ (the scripts import TypeScript directly)
- **npm** 10+

## Install

```bash
npm install
```

## Run

```bash
npm run dev       # Start dev server (http://localhost:3000)
npm run dev:poll  # Same, polling for file changes (Windows/VM filesystems; or set NEXT_DEV_POLL_MS)
npm run build     # Migrate the database, then build for production
npm run start     # Serve production build
npm run typecheck # Type-check with tsc (no emit)
npm test          # Run unit tests with Vitest
```

## Environment

Copy `.env.example` to `.env.local`, or run `vercel env pull .env.local`.

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Neon Postgres. Holds sites, posts and the research index. `npm run build` applies `db/schema.sql` to it first, and a Vercel build fails without it. |
| `BLOB_READ_WRITE_TOKEN` | Private Vercel Blob store for post images, under `posts/{postId}/`. |
| `NEXT_PUBLIC_MIXPANEL_TOKEN_CYPHER` | Optional Mixpanel public project token. Inlined at build time. If unset, analytics is a silent no-op. |

### Local database

The app talks to Postgres through Neon's HTTP driver, so a local Postgres needs Neon's HTTP proxy in front of it:

```bash
docker network create cypher
docker run -d --name cypher-pg --network cypher -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=main postgres:16
docker run -d --name cypher-neon-proxy --network cypher -p 4444:4444 \
  -e PG_CONNECTION_STRING=postgres://postgres:postgres@cypher-pg:5432/main \
  ghcr.io/timowilhelm/local-neon-http-proxy:main
export DATABASE_URL=postgres://postgres:postgres@db.localtest.me:5432/main
npm run db:migrate
```

`db.localtest.me` resolves to localhost. The app and the scripts send queries for that host to the proxy on port 4444.

## Content API

Everything is under `/api/v1`. The contract is [`/api/v1/openapi.json`](src/app/api/v1/_lib/openapi.ts), and `openapi.test.ts` checks that it matches the route handlers.

| Endpoint | Access |
|----------|--------|
| `GET /posts?site=&limit=&cursor=` | Public. Published posts from every site, newest first. |
| `GET /sites/{site}/posts?kind=&withBody=1` | Public. Published posts. With the site's key, `status=draft\|published\|all` and `author=` also work. |
| `GET /sites/{site}/posts/slug/{kind}/{slug}` | Public. One published post with its sources. |
| `POST /sites/{site}/posts` | Site key. Creates an empty draft. |
| `GET\|PATCH\|DELETE /sites/{site}/posts/{id}` | Site key. `PATCH { draft, publish?, editorEmail }` saves the post and re-indexes its sources. |
| `POST /sites/{site}/posts/{id}/status` | Site key. `{ status, editorEmail }` publishes or unpublishes the post. |
| `POST /sites/{site}/posts/{id}/upload` | Site key. Issues a Vercel Blob client upload token for the post's images. |
| `GET /research/sources?q=` | Public. Searches the sources cited by published posts. |
| `GET /media/{path}` | Public. Serves post images. `/post-media/*` rewrites here. |

Send the site key as `Authorization: Bearer <key>`. Errors always look like `{ "error": { "code", "message" } }`, and the messages are written so they can be shown to editors as they are. Public reads are cached at the CDN for a minute. Vercel never caches a request that carries an `Authorization` header, so a site reading with its own key always sees its latest edits.

### Slugs

cypher.net serves every post at `/{slug}`, so a slug belongs to one post across every site and kind (a unique index on `posts.slug`), and never to a top-level page of the app (`RESERVED_SLUGS` in `src/features/posts/types.ts`; a test fails if a folder in `src/app` is missing from it). A save with an empty slug builds one from the title. When the slug is taken, the post is saved under the first free numbered variant (`hello-2`, `hello-3`, ...) and the response carries that slug, so editors should show what comes back. Company sites still serve their posts at `base_url/{kind}/{slug}`, which is what `canonicalUrl` points to.

### Sources as research

When a post is saved, the API reads the numbered list under its `## Sources` (or Notes, References) heading, which looks like `1. Publisher, [Title](url), detail`. It also picks up inline `[n](url)` citations that have no list entry. Each URL becomes one row in `research_sources`, deduplicated by its normalized URL across every post. `post_sources` records which post cites which source, under which number.

### Scripts

```bash
npm run site:create -- zode ZODE https://zode.org   # Registers a site and prints its key once
npm run site:rotate-key -- zode                      # Replaces a site's key
SOURCE_DATABASE_URL=… SOURCE_BLOB_READ_WRITE_TOKEN=… \
  npm run posts:import -- --site zode                # Copies a site's old posts and images (idempotent)
npm run smoke:api -- --base https://cypher-website-vercel.vercel.app \
  --site smoke --key <smoke key> [--other-key <another site's key>]   # Checks a deployment end to end
```

The smoke test publishes a throwaway post for a few seconds, so give it a site of its own (`site:create smoke "Smoke test" https://example.com`).

## Deployment

Hosted on [Vercel](https://vercel.com/). Pushes to `main` deploy to production. The project needs a Neon database and a private Blob store attached, which provide `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN`. Each build migrates its database first.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Workspace: Research and Companies on the left, the latest post in the center, its sources on the right |
| `/{slug}` | The workspace with one post open. `?company=` filters Research to one company. Old `/writing/{site}/{kind}/{slug}` links redirect here. |
| `/companies` | The company grid and key facts |
| `/vision` | Mission statement |
| `/papers` | Papers index (the "papers" link), with papers at `/papers/the-grid`, `/papers/aura-harness`, `/papers/zns` and `/papers/zero-os`. `/research/*` redirects here. |
| `/papers/sources` | Search every source cited by the writing |
| `/privacy`, `/terms` | Legal documents |
| `/contact` | Contact details |
| `/docs` | Getting-started guide |
| `/components` | Component showcase |

## Project Structure

```
db/schema.sql           # Sites, posts, research_sources, post_sources
scripts/                # migrate, site:create, site:rotate-key, posts:import, smoke:api
src/
  app/                  # Routes, root layout, providers, favicon (icon.tsx)
    api/v1/             # Content API and its OpenAPI description
    styles/globals.css  # Design tokens, theme variables, resets
  components/           # Shared chrome and UI (Footer, ProductGrid, Facts, ...)
  features/
    posts/              # Post types, validation, repository, API-key auth, Blob helpers
    research/           # Source extraction, indexing and search
    terminal/           # Terminal bar and the workspace panels
    analytics/          # Analytics boundary and its Mixpanel provider
  sites/cypher/         # Company grid page
  lib/
    site.ts             # Nav, companies, footer, metadata and theme defaults
    db.ts               # Neon client
    fonts.ts            # Font loaders
public/images/          # Brand, company card, and research images
```

### Key conventions

- **CSS Modules** for all component/page styles (`*.module.css`)
- **Global CSS** with design tokens and theme variables imported once in `layout.tsx`
- **Theme**: `ThemeProvider` in `ThemeContext.tsx` manages dark/light mode via the `data-theme` attribute on `<html>`, persisted to `localStorage`
- **Client boundary**: any component using theme hooks or interactive state is marked `"use client"`
- **Fonts**: JetBrains Mono (the terminal face) and Inter via `next/font/google`
