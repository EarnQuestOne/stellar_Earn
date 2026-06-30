/**
 * generate-openapi.ts
 *
 * Headless NestJS bootstrap that produces the OpenAPI JSON specification
 * without starting an HTTP server or connecting to external services.
 *
 * Usage:
 *   ts-node scripts/generate-openapi.ts [--output <path>]
 *
 * Environment:
 *   OPENAPI_OUTPUT_PATH   Override the default output file path.
 *                         Defaults to: dist/openapi/openapi.json
 *
 * This script is intentionally kept lightweight – it uses NestFactory.create()
 * with a no-op HTTP adapter so that no real TCP port is opened and no external
 * service connections are attempted.
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Minimal environment stubs – allow the app module to load without real
// external services.  These are only set when the variable is not already
// present so that a real environment (staging CI, etc.) always wins.
// ---------------------------------------------------------------------------
const CI_ENV_DEFAULTS: Record<string, string> = {
  NODE_ENV: 'openapi-gen',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'password',
  DB_DATABASE: 'stellar_earn',
  DATABASE_URL: 'postgresql://postgres:password@localhost:5432/stellar_earn',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'openapi-gen-secret',
  JWT_PRIVATE_KEY: 'dummy',
  JWT_PUBLIC_KEY: 'dummy',
  STELLAR_NETWORK: 'testnet',
  HORIZON_URL: 'https://horizon-testnet.stellar.org',
  SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
  SOROBAN_SECRET_KEY:
    'SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  SENDGRID_API_KEY: 'SG.dummy',
  EMAIL_FROM_ADDRESS: 'noreply@stellarearn.com',
  EMAIL_FROM_NAME: 'StellarEarn',
  APP_URL: 'http://localhost:3000',
  STELLAR_MOCK_CURRENT_LEDGER: '60000000',
};

for (const [key, value] of Object.entries(CI_ENV_DEFAULTS)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

// ---------------------------------------------------------------------------
// Dynamic import of NestJS + Swagger after env stubs are applied
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  // Parse --output CLI flag
  const outputFlagIndex = process.argv.indexOf('--output');
  const outputPath =
    outputFlagIndex !== -1 && process.argv[outputFlagIndex + 1]
      ? process.argv[outputFlagIndex + 1]
      : process.env['OPENAPI_OUTPUT_PATH'] ??
        path.resolve(__dirname, '..', 'dist', 'openapi', 'openapi.json');

  console.log(`[openapi-gen] Generating OpenAPI spec → ${outputPath}`);

  // Lazy imports keep compile-time deps minimal when the script is excluded
  // from the main build.
  const { NestFactory } = await import('@nestjs/core');
  const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
  const { VersioningType, BadRequestException, ValidationPipe } =
    await import('@nestjs/common');
  const { AppModule } = await import('../src/app.module');
  const {
    API_VERSION_CONFIG,
    extractApiVersion,
  } = await import('../src/config/versioning.config');
  const { ConfigService } = await import('@nestjs/config');

  // Bootstrap without listening on a port
  const app = await NestFactory.create(AppModule, {
    logger: false,      // suppress noisy startup logs in CI
    abortOnError: false,
  });

  // Replicate the same global configuration used in main.ts so that the
  // generated spec accurately reflects the real application.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
      exceptionFactory: (errors) =>
        new BadRequestException({
          message: 'Validation failed',
          errors: errors.map((e) => ({
            property: e.property,
            constraints: e.constraints,
          })),
        }),
    }),
  );

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.CUSTOM,
    defaultVersion: API_VERSION_CONFIG.defaultVersion,
    extractor: (request) =>
      extractApiVersion(request as any) || API_VERSION_CONFIG.defaultVersion,
  });

  const configService = app.get(ConfigService);
  const title = configService.get<string>('APP_NAME') ?? 'StellarEarn API';
  const version = configService.get<string>('API_VERSION') ?? '1.0';
  const description =
    configService.get<string>('API_DESCRIPTION') ??
    'Quest-based earning platform on Stellar blockchain';

  const builder = new DocumentBuilder()
    .setTitle(title)
    .setDescription(
      `${description}\n\nSupported API versions: v1, v2. Use path versioning (/api/v1/*, /api/v2/*) and/or header versioning (X-API-Version: 1).`,
    )
    .setVersion(version)
    .addServer('/api/v1', 'API v1')
    .addServer('/api/v2', 'API v2')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth',
    )
    .addTag('Authentication')
    .addTag('Health', 'System health and readiness probes');

  const document = SwaggerModule.createDocument(app, builder.build(), {
    deepScanRoutes: true,
  });

  // Validate the generated document has the expected structure
  if (!document.openapi) {
    throw new Error('[openapi-gen] Generated document is missing "openapi" field');
  }
  if (!document.info) {
    throw new Error('[openapi-gen] Generated document is missing "info" field');
  }
  if (!document.paths || Object.keys(document.paths).length === 0) {
    console.warn(
      '[openapi-gen] WARNING: Generated document contains no paths. ' +
      'This may indicate that no controllers were discovered.',
    );
  }

  const pathCount = Object.keys(document.paths ?? {}).length;
  console.log(
    `[openapi-gen] Spec generated successfully – ` +
    `openapi: ${document.openapi}, paths: ${pathCount}`,
  );

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf8');
  console.log(`[openapi-gen] Written to ${outputPath}`);

  // Close the app without starting the HTTP server
  await app.close();
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error('[openapi-gen] Fatal error:', error);
  process.exit(1);
});
