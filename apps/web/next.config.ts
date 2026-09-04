import type { NextConfig } from 'next';

/**
 * Optional same-origin API proxy.
 *
 * When API_PROXY_TARGET is set, /api/* on the web origin is forwarded to the
 * API. That makes the browser talk to a single origin, which removes CORS from
 * local development and is also what you want behind a reverse proxy in
 * production. Set NEXT_PUBLIC_API_URL to the web origin's /api path to use it.
 *
 * Unset by default, so the standard cross-origin setup
 * (NEXT_PUBLIC_API_URL=http://localhost:3001) keeps working unchanged.
 */
const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Required for Docker production build — generates minimal standalone server
  output: 'standalone',
  ...(apiProxyTarget
    ? {
        async rewrites() {
          return [{ source: '/api/:path*', destination: `${apiProxyTarget}/api/:path*` }];
        },
      }
    : {}),
};

export default nextConfig;
