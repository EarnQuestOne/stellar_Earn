// CSP is now built dynamically per-request in middleware.ts.
// This file previously held a static CSP header applied to all routes via
// next.config.ts headers(). It has been replaced by the nonce-based CSP in
// middleware.ts which generates a unique nonce for every request.
//
// The Stellar / Sentry origin constants used by the CSP are defined directly
// in middleware.ts. If other parts of the codebase need these constants,
// consider extracting them to a shared config module.
