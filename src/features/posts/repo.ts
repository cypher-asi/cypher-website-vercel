import 'server-only';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { nextFreeSlug, slugPrefix } from './slug';
import {
  isUuid,
  postPath,
  type Author,
  type Post,
  type PostDraft,
  type PostKind,
  type PostSource,
  type PostStatus,
  type Site,
} from './types';

/** Thrown when a save can't find a free slug, e.g. losing repeated races for it. */
export class SlugTakenError extends Error {
  constructor() {
    super('slug_taken');
  }
}

const UNIQUE_VIOLATION = '23505';
const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === UNIQUE_VIOLATION;

const toDate = (value: unknown): Date => new Date(value as string | Date);

function toPost(row: Record<string, unknown>): Post {
  const kind = row.kind as PostKind;
  const slug = String(row.slug);
  return {
    id: String(row.id),
    site: String(row.site_id),
    kind,
    status: row.status as PostStatus,
    slug,
    title: String(row.title),
    summary: String(row.summary),
    bodyMd: String(row.body_md ?? ''),
    version: row.version == null ? null : String(row.version),
    coverPathname: row.cover_pathname == null ? null : String(row.cover_pathname),
    author: {
      userId: String(row.author_user_id),
      name: String(row.author_name),
      email: String(row.author_email),
    },
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    updatedByEmail: row.updated_by_email == null ? null : String(row.updated_by_email),
    publishedAt: row.published_at == null ? null : toDate(row.published_at),
    canonicalUrl: `${String(row.base_url).replace(/\/+$/, '')}${postPath(kind, slug)}`,
  };
}

/* ---------------------------------------------------------------------------
   Sites
   --------------------------------------------------------------------------- */

export async function getSite(id: string): Promise<Site | null> {
  const [row] = await db()`select id, name, base_url from sites where id = ${id}`;
  return row ? { id: String(row.id), name: String(row.name), baseUrl: String(row.base_url) } : null;
}

/** The site whose API key hashes to `keyHash`, if any. */
export async function siteByKeyHash(keyHash: string): Promise<string | null> {
  const [row] = await db()`select id from sites where api_key_hash = ${keyHash}`;
  return row ? String(row.id) : null;
}

/* ---------------------------------------------------------------------------
   Reads
   --------------------------------------------------------------------------- */

export interface ListOptions {
  kind?: PostKind | null;
  /** `null` lists every status; only a site's own key may ask for drafts. */
  status?: PostStatus | null;
  author?: string | null;
  withBody?: boolean;
}

/** A site's posts, published newest first, then drafts most recently edited first. */
export async function listSitePosts(siteId: string, options: ListOptions = {}): Promise<Post[]> {
  const kind = options.kind ?? null;
  const status = options.status === undefined ? 'published' : options.status;
  const author = options.author ?? null;
  const rows = await db()`
    select p.id, p.site_id, p.kind, p.status, p.slug, p.title, p.summary,
      case when ${options.withBody ?? false}::boolean then p.body_md else '' end as body_md,
      p.version, p.cover_pathname, p.author_user_id, p.author_name, p.author_email,
      p.created_at, p.updated_at, p.updated_by_email, p.published_at, s.base_url
    from posts p join sites s on s.id = p.site_id
    where p.site_id = ${siteId}
      and (${kind}::text is null or p.kind = ${kind})
      and (${status}::text is null or p.status = ${status})
      and (${author}::text is null or p.author_user_id = ${author})
    order by p.published_at desc nulls last, p.updated_at desc
  `;
  return rows.map(toPost);
}

export async function getPost(siteId: string, id: string): Promise<Post | null> {
  if (!isUuid(id)) return null;
  const [row] = await db()`
    select p.*, s.base_url from posts p join sites s on s.id = p.site_id
    where p.site_id = ${siteId} and p.id = ${id}
  `;
  return row ? toPost(row) : null;
}

/** The published post served at cypher.net/{slug}, whichever site wrote it. */
export async function getPublishedBySlug(slug: string): Promise<Post | null> {
  const [row] = await db()`
    select p.*, s.base_url from posts p join sites s on s.id = p.site_id
    where p.slug = ${slug} and p.status = 'published'
  `;
  return row ? toPost(row) : null;
}

/** A site's published post by its URL on that site, base_url/kind/slug. */
export async function getPublishedBySiteSlug(siteId: string, kind: PostKind, slug: string): Promise<Post | null> {
  const post = await getPublishedBySlug(slug);
  return post && post.site === siteId && post.kind === kind ? post : null;
}

export interface FeedCursor {
  publishedAt: string;
  id: string;
}

export const encodeCursor = (post: Post): string =>
  Buffer.from(`${post.publishedAt!.toISOString()}|${post.id}`).toString('base64url');

export function decodeCursor(value: string | null): FeedCursor | null {
  if (!value) return null;
  const [publishedAt, id] = Buffer.from(value, 'base64url').toString('utf8').split('|');
  if (!publishedAt || !id || !isUuid(id) || Number.isNaN(Date.parse(publishedAt))) return null;
  return { publishedAt, id };
}

/** Published posts of every site (or one), newest first, `limit` at a time after `cursor`. */
export async function listPublishedFeed({
  site = null,
  limit = 50,
  cursor = null,
}: {
  site?: string | null;
  limit?: number;
  cursor?: FeedCursor | null;
} = {}): Promise<Post[]> {
  const rows = await db()`
    select p.id, p.site_id, p.kind, p.status, p.slug, p.title, p.summary, '' as body_md,
      p.version, p.cover_pathname, p.author_user_id, p.author_name, p.author_email,
      p.created_at, p.updated_at, p.updated_by_email, p.published_at, s.base_url
    from posts p join sites s on s.id = p.site_id
    where p.status = 'published'
      and (${site}::text is null or p.site_id = ${site})
      and (${cursor?.publishedAt ?? null}::timestamptz is null
        or (p.published_at, p.id) < (${cursor?.publishedAt ?? null}::timestamptz, ${cursor?.id ?? null}::uuid))
    order by p.published_at desc, p.id desc
    limit ${limit}
  `;
  return rows.map(toPost);
}

