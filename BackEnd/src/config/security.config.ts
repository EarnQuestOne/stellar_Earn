import { ConfigService } from '@nestjs/config';
import { HelmetOptions } from 'helmet';

/**
 * Security configuration for Helmet middleware
 * Provides comprehensive security headers to protect against common web vulnerabilities
 */
export const getSecurityConfig = (configService: ConfigService): HelmetOptions => {
  return {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'https://api.stellar.org'],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
        childSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },

    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false,
    },

    // Frameguard
    frameguard: {
      action: 'deny',
    },

    // Hide Powered-By header
    hidePoweredBy: true,

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // Internet Explorer XSS Filter
    ieNoOpen: true,

    // No Sniff
    noSniff: true,

    // Referrer Policy
    referrerPolicy: {
      policy: 'no-referrer',
    },

    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: true,

    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: {
      policy: 'same-origin',
    },

    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: {
      policy: 'same-origin',
    },

    // Origin Agent Cluster
    originAgentCluster: true,

    // Remove X-XSS-Protection (deprecated but still used by some browsers)
    xssFilter: true,
  };
};