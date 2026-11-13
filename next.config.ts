import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.29.119', '*.trycloudflare.com'],
  experimental: {
    instantInsights: {
      validationLevel: 'manual-warning',
    },
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
