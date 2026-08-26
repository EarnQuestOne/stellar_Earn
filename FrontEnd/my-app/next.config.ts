import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,

  reactStrictMode: true,

  // SWC minification is enabled by default in modern Next.js versions.
  // This is retained for explicit build configuration compatibility.
  swcMinify: true,

  compiler: {
    // Remove console statements from production builds,
    // while preserving console.error for production diagnostics.
    removeConsole:
      process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },

  // Optimize commonly used package imports to reduce bundle size
  // and improve tree-shaking.
  modularizeImports: {
    lodash: {
      transform: 'lodash/{{member}}',
    },
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
    dompurify: {
      transform: 'dompurify/dist/purify.es.js',
    },
  },

  experimental: {
    // Optimize package imports automatically.
    optimizePackageImports: ['lucide-react', 'date-fns', 'lodash', 'dompurify'],
  },

  // Security headers (CSP, HSTS, X-Content-Type-Options, etc.) are set
  // dynamically per-request in middleware.ts with a per-request nonce.
};

export default withSentryConfig(withAnalyzer(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload wider client-side source maps for improved Sentry debugging.
  widenClientFileUpload: true,

  // Disable source map deletion because source maps may be handled
  // independently by the project's build/deployment pipeline.
  sourcemaps: {
    disable: true,
  },

  // Keep Sentry output quiet during CI builds.
  silent: process.env.CI === 'true',
});
