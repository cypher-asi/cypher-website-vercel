import { getPostSources, getPublishedBySiteSlug } from '@/features/posts/repo';
import { isSiteRequest } from '@/features/posts/auth';
import { isPostKind } from '@/features/posts/types';
import { handle, isSiteId, json, notFound, postJson, preflight } from '../../../../../../_lib/http';

type Ctx = { params: Promise<{ site: string; kind: string; slug: string }> };

/** One published post by its public URL, with its sources. */
export async function GET(request: Request, ctx: Ctx) {
  const { site, kind, slug } = await ctx.params;
  return handle('get post by slug', async () => {
    if (!isSiteId(site) || !isPostKind(kind)) return notFound();
    const post = await getPublishedBySiteSlug(site, kind, slug);
    if (!post) return notFound();
    const sources = await getPostSources(post.id);
    const own = await isSiteRequest(request, site);
    return json({ post: postJson(post, { sources }) }, { cache: own ? 'private' : 'public' });
  });
}

export const OPTIONS = preflight;
