export type PostKind = 'news' | 'changelog';
export type PostStatus = 'draft' | 'published';

export const POST_KINDS: readonly PostKind[] = ['news', 'changelog'];

export const isPostKind = (value: unknown): value is PostKind => value === 'news' || value === 'changelog';
export const isPostStatus = (value: unknown): value is PostStatus => value === 'draft' || value === 'published';

export const MAX_TITLE_LENGTH = 160;
export const MAX_SUMMARY_LENGTH = 320;
export const MAX_SLUG_LENGTH = 96;
export const MAX_VERSION_LENGTH = 32;
export const MAX_BODY_LENGTH = 200_000;

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Tag on every cached read of posts by this site's own pages; writes through the API expire it. */
export const POSTS_TAG = 'posts';

/** Every image uploaded for a post is stored under this prefix. */
export const MEDIA_PREFIX = 'posts/';
export const postBlobPrefix = (postId: string): string => `${MEDIA_PREFIX}${postId}/`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string): boolean => UUID_RE.test(value);

export interface Site {
  id: string;
  name: string;
  baseUrl: string;
}

export interface Author {
  userId: string;
  name: string;
  email: string;
}

/** One numbered source a post cites, as indexed in research_sources. */
export interface PostSource {
  number: number;
  sourceId: string;
  url: string;
  title: string;
  publisher: string;
  domain: string;
  dateLabel: string;
  detail: string;
}

export interface Post {
  id: string;
  site: string;
  kind: PostKind;
  status: PostStatus;
  slug: string;
  title: string;
  summary: string;
  /** Empty in lists, which leave the body out unless asked. */
  bodyMd: string;
  version: string | null;
  coverPathname: string | null;
  author: Author;
  createdAt: Date;
  updatedAt: Date;
  updatedByEmail: string | null;
  publishedAt: Date | null;
  canonicalUrl: string;
}

/** What a site sends to save a post. */
export interface PostDraft {
  kind: PostKind;
  slug: string;
  title: string;
  summary: string;
  bodyMd: string;
  version: string;
  coverPathname: string | null;
}

/** The path a post lives at on its own site. */
export const postPath = (kind: PostKind, slug: string): string => `/${kind}/${slug}`;
