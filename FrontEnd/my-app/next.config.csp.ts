// CSP header configuration for next.config.ts
// Usage: import { cspHeaders } from './next.config.csp';
//        then spread into the headers() array in next.config.ts

const STELLAR_TESTNET_SOROBAN = 'https://soroban-testnet.stellar.org';
const STELLAR_TESTNET_HORIZON = 'https://horizon-testnet.stellar.org';
const STELLAR_MAINNET_HORIZON = 'https://horizon.stellar.org';
const SENTRY_INGEST = 'https://*.sentry.io https://*.ingest.sentry.io';

export const cspHeaders = [
  {
    source: '/(.*)',
    headers: [
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          // Add 'unsafe-inline' for development to fix Next.js 15 inline script issues
          // For production, you would add the specific sha256 hashes from your browser errors
          "script-src 'self' 'unsafe-inline'",
          // 'unsafe-inline' retained for style-src only (Tailwind utility classes, CSS vars)
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "img-src 'self' data: blob: https:",
          "font-src 'self' https://fonts.gstatic.com",
          `connect-src 'self' ${STELLAR_TESTNET_SOROBAN} ${STELLAR_TESTNET_HORIZON} ${STELLAR_MAINNET_HORIZON} ${SENTRY_INGEST} ws: wss:`,
          "frame-src 'none'",
          "frame-ancestors 'none'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
    ],
  },
];
