import 'server-only';
import { unstable_cache } from 'next/cache';
import { getPostSources, getPublishedBySlug, listPublishedFeed, publishedCountsBySite } from '@/features/posts/repo';
import { POSTS_TAG, isPostKind, type Post, type PostSource } from '@/features/posts/types';

/** A published post as the Writing panel lists it. Plain data, so it survives the cache. */
export interface WritingItem {
  id: string;
  site: string;
  kind: string;
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  canonicalUrl: string;
  href: string;
}

export interface WritingSource extends PostSource {
  citedBy: number;
}

export interface WritingPost extends WritingItem {
  bodyMd: string;
  authorName: string;
  sources: WritingSource[];
}

export const writingHref = (site: string, kind: string, slug: string): string => `/writing/${site}/${kind}/${slug}`;

const toItem = (post: Post): WritingItem => ({
  id: post.id,
  site: post.site,
  kind: post.kind,
  slug: post.slug,
  title: post.title,
  summary: post.summary,
  publishedAt: (post.publishedAt ?? post.updatedAt).toISOString(),
  canonicalUrl: post.canonicalUrl,
  href: writingHref(post.site, post.kind, post.slug),
});

const FEED_LIMIT = 100;
const CACHE = { tags: [POSTS_TAG], revalidate: 3600 };

const cachedFeed = unstable_cache(
  async (): Promise<WritingItem[]> => (await listPublishedFeed({ limit: FEED_LIMIT })).map(toItem),
  ['writing-feed'],
  CACHE,
);

const cachedCounts = unstable_cache(publishedCountsBySite, ['writing-counts'], CACHE);

const cachedPost = unstable_cache(
  async (site: string, kind: string, slug: string): Promise<WritingPost | null> => {
    if (!isPostKind(kind)) return null;
    const post = await getPublishedBySlug(site, kind, slug);
    if (!post) return null;
    return {
      ...toItem(post),
      bodyMd: post.bodyMd,
      authorName: post.author.name,
      sources: await getPostSources(post.id),
    };
  },
  ['writing-post'],
  CACHE,
);

/*
 * Failures throw inside the cache, so they're never cached, and turn into
 * `null` (feed, counts) or 'unavailable' (a post) outside it, so the
 * workspace can say the writing couldn't load rather than that there is none.
 */

export function loadFeed(): Promise<WritingItem[] | null> {
  return cachedFeed().catch((error: unknown) => {
    console.error('[writing] failed to load the feed', error);
    return null;
  });
}

export function loadCounts(): Promise<Record<string, number>> {
  return cachedCounts().catch((error: unknown) => {
    console.error('[writing] failed to load counts', error);
    return {};
  });
}

export function loadPost(site: string, kind: string, slug: string): Promise<WritingPost | null | 'unavailable'> {
  return cachedPost(site, kind, slug).catch((error: unknown) => {
    console.error(`[writing] failed to load ${site}/${kind}/${slug}`, error);
    return 'unavailable' as const;
  });
}
