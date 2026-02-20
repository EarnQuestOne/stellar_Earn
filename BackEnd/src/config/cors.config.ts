import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * CORS configuration with whitelist support
 * Configures Cross-Origin Resource Sharing security
 */
export const getCorsConfig = (): CorsOptions => {
  // Get allowed origins from environment variable
  const allowedOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];

  return {
    // Specify allowed origins
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in whitelist
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // For development, you might want to allow all origins
      // Remove this in production
      if (process.env.NODE_ENV === 'development') {
        console.warn(`CORS: Allowing origin ${origin} in development mode`);
        return callback(null, true);
      }

      // Reject the request
      return callback(new Error(`CORS: Origin ${origin} not allowed`), false);
    },

    // Allow credentials (cookies, authorization headers)
    credentials: true,

    // Allowed HTTP methods
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],

    // Allowed headers
    allowedHeaders: [
      'Accept',
      'Authorization',
      'Content-Type',
      'X-Requested-With',
      'X-CSRF-Token',
      'X-API-Key',
    ],

    // Headers that can be exposed to the browser
    exposedHeaders: [
      'X-Request-ID',
      'X-Response-Time',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],

    // Preflight cache duration (in seconds)
    maxAge: 86400, // 24 hours

    // Enable preflight for all routes
    preflightContinue: false,

    // Return status 204 for successful preflight
    optionsSuccessStatus: 204,
  };
};