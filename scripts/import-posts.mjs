/**
 * Copies a site's posts from the database it kept them in before Cypher, with
 * their images, and indexes the sources they cite:
 *
 *   SOURCE_DATABASE_URL=… SOURCE_BLOB_READ_WRITE_TOKEN=… \
 *     npm run posts:import -- --site zode [--dry-run] [--skip-images]
 *
 * Posts keep their ids, slugs, status and dates, so links and image paths stay
 * valid. Running it again updates posts in place and skips images already
 * copied. The site must exist (site:create) first.
 */
import { parseArgs } from 'node:util';
import { get, head, list, put } from '@vercel/blob';
import { sourceSyncQueries } from '../src/features/research/sync.ts';
import { connect, fail } from './lib/neon.mjs';

const { values: args } = parseArgs({
  options: {
    site: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    'skip-images': { type: 'boolean', default: false },
  },
});

const tag = 'import';
if (!args.site) fail(tag, '--site is required.');
if (!process.env.SOURCE_DATABASE_URL) fail(tag, 'SOURCE_DATABASE_URL is not set.');
if (!process.env.DATABASE_URL) fail(tag, 'DATABASE_URL is not set.');
const copyImages = !args['skip-images'];
if (copyImages && !process.env.SOURCE_BLOB_READ_WRITE_TOKEN) fail(tag, 'SOURCE_BLOB_READ_WRITE_TOKEN is not set.');
if (copyImages && !process.env.BLOB_READ_WRITE_TOKEN) fail(tag, 'BLOB_READ_WRITE_TOKEN is not set.');

const source = connect(process.env.SOURCE_DATABASE_URL);
const target = connect(process.env.DATABASE_URL);

const [site] = await target`select id from sites where id = ${args.site}`;
if (!site) fail(tag, `No site ${args.site}; create it with site:create first.`);

const posts = await source`select * from posts order by created_at`;
console.log(`[${tag}] ${posts.length} posts in the source database.`);

let images = 0;
let citations = 0;
for (const post of posts) {
  const label = `${post.kind}/${post.slug} (${post.status})`;
  const { queries, count } = sourceSyncQueries(target, post.id, post.body_md);
  if (args['dry-run']) {
    console.log(`[${tag}] would import ${label}, citing ${count} sources.`);
    continue;
  }

  await target.transaction([
    target`
      insert into posts (id, site_id, kind, status, slug, title, summary, body_md, version, cover_pathname,
        author_user_id, author_name, author_email, created_at, updated_at, updated_by_email, published_at)
      values (${post.id}, ${args.site}, ${post.kind}, ${post.status}, ${post.slug}, ${post.title}, ${post.summary},
        ${post.body_md}, ${post.version}, ${post.cover_pathname}, ${post.author_user_id}, ${post.author_name},
        ${post.author_email}, ${post.created_at}, ${post.updated_at}, ${post.updated_by_email}, ${post.published_at})
      on conflict (id) do update set
        kind = excluded.kind, status = excluded.status, slug = excluded.slug, title = excluded.title,
        summary = excluded.summary, body_md = excluded.body_md, version = excluded.version,
        cover_pathname = excluded.cover_pathname, author_user_id = excluded.author_user_id,
        author_name = excluded.author_name, author_email = excluded.author_email,
        updated_at = excluded.updated_at, updated_by_email = excluded.updated_by_email,
        published_at = excluded.published_at
      where posts.site_id = ${args.site}
    `,
    ...queries,
  ]);
  citations += count;

  let copied = 0;
  if (copyImages) {
    let cursor;
    do {
      const page = await list({
        prefix: `posts/${post.id}/`,
        cursor,
        limit: 1000,
        token: process.env.SOURCE_BLOB_READ_WRITE_TOKEN,
      });
      for (const blob of page.blobs) {
        const exists = await head(blob.pathname).catch(() => null);
        if (exists) continue;
        const file = await get(blob.pathname, { access: 'private', token: process.env.SOURCE_BLOB_READ_WRITE_TOKEN });
        if (!file || file.statusCode !== 200) {
          console.warn(`[${tag}] couldn't read ${blob.pathname}; skipped.`);
          continue;
        }
        const body = Buffer.from(await new Response(file.stream).arrayBuffer());
        await put(blob.pathname, body, {
          access: 'private',
          contentType: file.blob.contentType,
          addRandomSuffix: false,
          allowOverwrite: true,
        });
        copied++;
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }
  images += copied;
  console.log(`[${tag}] imported ${label}: ${count} sources, ${copied} new images.`);
}

if (!args['dry-run']) {
  console.log(`[${tag}] done: ${posts.length} posts, ${citations} citations, ${images} images copied.`);
}
