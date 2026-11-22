// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Post } from '@/features/posts/types';

const repo = vi.hoisted(() => ({
  getSite: vi.fn(),
  siteByKeyHash: vi.fn(),
  listSitePosts: vi.fn(),
  getPost: vi.fn(),
  getPublishedBySlug: vi.fn(),
  getPostSources: vi.fn(),
  createDraft: vi.fn(),
  updatePost: vi.fn(),
  setStatus: vi.fn(),
  deletePost: vi.fn(),
  listPublishedFeed: vi.fn(),
  encodeCursor: vi.fn(() => 'next'),
  decodeCursor: vi.fn((value: string | null) => (value === 'good' ? { publishedAt: '2026-01-01', id: 'x' } : null)),
}));

vi.mock('@/features/posts/repo', async () => {
  const actual = await vi.importActual<typeof import('@/features/posts/repo')>('@/features/posts/repo');
  return { ...repo, SlugTakenError: actual.SlugTakenError };
});
vi.mock('@/features/research', () => ({ syncPostSources: vi.fn(async () => 0), searchSources: vi.fn(async () => []), MAX_SEARCH_LENGTH: 200 }));
vi.mock('@/features/posts/blob', () => ({ deletePostBlobs: vi.fn(async () => {}), readMedia: vi.fn() }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));
vi.mock('next/server', () => ({ after: vi.fn() }));

import { hashKey } from '@/features/posts/auth';
import { SlugTakenError } from '@/features/posts/repo';
import { POSTS_TAG } from '@/features/posts/types';
import { revalidateTag } from 'next/cache';
import * as list from './sites/[site]/posts/route';
import * as one from './sites/[site]/posts/[id]/route';
import * as status from './sites/[site]/posts/[id]/status/route';
import * as feed from './posts/route';

const ZODE_KEY = 'cyk_zode';
const OTHER_KEY = 'cyk_other';
const ID = '8b386f59-52a4-49ca-8c9f-eb976c8f66a5';

const post = (overrides: Partial<Post> = {}): Post => ({
  id: ID,
  site: 'zode',
  kind: 'news',
  status: 'draft',
  slug: 'hello',
  title: 'Hello',
  summary: '',
  bodyMd: 'Body.',
  version: null,
  coverPathname: null,
  author: { userId: 'u', name: 'N', email: 'n@zero.tech' },
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  updatedByEmail: null,
  publishedAt: null,
  canonicalUrl: 'https://zode.org/news/hello',
  ...overrides,
});

