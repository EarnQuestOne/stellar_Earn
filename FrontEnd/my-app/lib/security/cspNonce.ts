import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Fix for issue #2229:
 * Generates a per-request CSP nonce and sets it on the response headers,
 * replacing the blanket `unsafe-inline` script-src directive.
 *
 * Usage: call `applyNonce(request, response)` in middleware.ts before returning.
 */

/** Generate a cryptographically random base64 nonce */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/** Build a CSP header value using the given nonce for script-src */
export function buildCspWithNonce(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self'`,
    `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? ''}`,
    `frame-ancestors 'none'`,
  ].join('; ');
}

/**
 * Attaches a nonce to the response and sets the CSP header.
 * Returns the nonce so it can be forwarded to the page via a request header.
 */
export function applyNonce(
  request: NextRequest,
  response: NextResponse
): string {
  const nonce = generateNonce();
  response.headers.set('Content-Security-Policy', buildCspWithNonce(nonce));
  // Forward nonce to the page so it can be injected into <script nonce="...">
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  return nonce;
}
