import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

export function setupSwagger(app: INestApplication, configService?: ConfigService) {
  const title = configService?.get('APP_NAME') || 'StellarEarn API';
  const version = configService?.get('API_VERSION') || '1.0';
  const description =
    configService?.get('API_DESCRIPTION') ||
    'Quest-based earning platform on Stellar blockchain';

  const builder = new DocumentBuilder()
    .setTitle(title)
    .setDescription(`${description}\n\nSupported API versions: v1, v2. Use path versioning (/api/v1/*, /api/v2/*) and/or header versioning (X-API-Version: 1).`)
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

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
