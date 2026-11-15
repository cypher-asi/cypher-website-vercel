import 'server-only';
import { revalidateTag } from 'next/cache';
import { POSTS_TAG, type Post, type PostSource } from '@/features/posts/types';

export type ErrorCode =
  | 'bad_request'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'slug_taken'
  | 'unavailable'
  | 'internal';

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  validation: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  slug_taken: 409,
  unavailable: 503,
  internal: 500,
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

/**
 * Public reads are cached briefly at the CDN. Vercel never serves or stores a
 * cached copy for a request with an Authorization header, so sites reading
 * with their key always see their latest edits.
 */
const PUBLIC_CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

export function json(body: unknown, init: { status?: number; cache?: 'public' | 'private' } = {}): Response {
  return Response.json(body, {
    status: init.status ?? 200,
    headers: {
      ...CORS,
      'Cache-Control': init.cache === 'public' ? PUBLIC_CACHE : 'private, no-store',
    },
  });
}

export function apiError(code: ErrorCode, message: string): Response {
  return json({ error: { code, message } }, { status: STATUS[code] });
}

export const unauthorized = () => apiError('unauthorized', 'Send this site\'s API key as "Authorization: Bearer <key>".');
export const forbidden = () => apiError('forbidden', "That API key belongs to another site.");
export const notFound = (what = 'post') => apiError('not_found', `No such ${what}.`);

export const preflight = (): Response => new Response(null, { status: 204, headers: CORS });

/** A JSON object body, or `null` when the body isn't one. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Runs a handler, turning anything it throws into a 500 with nothing leaked. */
export async function handle(label: string, run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    console.error(`[api] ${label} failed`, error);
    return apiError('internal', 'Something went wrong. Please try again.');
  }
}

/** Expires this site's cached pages after a write, so the workspace shows it straight away. */
export function postsChanged(): void {
  revalidateTag(POSTS_TAG);
}

export function postJson(post: Post, { withBody = true, sources }: { withBody?: boolean; sources?: PostSource[] } = {}) {
  return {
    id: post.id,
    site: post.site,
    kind: post.kind,
    status: post.status,
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    ...(withBody ? { bodyMd: post.bodyMd } : {}),
    version: post.version,
    coverPathname: post.coverPathname,
    author: post.author,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    updatedByEmail: post.updatedByEmail,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    canonicalUrl: post.canonicalUrl,
    ...(sources
      ? {
          sources: sources.map((s) => ({
            number: s.number,
            title: s.title,
            publisher: s.publisher,
            url: s.url,
            domain: s.domain,
            dateLabel: s.dateLabel,
            detail: s.detail,
          })),
        }
      : {}),
  };
}

const MAX_LIMIT = 100;

/** A `limit` query parameter, clamped to 1..100. */
export function parseLimit(value: string | null, fallback = 50): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? Math.min(n, MAX_LIMIT) : fallback;
}

const SITE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const isSiteId = (value: string): boolean => SITE_RE.test(value) && value.length <= 64;
