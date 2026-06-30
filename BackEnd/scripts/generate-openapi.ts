/**
 * Standalone script to generate the OpenAPI spec JSON file.
 * Used by CI to produce a spec artifact for breaking-change diffing.
 *
 * Usage: ts-node scripts/generate-openapi.ts [output-path]
 * Default output: openapi.json (repo root of BackEnd)
 */
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

// Minimal env defaults so the app can bootstrap without a full .env
process.env.NODE_ENV = process.env.NODE_ENV ?? 'production';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'ci-placeholder-secret-32-chars-ok';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'ci-placeholder-refresh-secret-ok';
process.env.JWT_ACCESS_TOKEN_EXPIRATION =
  process.env.JWT_ACCESS_TOKEN_EXPIRATION ?? '15m';
process.env.JWT_REFRESH_TOKEN_EXPIRATION =
  process.env.JWT_REFRESH_TOKEN_EXPIRATION ?? '7d';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://ci:ci@localhost:5432/ci';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.STELLAR_NETWORK = process.env.STELLAR_NETWORK ?? 'testnet';

async function generate() {
  // Lazy import so env defaults are set first
  const { AppModule } = await import('../src/app.module');

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');

  const builder = new DocumentBuilder()
    .setTitle('StellarEarn API')
    .setDescription('Quest-based earning platform on Stellar blockchain')
    .setVersion('1.0')
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

  const outputPath = resolve(
    process.argv[2] ?? `${__dirname}/../openapi.json`,
  );
  writeFileSync(outputPath, JSON.stringify(document, null, 2));
  console.log(`OpenAPI spec written to ${outputPath}`);

  await app.close();
}

generate().catch((err) => {
  console.error('Failed to generate OpenAPI spec:', err);
  process.exit(1);
});
