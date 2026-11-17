/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Post bodies written on company sites link their images at /post-media/...,
  // the path those sites proxy to /api/v1/media, so they render here unchanged.
  async rewrites() {
    return [{ source: '/post-media/:path*', destination: '/api/v1/media/:path*' }];
  },
  async redirects() {
    return [
      { source: '/research', destination: '/papers', permanent: true },
      { source: '/research/:path*', destination: '/papers/:path*', permanent: true },
    ];
  },
  // Windows/virtualized filesystems often miss native file-change events, so
  // Fast Refresh wouldn't pick up edits without a manual restart. Polling the
  // source tree in dev makes hot reload reliable. (node_modules is excluded to
  // keep CPU usage low.)
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 800,
        aggregateTimeout: 300,
        ignored: ['**/node_modules/**', '**/.next/**', '**/.git/**'],
      };
    }
    return config;
  },
};

module.exports = nextConfig;
