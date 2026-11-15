import { authorize } from '@/features/posts/auth';
import { getPost, getPostSources, setStatus } from '@/features/posts/repo';
import { isPostStatus } from '@/features/posts/types';
import { cleanDraft, cleanEmail } from '@/features/posts/validation';
import {
  apiError,
  forbidden,
  handle,
  json,
  notFound,
  postJson,
  postsChanged,
  readJson,
  unauthorized,
} from '../../../../../_lib/http';

type Ctx = { params: Promise<{ site: string; id: string }> };

/**
 * Publishes or unpublishes a post as it is saved. Publishing checks the saved
 * post the way a publishing PATCH would, and keeps its first publish date.
 */
export async function POST(request: Request, ctx: Ctx) {
  const { site, id } = await ctx.params;
  return handle('set status', async () => {
    const auth = await authorize(request, site);
    if (auth === 'unauthorized') return unauthorized();
    if (auth === 'forbidden') return forbidden();
    const body = await readJson(request);
    if (!body) return apiError('bad_request', 'Send a JSON object.');
    if (!isPostStatus(body.status)) return apiError('validation', 'status must be draft or published.');
    const editorEmail = cleanEmail(body.editorEmail);
    if (!editorEmail) return apiError('validation', 'editorEmail must be an email address.');

    const before = await getPost(site, id);
    if (!before) return notFound();
    if (body.status === 'published') {
      const check = cleanDraft(id, { ...before, version: before.version ?? '' }, true);
      if ('error' in check) return apiError('validation', check.error);
    }
    const post = await setStatus(site, id, body.status, editorEmail);
    if (!post) return notFound();
    if (before.status !== post.status || post.status === 'published') postsChanged();
    return json({ post: postJson(post, { sources: await getPostSources(post.id) }) });
  });
}
