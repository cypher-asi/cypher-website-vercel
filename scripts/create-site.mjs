/**
 * Registers a site that publishes through the API and prints its key once:
 *
 *   npm run site:create -- zode ZODE https://zode.org
 *
 * Only the key's SHA-256 is stored. Save the key in the site's environment
 * as CYPHER_API_KEY; to replace a lost or leaked key, use site:rotate-key.
 */
import { createHash, randomBytes } from 'node:crypto';
import { connect, fail } from './lib/neon.mjs';

const [id, name, baseUrl] = process.argv.slice(2);

if (!id || !name || !baseUrl) fail('site', 'usage: create-site.mjs <id> <name> <baseUrl>');
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) fail('site', 'id must be lowercase words joined by hyphens.');
try {
  if (!['http:', 'https:'].includes(new URL(baseUrl).protocol)) throw new Error();
} catch {
  fail('site', 'baseUrl must be an http(s) URL, like https://zode.org.');
}
if (!process.env.DATABASE_URL) fail('site', 'DATABASE_URL is not set.');

const sql = connect(process.env.DATABASE_URL);
const key = `cyk_${randomBytes(32).toString('base64url')}`;
const hash = createHash('sha256').update(key).digest('hex');

const [row] = await sql`
  insert into sites (id, name, base_url, api_key_hash) values (${id}, ${name}, ${baseUrl.replace(/\/+$/, '')}, ${hash})
  on conflict (id) do nothing
  returning id
`;
if (!row) fail('site', `${id} already exists; use site:rotate-key for a new key.`);

console.log(`[site] created ${id}. Its API key, shown only now:\n\n${key}\n`);
