import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import {
  API_SEMVER,
  API_VERSION_CONFIG,
  API_VERSION_POLICY_PATH,
} from './versioning.config';

export function setupSwagger(
  app: INestApplication,
  configService?: ConfigService,
) {
  const title = configService?.get('APP_NAME') || 'StellarEarn API';
  const version = configService?.get('API_VERSION') || API_SEMVER;
  const description =
    configService?.get('API_DESCRIPTION') ||
    'Quest-based earning platform on Stellar blockchain';

  const supportedVersions = API_VERSION_CONFIG.supportedVersions
    .map((v) => `v${v}`)
    .join(', ');

  const builder = new DocumentBuilder()
    .setTitle(title)
    .setDescription(
      `${description}\n\nSupported API versions: ${supportedVersions}. Use path versioning (/api/v1/*) and/or header versioning (X-API-Version: 1). See ${API_VERSION_POLICY_PATH} for the semantic versioning policy.`,
    )
    .setVersion(version)
    .addServer('/api/v1', 'API v1')
    .addApiKey(
      { type: 'apiKey', name: 'X-API-Version', in: 'header' },
      'X-API-Version',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth',
    )
    .addTag('Authentication')
    .addTag('Health', 'System health and readiness probes');

  const document = SwaggerModule.createDocument(app, builder.build(), {
    deepScanRoutes: true,
  });

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
