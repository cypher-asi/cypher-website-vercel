import { neon, neonConfig } from '@neondatabase/serverless';

/** Local Postgres behind Neon's HTTP proxy on port 4444 (see README). */
const LOCAL_HOST = 'db.localtest.me';

const neonEndpoint = neonConfig.fetchEndpoint;
neonConfig.fetchEndpoint = (host, port, options) =>
  host === LOCAL_HOST ? `http://${host}:4444/sql` : neonEndpoint(host, port, options);

/** Neon's HTTP query function for a connection string, local proxy included. */
export const connect = (url) => neon(url);

export function fail(tag, message) {
  console.error(`[${tag}] ${message}`);
  process.exit(1);
}
