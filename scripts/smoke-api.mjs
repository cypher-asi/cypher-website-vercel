/**
 * Checks a deployment of the API end to end with a throwaway post:
 *
 *   npm run smoke:api -- --base https://cypher-website-vercel.vercel.app \
 *     --site smoke --key <smoke key> [--other-key <another site's key>] [--skip-upload]
 *
 * Use a site made for this (site:create smoke "Smoke test" https://example.com):
 * the post it publishes is briefly public. It deletes the post at the end,
 * also when a check fails.
 */
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    base: { type: 'string' },
    site: { type: 'string' },
    key: { type: 'string' },
    'other-key': { type: 'string' },
    'skip-upload': { type: 'boolean', default: false },
  },
});

if (!args.base || !args.site || !args.key) {
  console.error('usage: smoke-api.mjs --base <url> --site <id> --key <key> [--other-key <key>] [--skip-upload]');
  process.exit(1);
}

const api = `${args.base.replace(/\/+$/, '')}/api/v1`;
const sitePosts = `${api}/sites/${args.site}/posts`;
const stamp = Date.now().toString(36);
const slug = `smoke-${stamp}`;
const editorEmail = 'smoke@cypher.net';

let passed = 0;
function check(condition, message, detail) {
  if (!condition) {
    const error = new Error(message);
    error.detail = detail;
    throw error;
  }
  passed++;
  console.log(`  ok  ${message}`);
}

async function call(method, url, { key = args.key, body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, headers: response.headers, data };
}

const body = [
  'Compute is physical.[1](https://example.com/smoke-a) Algorithms spread.[2](https://example.org/smoke-b)',
  '',
  '## Sources',
  '',
  `1. Smoke Publisher, [Smoke source A ${stamp}](https://example.com/smoke-a), Nov 15, 2026.`,
  `2. Smoke Lab, [Smoke source B ${stamp}](https://example.org/smoke-b), 2026.`,
].join('\n');
const draft = { kind: 'news', slug, title: `Smoke test ${stamp}`, summary: 'A throwaway post.', bodyMd: body, version: '' };

