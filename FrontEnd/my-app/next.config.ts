import type { NextConfig } from 'next';
import { cspHeaders } from './next.config.csp';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    const headerKey = isDev
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';
    // Flatten cspHeaders and replace key based on environment
    const baseHeaders = cspHeaders[0].headers;
    const modifiedHeaders = baseHeaders.map((h) => {
      if (h.key === 'Content-Security-Policy') {
        return { key: headerKey, value: h.value };
      }
      return h;
    });
    return [{ source: '/(.*)', headers: modifiedHeaders }];
  },
};

export default withSentryConfig(withAnalyzer(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
  sourcemaps: { disable: true },
  silent: process.env.CI === 'true',
});

