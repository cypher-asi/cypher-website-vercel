import { after } from 'next/server';
import { authorize } from '@/features/posts/auth';
import { deletePostBlobs } from '@/features/posts/blob';
import {
  SlugTakenError,
  deletePost,
  getPost,
  getPostSources,
  setStatus,
  updatePost,
} from '@/features/posts/repo';
import { cleanDraft, cleanEmail } from '@/features/posts/validation';
import { syncPostSources } from '@/features/research';
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
} from '../../../../_lib/http';

type Ctx = { params: Promise<{ site: string; id: string }> };

async function guard(request: Request, site: string): Promise<Response | null> {
  const auth = await authorize(request, site);
  if (auth === 'unauthorized') return unauthorized();
  if (auth === 'forbidden') return forbidden();
  return null;
}

/** Any of the site's posts, drafts included, with its sources. */
export async function GET(request: Request, ctx: Ctx) {
  const { site, id } = await ctx.params;
  return handle('get post', async () => {
    const denied = await guard(request, site);
    if (denied) return denied;
    const post = await getPost(site, id);
    if (!post) return notFound();
    return json({ post: postJson(post, { sources: await getPostSources(post.id) }) });
  });
}

/**
 * Saves `draft` over the post, then publishes it when `publish` is set. A
 * published post's edits go live straight away.
 */
export async function PATCH(request: Request, ctx: Ctx) {
  const { site, id } = await ctx.params;
  return handle('save post', async () => {
    const denied = await guard(request, site);
    if (denied) return denied;
    const body = await readJson(request);
    if (!body) return apiError('bad_request', 'Send a JSON object.');
    const editorEmail = cleanEmail(body.editorEmail);
    if (!editorEmail) return apiError('validation', 'editorEmail must be an email address.');
    const publish = body.publish === true;

    const before = await getPost(site, id);
    if (!before) return notFound();
    const draft = cleanDraft(id, body.draft, publish);
    if ('error' in draft) return apiError('validation', draft.error);

    let post;
    try {
      post = await updatePost(site, id, draft, editorEmail);
    } catch (error) {
      if (error instanceof SlugTakenError) {
        return apiError('slug_taken', 'Another post already uses that slug. Please try again.');
      }
      throw error;
    }
    if (post && publish && post.status !== 'published') post = await setStatus(site, id, 'published', editorEmail);
    if (!post) return notFound();

    await syncPostSources(post.id, post.bodyMd);
    if (before.status === 'published' || post.status === 'published') postsChanged();
    return json({ post: postJson(post, { sources: await getPostSources(post.id) }) });
  });
}

/** Deletes the post, its citations and, after responding, its images. */
export async function DELETE(request: Request, ctx: Ctx) {
  const { site, id } = await ctx.params;
  return handle('delete post', async () => {
    const denied = await guard(request, site);
    if (denied) return denied;
    const post = await deletePost(site, id);
    if (!post) return notFound();
    if (post.status === 'published') postsChanged();
    after(() =>
      deletePostBlobs(post.id).catch((error: unknown) => console.error('[api] couldn\'t delete images', post.id, error)),
    );
    return json({ post: postJson(post, { withBody: false }) });
  });
}
