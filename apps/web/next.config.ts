import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Required for Docker production build — generates minimal standalone server
  output: 'standalone',
};

export default nextConfig;
