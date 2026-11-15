import { readMedia } from '@/features/posts/blob';
import { MEDIA_PREFIX } from '@/features/posts/types';

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });

/**
 * Serves post images from the private Blob store. Pathnames carry a random
 * suffix and never change, so responses are cached for good.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const pathname = path.join('/');
  if (!pathname.startsWith(MEDIA_PREFIX) || path.some((segment) => segment === '..' || segment === '.')) {
    return notFound();
  }

  let blob: Awaited<ReturnType<typeof readMedia>>;
  try {
    blob = await readMedia(pathname);
  } catch (error) {
    console.error(`[media] couldn't read ${pathname}`, error);
    return new Response('Image storage is unavailable.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!blob || blob.statusCode !== 200) return notFound();

  const contentType = blob.blob.contentType;
  if (!IMAGE_TYPES.has(contentType)) return notFound();

  const headers = new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Access-Control-Allow-Origin': '*',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
  });
  const length = blob.headers.get('content-length');
  if (length) headers.set('Content-Length', length);
  return new Response(blob.stream, { headers });
}
