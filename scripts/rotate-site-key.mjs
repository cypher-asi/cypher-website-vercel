/**
 * Replaces a site's API key and prints the new one once. The old key stops
 * working immediately, so update the site's CYPHER_API_KEY right after.
 *
 *   npm run site:rotate-key -- zode
 */
import { createHash, randomBytes } from 'node:crypto';
import { connect, fail } from './lib/neon.mjs';

const [id] = process.argv.slice(2);
if (!id) fail('site', 'usage: rotate-site-key.mjs <id>');
if (!process.env.DATABASE_URL) fail('site', 'DATABASE_URL is not set.');

const sql = connect(process.env.DATABASE_URL);
const key = `cyk_${randomBytes(32).toString('base64url')}`;
const hash = createHash('sha256').update(key).digest('hex');

const [row] = await sql`update sites set api_key_hash = ${hash} where id = ${id} returning id`;
if (!row) fail('site', `No site ${id}.`);

console.log(`[site] rotated ${id}. Its new API key, shown only now:\n\n${key}\n`);