let id = null;
try {
  console.log(`Smoke testing ${api} as ${args.site}`);

  const spec = await call('GET', `${api}/openapi.json`, { key: null });
  check(spec.status === 200 && spec.data.openapi?.startsWith('3.'), 'openapi.json is served');

  const created = await call('POST', sitePosts, {
    body: { kind: 'news', author: { userId: 'smoke', name: 'Smoke Test', email: editorEmail } },
  });
  check(created.status === 201 && created.data.post?.status === 'draft', 'creates a draft', created.data);
  id = created.data.post.id;

  const publicList = await call('GET', sitePosts, { key: null });
  check(publicList.status === 200, 'lists published posts without a key', publicList.data);
  check(!publicList.data.posts.some((p) => p.id === id), 'keeps the draft out of the public list');
  check(publicList.headers.get('access-control-allow-origin') === '*', 'allows any origin to read');

  const drafts = await call('GET', `${sitePosts}?status=draft`, { key: null });
  check(drafts.status === 401, 'refuses drafts without a key', drafts.data);

  const invalid = await call('PATCH', `${sitePosts}/${id}`, {
    body: { draft: { ...draft, slug: 'Not A Slug' }, editorEmail },
  });
  check(invalid.status === 400 && invalid.data.error?.code === 'validation', 'rejects a bad slug', invalid.data);

  const notReady = await call('PATCH', `${sitePosts}/${id}`, {
    body: { draft: { ...draft, title: '' }, publish: true, editorEmail },
  });
  check(notReady.status === 400, 'refuses to publish without a title', notReady.data);

  const saved = await call('PATCH', `${sitePosts}/${id}`, { body: { draft, editorEmail } });
  check(saved.status === 200 && saved.data.post.slug === slug, 'saves the draft', saved.data);
  check(saved.data.post.sources?.length === 2, 'indexes the two cited sources', saved.data.post.sources);
  check(saved.data.post.sources[0].publisher === 'Smoke Publisher', 'reads the source publisher');

  const published = await call('POST', `${sitePosts}/${id}/status`, { body: { status: 'published', editorEmail } });
  check(published.status === 200 && published.data.post.publishedAt, 'publishes the post', published.data);
  const publishedAt = published.data.post.publishedAt;

  const bySlug = await call('GET', `${sitePosts}/slug/news/${slug}`, { key: null });
  check(bySlug.status === 200 && bySlug.data.post.bodyMd === body, 'reads the post publicly by slug', bySlug.data);
  check(bySlug.data.post.sources.length === 2, 'returns its sources publicly');

  const feed = await call('GET', `${api}/posts?site=${args.site}&limit=100`, { key: args.key });
  check(feed.status === 200 && feed.data.posts.some((p) => p.id === id), 'shows it in the cross-site feed', feed.data);

  const search = await call('GET', `${api}/research/sources?q=${encodeURIComponent(`"Smoke source A ${stamp}"`)}`, {
    key: args.key,
  });
  check(
    search.status === 200 && search.data.sources.some((s) => s.citedBy.some((p) => p.slug === slug)),
    'finds its source in the research index',
    search.data,
  );

  if (!args['skip-upload']) {
    const token = await call('POST', `${sitePosts}/${id}/upload`, {
      body: {
        type: 'blob.generate-client-token',
        payload: { pathname: `posts/${id}/smoke.png`, multipart: false, clientPayload: null },
      },
    });
    check(token.status === 200 && typeof token.data.clientToken === 'string', 'issues an upload token', token.data);
    const outside = await call('POST', `${sitePosts}/${id}/upload`, {
      body: {
        type: 'blob.generate-client-token',
        payload: { pathname: `posts/someone-else/smoke.png`, multipart: false, clientPayload: null },
      },
    });
    check(outside.status === 400, 'refuses an upload outside the post', outside.data);
  }

  const taken = await call('POST', sitePosts, {
    body: { kind: 'news', author: { userId: 'smoke', name: 'Smoke Test', email: editorEmail } },
  });
  const clash = await call('PATCH', `${sitePosts}/${taken.data.post.id}`, { body: { draft, editorEmail } });
  await call('DELETE', `${sitePosts}/${taken.data.post.id}`);
  check(
    clash.status === 200 && clash.data.post.slug === `${slug}-2`,
    'saves a second post with a taken slug under the next free one',
    clash.data,
  );

  const unpublished = await call('POST', `${sitePosts}/${id}/status`, { body: { status: 'draft', editorEmail } });
  check(unpublished.status === 200 && unpublished.data.post.status === 'draft', 'unpublishes the post');
  const gone = await call('GET', `${sitePosts}/slug/news/${slug}`, { key: null });
  check(gone.status === 404, 'takes it off the public URL');

  const republished = await call('POST', `${sitePosts}/${id}/status`, { body: { status: 'published', editorEmail } });
  check(republished.data.post.publishedAt === publishedAt, 'keeps the first publish date when republishing');

  const wrongKey = await call('POST', sitePosts, { key: 'cyk_not-a-real-key', body: {} });
  check(wrongKey.status === 401, 'refuses an unknown key', wrongKey.data);

  if (args['other-key']) {
    const otherSite = await call('GET', `${sitePosts}/${id}`, { key: args['other-key'] });
    check(otherSite.status === 403, "refuses another site's key", otherSite.data);
  }

  const deleted = await call('DELETE', `${sitePosts}/${id}`);
  check(deleted.status === 200, 'deletes the post', deleted.data);
  id = null;
  const afterDelete = await call('GET', `${sitePosts}/${deleted.data.post.id}`);
  check(afterDelete.status === 404, 'returns 404 once deleted');

  console.log(`\nAll ${passed} checks passed.`);
} catch (error) {
  console.error(`\nFAILED: ${error.message}`);
  if (error.detail !== undefined) console.error(JSON.stringify(error.detail, null, 2));
  process.exitCode = 1;
} finally {
  if (id) await call('DELETE', `${sitePosts}/${id}`).catch(() => {});
}
