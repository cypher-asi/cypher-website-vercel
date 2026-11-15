import { authorize, isSiteRequest } from '@/features/posts/auth';
import { createDraft, getSite, listSitePosts } from '@/features/posts/repo';
import { isPostKind, isPostStatus } from '@/features/posts/types';
import { cleanAuthor } from '@/features/posts/validation';
import {
  apiError,
  forbidden,
  handle,
  isSiteId,
  json,
  notFound,
  postJson,
  preflight,
  readJson,
  unauthorized,
} from '../../../_lib/http';

type Ctx = { params: Promise<{ site: string }> };

/**
 * A site's published posts. With the site's own key, `status` (draft,
 * published or all) and `author` may widen or narrow the list.
 */
export async function GET(request: Request, ctx: Ctx) {
  const { site } = await ctx.params;
  return handle('list posts', async () => {
    if (!isSiteId(site) || !(await getSite(site))) return notFound('site');
    const params = new URL(request.url).searchParams;
    const kind = params.get('kind');
    if (kind !== null && !isPostKind(kind)) return apiError('bad_request', 'kind must be news or changelog.');
    const status = params.get('status');
    const author = params.get('author');
    const own = await isSiteRequest(request, site);
    if ((status !== null && status !== 'published') || author !== null) {
      if (!own) return unauthorized();
    }
    if (status !== null && status !== 'all' && !isPostStatus(status)) {
      return apiError('bad_request', 'status must be draft, published or all.');
    }
    const withBody = params.get('withBody') === '1' || params.get('withBody') === 'true';
    const posts = await listSitePosts(site, {
      kind,
      status: status === 'all' ? null : ((status as 'draft' | 'published' | null) ?? 'published'),
      author,
      withBody,
    });
    return json(
      { posts: posts.map((post) => postJson(post, { withBody })) },
      { cache: own ? 'private' : 'public' },
    );
  });
}

/** Creates an empty draft by `author`, which the site then fills in with PATCH. */
export async function POST(request: Request, ctx: Ctx) {
  const { site } = await ctx.params;
  return handle('create post', async () => {
    const auth = await authorize(request, site);
    if (auth === 'unauthorized') return unauthorized();
    if (auth === 'forbidden') return forbidden();
    const body = await readJson(request);
    if (!body) return apiError('bad_request', 'Send a JSON object.');
    const kind = body.kind ?? 'news';
    if (!isPostKind(kind)) return apiError('validation', 'Choose News or Changelog.');
    const author = cleanAuthor(body.author);
    if ('error' in author) return apiError('validation', author.error);
    const post = await createDraft(site, kind, author);
    return json({ post: postJson(post, { sources: [] }) }, { status: 201 });
  });
}

export const OPTIONS = preflight;
