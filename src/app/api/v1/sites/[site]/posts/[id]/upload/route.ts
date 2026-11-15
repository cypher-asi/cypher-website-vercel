import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { authorize } from '@/features/posts/auth';
import { getPost } from '@/features/posts/repo';
import { postBlobPrefix } from '@/features/posts/types';
import { apiError, forbidden, handle, json, notFound, readJson, unauthorized } from '../../../../../_lib/http';

const MAX_IMAGE_BYTES = 10 * 1024 ** 2;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const TOKEN_TTL_MS = 10 * 60 * 1000;

type Ctx = { params: Promise<{ site: string; id: string }> };

/**
 * Issues a client token so an editor's browser uploads one of the post's
 * images straight to Blob, under the post's prefix. The site forwards its
 * editor's `blob.generate-client-token` request here after its own checks.
 */
export async function POST(request: Request, ctx: Ctx) {
  const { site, id } = await ctx.params;
  return handle('upload token', async () => {
    const auth = await authorize(request, site);
    if (auth === 'unauthorized') return unauthorized();
    if (auth === 'forbidden') return forbidden();
    if (!(await getPost(site, id))) return notFound();

    const body = (await readJson(request)) as HandleUploadBody | null;
    if (!body || body.type !== 'blob.generate-client-token') {
      return apiError('bad_request', 'Send a blob.generate-client-token request.');
    }
    try {
      const result = await handleUpload({
        request,
        body,
        onBeforeGenerateToken: async (pathname) => {
          if (!pathname.startsWith(postBlobPrefix(id)) || pathname.includes('..')) {
            throw new Error('Uploads must go into this post.');
          }
          return {
            allowedContentTypes: IMAGE_TYPES,
            addRandomSuffix: true,
            maximumSizeInBytes: MAX_IMAGE_BYTES,
            validUntil: Date.now() + TOKEN_TTL_MS,
          };
        },
      });
      return json(result);
    } catch (error) {
      return apiError('validation', error instanceof Error ? error.message : 'Upload failed.');
    }
  });
}
