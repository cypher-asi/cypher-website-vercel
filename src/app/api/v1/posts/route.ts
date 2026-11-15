import { decodeCursor, encodeCursor, listPublishedFeed } from '@/features/posts/repo';
import { apiError, handle, isSiteId, json, parseLimit, postJson, preflight } from '../_lib/http';

/** Published posts across every site (or `site`), newest first, a page at a time. */
export async function GET(request: Request) {
  return handle('feed', async () => {
    const params = new URL(request.url).searchParams;
    const site = params.get('site');
    if (site !== null && !isSiteId(site)) return apiError('bad_request', 'site must be a site id.');
    const rawCursor = params.get('cursor');
    const cursor = decodeCursor(rawCursor);
    if (rawCursor && !cursor) return apiError('bad_request', 'That cursor is not valid.');
    const limit = parseLimit(params.get('limit'));
    const posts = await listPublishedFeed({ site, limit, cursor });
    return json(
      {
        posts: posts.map((post) => postJson(post, { withBody: false })),
        nextCursor: posts.length === limit ? encodeCursor(posts[posts.length - 1]) : null,
      },
      { cache: 'public' },
    );
  });
}

export const OPTIONS = preflight;