/** Published post counts per site, for the Companies panel. */
export async function publishedCountsBySite(): Promise<Record<string, number>> {
  const rows = await db()`select site_id, count(*)::int as n from posts where status = 'published' group by site_id`;
  return Object.fromEntries(rows.map((row) => [String(row.site_id), Number(row.n)]));
}

/** The numbered sources a post cites, with how many published posts cite each. */
export async function getPostSources(postId: string): Promise<(PostSource & { citedBy: number })[]> {
  const rows = await db()`
    select ps.number, ps.detail, rs.id as source_id, rs.url, rs.title, rs.publisher, rs.domain, rs.date_label,
      (select count(distinct p2.id)::int from post_sources ps2 join posts p2 on p2.id = ps2.post_id
        where ps2.source_id = rs.id and p2.status = 'published') as cited_by
    from post_sources ps join research_sources rs on rs.id = ps.source_id
    where ps.post_id = ${postId}
    order by ps.number
  `;
  return rows.map((row) => ({
    number: Number(row.number),
    sourceId: String(row.source_id),
    url: String(row.url),
    title: String(row.title),
    publisher: String(row.publisher),
    domain: String(row.domain),
    dateLabel: String(row.date_label),
    detail: String(row.detail),
    citedBy: Number(row.cited_by),
  }));
}

/* ---------------------------------------------------------------------------
   Writes
   --------------------------------------------------------------------------- */

/** Saves can race for the same free slug; the unique index settles it and the loser looks again. */
const SLUG_ATTEMPTS = 3;

/** Slugs other posts use that `base` or its numbered variants could clash with. */
async function takenSlugs(base: string, exceptId: string | null): Promise<Set<string>> {
  const rows = await db()`
    select slug from posts
    where slug like ${`${slugPrefix(base)}%`} and (${exceptId}::uuid is null or id <> ${exceptId}::uuid)
  `;
  return new Set(rows.map((row) => String(row.slug)));
}

/** `slug` if no other post uses it, otherwise its first free numbered variant. */
export async function freeSlug(slug: string, exceptId: string | null = null): Promise<string> {
  return nextFreeSlug(slug, await takenSlugs(slug, exceptId));
}

/** An empty draft, with a placeholder slug that the first save replaces. */
export async function createDraft(siteId: string, kind: PostKind, author: Author): Promise<Post> {
  for (let attempt = 1; ; attempt++) {
    const slug = `untitled-${randomBytes(4).toString('hex')}`;
    try {
      const [row] = await db()`
        with inserted as (
          insert into posts (site_id, kind, slug, author_user_id, author_name, author_email, updated_by_email)
          values (${siteId}, ${kind}, ${slug}, ${author.userId}, ${author.name}, ${author.email}, ${author.email})
          returning *
        )
        select inserted.*, s.base_url from inserted join sites s on s.id = inserted.site_id
      `;
      return toPost(row);
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= SLUG_ATTEMPTS) throw error;
    }
  }
}

/**
 * Saves `draft` over the post. Its slug is kept when no other post uses it,
 * otherwise the post gets the first free numbered variant (hello-2, ...);
 * the returned post carries the slug it was saved under.
 */
export async function updatePost(siteId: string, id: string, draft: PostDraft, editorEmail: string): Promise<Post | null> {
  if (!isUuid(id)) return null;
  for (let attempt = 1; ; attempt++) {
    const slug = await freeSlug(draft.slug, id);
    try {
      const [row] = await db()`
        with updated as (
          update posts set
            kind = ${draft.kind},
            slug = ${slug},
            title = ${draft.title},
            summary = ${draft.summary},
            body_md = ${draft.bodyMd},
            version = ${draft.kind === 'changelog' && draft.version ? draft.version : null},
            cover_pathname = ${draft.coverPathname},
            updated_at = now(),
            updated_by_email = ${editorEmail}
          where site_id = ${siteId} and id = ${id}
          returning *
        )
        select updated.*, s.base_url from updated join sites s on s.id = updated.site_id
      `;
      return row ? toPost(row) : null;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      if (attempt >= SLUG_ATTEMPTS) throw new SlugTakenError();
    }
  }
}

/** Publishing keeps a post's first publish date, so unpublishing and republishing doesn't move it. */
export async function setStatus(siteId: string, id: string, status: PostStatus, editorEmail: string): Promise<Post | null> {
  const [row] = await db()`
    with updated as (
      update posts set
        status = ${status},
        published_at = case when ${status}::text = 'published' then coalesce(published_at, now()) else published_at end,
        updated_at = now(),
        updated_by_email = ${editorEmail}
      where site_id = ${siteId} and id = ${id}
      returning *
    )
    select updated.*, s.base_url from updated join sites s on s.id = updated.site_id
  `;
  return row ? toPost(row) : null;
}

export async function deletePost(siteId: string, id: string): Promise<Post | null> {
  if (!isUuid(id)) return null;
  const [row] = await db()`
    with deleted as (delete from posts where site_id = ${siteId} and id = ${id} returning *)
    select deleted.*, s.base_url from deleted join sites s on s.id = deleted.site_id
  `;
  return row ? toPost(row) : null;
}
