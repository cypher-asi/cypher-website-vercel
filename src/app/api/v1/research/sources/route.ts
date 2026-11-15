import { MAX_SEARCH_LENGTH, searchSources } from '@/features/research';
import { apiError, handle, json, parseLimit, preflight } from '../../_lib/http';

const MAX_OFFSET = 10_000;

/** Searches the sources cited by published posts; `cursor` is the offset of the next page. */
export async function GET(request: Request) {
  return handle('search sources', async () => {
    const params = new URL(request.url).searchParams;
    const q = params.get('q') ?? '';
    if (q.length > MAX_SEARCH_LENGTH) return apiError('bad_request', 'That search is too long.');
    const offset = params.get('cursor') ? Number(params.get('cursor')) : 0;
    if (!Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET) {
      return apiError('bad_request', 'That cursor is not valid.');
    }
    const limit = parseLimit(params.get('limit'));
    const sources = await searchSources({ q, limit, offset });
    return json(
      { sources, nextCursor: sources.length === limit ? String(offset + limit) : null },
      { cache: 'public' },
    );
  });
}

export const OPTIONS = preflight;
