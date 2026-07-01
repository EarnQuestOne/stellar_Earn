import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/lib/i18n/config';
import crypto from 'crypto';
import { cspHeaders } from './next.config.csp';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localeDetection: true,
  localePrefix: 'always',
});

export function middleware(request: NextRequest) {
  // Generate nonce per request
  const nonce = crypto.randomBytes(16).toString('base64');

  // Run intl middleware first
  const intlResponse = intlMiddleware(request);

  // Determine CSP header key based on environment
  const isDev = process.env.NODE_ENV !== 'production';
  const headerKey = isDev
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy';

  // Prepare response object
  const response =
    intlResponse instanceof NextResponse
      ? intlResponse
      : NextResponse.next();

  // Fix: Properly handle cspHeaders structure and replace key based on environment
  cspHeaders.forEach((config) => {
    if (config.headers && Array.isArray(config.headers)) {
      config.headers.forEach((header) => {
        if (header.key === 'Content-Security-Policy') {
          const value = header.value.replace(
            /'unsafe-inline'/g,
            `'nonce-${nonce}'`
          );
          response.headers.set(headerKey, value);
        } else {
          response.headers.set(header.key, header.value);
        }
      });
    }
  });

  // Expose nonce to client if needed
  response.headers.set('X-Content-Nonce', nonce);

  return response;
}

export const config = {
  matcher: ['/', '/(es|en)/:path*', '/((?!api|_next|_static|.*\\..*).*)'],
};

