// Windows/virtualized filesystems often miss native file-change events, so
// Fast Refresh wouldn't pick up edits without a manual restart. Polling the
// source tree in dev makes hot reload reliable there, at a CPU/I/O cost.
// Turbopack (the default bundler since Next 16) has no webpack hook, so
// polling is opt-in: run `npm run dev:poll`, or set NEXT_DEV_POLL_MS (e.g. in
// .env.local) to a poll interval in milliseconds. Only `next dev` watches.
const pollIntervalMs =
  Number(process.env.NEXT_DEV_POLL_MS) > 0
    ? Number(process.env.NEXT_DEV_POLL_MS)
    : process.env.npm_lifecycle_event === 'dev:poll'
      ? 800
      : undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  ...(pollIntervalMs ? { watchOptions: { pollIntervalMs } } : {}),
  experimental: {
    // Keep visited pages in the client router cache for a while, so switching
    // back to a post already read in the workspace doesn't wait on the server.
    staleTimes: { dynamic: 60 },
  },
  // Post bodies written on company sites link their images at /post-media/...,
  // the path those sites proxy to /api/v1/media, so they render here unchanged.
  async rewrites() {
    return [{ source: '/post-media/:path*', destination: '/api/v1/media/:path*' }];
  },
  async redirects() {
    return [
      { source: '/research', destination: '/papers', permanent: true },
      { source: '/research/:path*', destination: '/papers/:path*', permanent: true },
      // Posts moved from /writing/{site}/{kind}/{slug} to /{slug}.
      { source: '/writing/:site/:kind/:slug', destination: '/:slug', permanent: true },
    ];
  },
};

module.exports = nextConfig;
