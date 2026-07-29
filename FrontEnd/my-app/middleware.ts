import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/lib/i18n/config';
import type { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// CSP origin constants
// ---------------------------------------------------------------------------

const STELLAR_TESTNET_SOROBAN = 'https://soroban-testnet.stellar.org';
const STELLAR_TESTNET_HORIZON = 'https://horizon-testnet.stellar.org';
const STELLAR_MAINNET_HORIZON = 'https://horizon.stellar.org';
const STELLAR_MAINNET_SOROBAN = 'https://soroban.stellar.org';
const SENTRY_INGEST = 'https://*.sentry.io https://*.ingest.sentry.io';

// ---------------------------------------------------------------------------
// Nonce generation (Edge-runtime compatible)
// ---------------------------------------------------------------------------

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

// ---------------------------------------------------------------------------
// CSP builder
// ---------------------------------------------------------------------------

function buildCspHeader(nonce: string, apiBaseUrl: string): string {
  // Derive the backend HTTP origin + WebSocket origin from NEXT_PUBLIC_API_BASE_URL
  let connectSrc = "'self'";
  try {
    const url = new URL(apiBaseUrl);
    connectSrc += ` ${url.origin}`;
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    connectSrc += ` ${wsProtocol}//${url.host}`;
  } catch {
    // Invalid URL – rely on 'self' only
  }

  connectSrc += ` ${STELLAR_TESTNET_SOROBAN} ${STELLAR_TESTNET_HORIZON} ${STELLAR_MAINNET_HORIZON} ${STELLAR_MAINNET_SOROBAN}`;
  connectSrc += ` ${SENTRY_INGEST}`;

  return [
    "default-src 'self'",
    // Nonce restricts inline script execution to those carrying the per-request
    // nonce. 'unsafe-inline' is retained as a temporary fallback for Next.js 15
    // hydration scripts that are injected without a nonce attribute. When Next.js
    // adds native nonce support the 'unsafe-inline' token can be removed.
    `script-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    // 'unsafe-inline' kept for style-src (Tailwind utility classes, CSS vars)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src ${connectSrc}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

// ---------------------------------------------------------------------------
// i18n middleware (next-intl)
// ---------------------------------------------------------------------------

const i18nMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localeDetection: true,
  localePrefix: 'always',
});

// ---------------------------------------------------------------------------
// Main middleware
// ---------------------------------------------------------------------------

export function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

  // Expose the nonce to Server Components via headers()
  request.headers.set('x-nonce', nonce);

  // Delegate locale detection / routing to next-intl
  const response = i18nMiddleware(request);

  // ---- Content Security Policy (per-request nonce) ----
  response.headers.set(
    'Content-Security-Policy',
    buildCspHeader(nonce, apiBaseUrl)
  );

  // ---- Standard security headers ----
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), geolocation=(), microphone=()'
  );

  // HSTS – only over HTTPS to avoid browser warnings on localhost / HTTP dev
  const proto = request.headers.get('x-forwarded-proto');
  if (proto === 'https' || request.nextUrl.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  return response;
}

// ---------------------------------------------------------------------------
// Matcher – only run on page routes (skip API, Next.js internals, static files)
// ---------------------------------------------------------------------------

export const config = {
  matcher: ['/', '/(es|en)/:path*', '/((?!api|_next|_static|.*\\..*).*)'],
};