const request = (method: string, url: string, { key, body }: { key?: string; body?: unknown } = {}) =>
  new Request(`http://test${url}`, {
    method,
    headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const siteCtx = { params: Promise.resolve({ site: 'zode' }) };
const postCtx = { params: Promise.resolve({ site: 'zode', id: ID }) };

beforeEach(() => {
  vi.clearAllMocks();
  repo.getSite.mockResolvedValue({ id: 'zode', name: 'ZODE', baseUrl: 'https://zode.org' });
  repo.siteByKeyHash.mockImplementation(async (hash: string) =>
    hash === hashKey(ZODE_KEY) ? 'zode' : hash === hashKey(OTHER_KEY) ? 'other' : null,
  );
  repo.listSitePosts.mockResolvedValue([post({ status: 'published', publishedAt: new Date('2026-01-02') })]);
  repo.getPost.mockResolvedValue(post());
  repo.getPostSources.mockResolvedValue([]);
});

describe('GET /sites/:site/posts', () => {
  it('lists published posts publicly, cacheable and open to any origin', async () => {
    const res = await list.GET(request('GET', '/api/v1/sites/zode/posts'), siteCtx);
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('cache-control')).toContain('s-maxage');
    expect(repo.listSitePosts).toHaveBeenCalledWith('zode', expect.objectContaining({ status: 'published' }));
    const { posts } = await res.json();
    expect(posts[0]).not.toHaveProperty('bodyMd');
  });

  it('refuses drafts without the site key', async () => {
    const res = await list.GET(request('GET', '/api/v1/sites/zode/posts?status=draft'), siteCtx);
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('unauthorized');
  });

  it("refuses drafts with another site's key", async () => {
    const res = await list.GET(request('GET', '/api/v1/sites/zode/posts?status=all', { key: OTHER_KEY }), siteCtx);
    expect(res.status).toBe(401);
  });

  it('lists every status privately for the site itself', async () => {
    const res = await list.GET(request('GET', '/api/v1/sites/zode/posts?status=all', { key: ZODE_KEY }), siteCtx);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(repo.listSitePosts).toHaveBeenCalledWith('zode', expect.objectContaining({ status: null }));
  });

  it('404s for an unknown site', async () => {
    repo.getSite.mockResolvedValue(null);
    const res = await list.GET(request('GET', '/api/v1/sites/nope/posts'), { params: Promise.resolve({ site: 'nope' }) });
    expect(res.status).toBe(404);
  });

  it('rejects an unknown kind', async () => {
    const res = await list.GET(request('GET', '/api/v1/sites/zode/posts?kind=blog'), siteCtx);
    expect(res.status).toBe(400);
  });
});

describe('POST /sites/:site/posts', () => {
  const author = { userId: 'u1', name: 'Neo', email: 'NEO@zero.tech' };

  it('needs a key', async () => {
    const res = await list.POST(request('POST', '/api/v1/sites/zode/posts', { body: { author } }), siteCtx);
    expect(res.status).toBe(401);
  });

  it("refuses another site's key", async () => {
    const res = await list.POST(request('POST', '/api/v1/sites/zode/posts', { key: OTHER_KEY, body: { author } }), siteCtx);
    expect(res.status).toBe(403);
  });

  it('validates the author', async () => {
    const res = await list.POST(
      request('POST', '/api/v1/sites/zode/posts', { key: ZODE_KEY, body: { author: { ...author, email: 'x' } } }),
      siteCtx,
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('validation');
  });

  it('creates a draft with a normalized email', async () => {
    repo.createDraft.mockResolvedValue(post());
    const res = await list.POST(request('POST', '/api/v1/sites/zode/posts', { key: ZODE_KEY, body: { author } }), siteCtx);
    expect(res.status).toBe(201);
    expect(repo.createDraft).toHaveBeenCalledWith('zode', 'news', { userId: 'u1', name: 'Neo', email: 'neo@zero.tech' });
  });
});

describe('PATCH /sites/:site/posts/:id', () => {
  const draft = { kind: 'news', slug: 'hello', title: 'Hello', summary: '', bodyMd: 'Body.', version: '' };

  it('returns validation messages editors can read', async () => {
    const res = await one.PATCH(
      request('PATCH', `/api/v1/sites/zode/posts/${ID}`, {
        key: ZODE_KEY,
        body: { draft: { ...draft, slug: 'Bad Slug' }, editorEmail: 'n@zero.tech' },
      }),
      postCtx,
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toMatch(/slug/);
  });

  it('maps a slug clash to 409', async () => {
    repo.updatePost.mockRejectedValue(new SlugTakenError('news'));
    const res = await one.PATCH(
      request('PATCH', `/api/v1/sites/zode/posts/${ID}`, { key: ZODE_KEY, body: { draft, editorEmail: 'n@zero.tech' } }),
      postCtx,
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toEqual({
      code: 'slug_taken',
      message: 'Another news post already uses that slug.',
    });
  });

  it('404s for a post of another site', async () => {
    repo.getPost.mockResolvedValue(null);
    const res = await one.PATCH(
      request('PATCH', `/api/v1/sites/zode/posts/${ID}`, { key: ZODE_KEY, body: { draft, editorEmail: 'n@zero.tech' } }),
      postCtx,
    );
    expect(res.status).toBe(404);
  });

  it('saves, publishes and re-indexes sources', async () => {
    const { syncPostSources } = await import('@/features/research');
    repo.updatePost.mockResolvedValue(post());
    repo.setStatus.mockResolvedValue(post({ status: 'published', publishedAt: new Date() }));
    const res = await one.PATCH(
      request('PATCH', `/api/v1/sites/zode/posts/${ID}`, {
        key: ZODE_KEY,
        body: { draft, publish: true, editorEmail: 'n@zero.tech' },
      }),
      postCtx,
    );
    expect(res.status).toBe(200);
    expect(repo.setStatus).toHaveBeenCalledWith('zode', ID, 'published', 'n@zero.tech');
    expect(syncPostSources).toHaveBeenCalledWith(ID, 'Body.');
    expect((await res.json()).post.status).toBe('published');
    // Next 16: expire the cached pages at once, not stale-while-revalidate.
    expect(revalidateTag).toHaveBeenCalledWith(POSTS_TAG, { expire: 0 });
  });

  it('leaves the cache alone when only a draft changes', async () => {
    repo.updatePost.mockResolvedValue(post());
    const res = await one.PATCH(
      request('PATCH', `/api/v1/sites/zode/posts/${ID}`, { key: ZODE_KEY, body: { draft, editorEmail: 'n@zero.tech' } }),
      postCtx,
    );
    expect(res.status).toBe(200);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('hides internal errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    repo.updatePost.mockRejectedValue(new Error('connection refused to 10.0.0.1'));
    const res = await one.PATCH(
      request('PATCH', `/api/v1/sites/zode/posts/${ID}`, { key: ZODE_KEY, body: { draft, editorEmail: 'n@zero.tech' } }),
      postCtx,
    );
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('10.0.0.1');
  });
});

describe('POST /sites/:site/posts/:id/status', () => {
  it('refuses to publish a post that is not ready', async () => {
    repo.getPost.mockResolvedValue(post({ title: '' }));
    const res = await status.POST(
      request('POST', `/api/v1/sites/zode/posts/${ID}/status`, {
        key: ZODE_KEY,
        body: { status: 'published', editorEmail: 'n@zero.tech' },
      }),
      postCtx,
    );
    expect(res.status).toBe(400);
    expect(repo.setStatus).not.toHaveBeenCalled();
  });
});

describe('GET /posts', () => {
  it('rejects a malformed cursor', async () => {
    const res = await feed.GET(request('GET', '/api/v1/posts?cursor=bad'));
    expect(res.status).toBe(400);
  });

  it('pages with a cursor when the page is full', async () => {
    repo.listPublishedFeed.mockResolvedValue([post({ status: 'published', publishedAt: new Date() })]);
    const res = await feed.GET(request('GET', '/api/v1/posts?limit=1&cursor=good'));
    expect(res.status).toBe(200);
    expect((await res.json()).nextCursor).toBe('next');
    expect(repo.listPublishedFeed).toHaveBeenCalledWith({
      site: null,
      limit: 1,
      cursor: { publishedAt: '2026-01-01', id: 'x' },
    });
  });
});
