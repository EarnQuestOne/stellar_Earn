import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as fs from 'fs';
import * as path from 'path';
import {
  API_VERSION_CONFIG,
  extractApiVersion,
} from './config/versioning.config';
import { setupSwagger } from './config/swagger.config';

async function generateOpenApiSpec(): Promise<void> {
  process.env.GENERATE_OPENAPI = 'true';

  const { AppModule } = await import('./app.module');

  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.CUSTOM,
    defaultVersion: API_VERSION_CONFIG.defaultVersion,
    extractor: (request) => {
      return (
        extractApiVersion(request as any) || API_VERSION_CONFIG.defaultVersion
      );
    },
  });

  const document = setupSwagger(app, configService);

  const outputPath = path.resolve(process.cwd(), 'docs/openapi.json');
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`);

  console.log(`OpenAPI spec written to ${outputPath}`);

  await app.close();
}

generateOpenApiSpec().catch((error) => {
  console.error('Failed to generate OpenAPI spec', error);
  process.exit(1);
});
