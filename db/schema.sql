-- Cypher is the content hub for every company site. Each site (zode, and
-- later others) writes its posts through the /api/v1 API with its own key and
-- serves them back from here. Applied by scripts/migrate.mjs before each build,
-- so every statement must be safe to run again.

create extension if not exists pgcrypto;

-- A site that publishes through the API. Only the SHA-256 of its API key is
-- stored; scripts/create-site.mjs prints the key once.
create table if not exists sites (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  -- Where the site serves its posts, e.g. https://zode.org; a post's canonical
  -- URL is base_url/kind/slug.
  base_url text not null,
  api_key_hash text not null,
  created_at timestamptz not null default now()
);

-- News and changelog posts. The body is Markdown; images live in the private
-- Blob store under posts/{id}/ and are served by /api/v1/media. The author is
-- a snapshot taken by the site that wrote the post.
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references sites (id) on delete cascade,
  kind text not null check (kind in ('news', 'changelog')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  slug text not null,
  title text not null default '',
  summary text not null default '',
  body_md text not null default '',
  -- Changelog only, e.g. "1.4".
  version text,
  cover_pathname text,
  author_user_id text not null,
  author_name text not null,
  author_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by_email text,
  published_at timestamptz,
  unique (site_id, kind, slug)
);

create index if not exists posts_published_idx on posts (published_at desc) where status = 'published';
create index if not exists posts_site_idx on posts (site_id, updated_at desc);

-- Every source cited by any post, once per normalized URL (url_key), so the
-- same paper or filing cited by several posts is one research entry.
create table if not exists research_sources (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  url_key text not null unique,
  title text not null default '',
  publisher text not null default '',
  domain text not null default '',
  -- The date as the citation wrote it, e.g. "Nov 10, 2026"; citations are too
  -- loose to parse into a date reliably.
  date_label text not null default '',
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(publisher, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(domain, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_sources_search_idx on research_sources using gin (search);

-- Which sources a post cites, under the number the post uses for each.
create table if not exists post_sources (
  post_id uuid not null references posts (id) on delete cascade,
  number int not null check (number > 0),
  source_id uuid not null references research_sources (id) on delete cascade,
  -- What follows the link in the citation, e.g. "SEC, Nov 10, 2026".
  detail text not null default '',
  primary key (post_id, number)
);

create index if not exists post_sources_source_idx on post_sources (source_id);
