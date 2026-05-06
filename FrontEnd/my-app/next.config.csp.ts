// CSP header configuration fragment for next.config.ts
// Usage: import { cspHeaders } from './next.config.csp';
//        then spread into the headers() array in next.config.ts

export const cspHeaders = [
  {
    source: '/(.*)',
    headers: [
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self'",
          "connect-src 'self'",
          "frame-ancestors 'none'",
        ].join('; '),
      },
    ],
  },
];
