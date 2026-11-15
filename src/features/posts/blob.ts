import 'server-only';
import { del, get, list } from '@vercel/blob';
import { postBlobPrefix } from './types';

export function readMedia(pathname: string) {
  return get(pathname, { access: 'private' });
}

export async function deletePostBlobs(postId: string): Promise<void> {
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: postBlobPrefix(postId), cursor, limit: 1000 });
    if (page.blobs.length) await del(page.blobs.map((blob) => blob.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
}
