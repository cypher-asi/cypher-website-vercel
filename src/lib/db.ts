import 'server-only';
import { neon, neonConfig, type NeonQueryFunction } from '@neondatabase/serverless';

/** Local Postgres behind Neon's HTTP proxy on port 4444 (see README). */
const LOCAL_HOST = 'db.localtest.me';

let client: NeonQueryFunction<false, false> | undefined;

/**
 * Neon's HTTP query function for DATABASE_URL, created on first use so that
 * importing this module never needs the variable (e.g. while prerendering).
 */
export function db(): NeonQueryFunction<false, false> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  if (!client) {
    if (new URL(url).hostname === LOCAL_HOST) neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`;
    client = neon(url);
  }
  return client;
}
